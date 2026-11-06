import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";

const enabled = process.env.RUN_MEMBER_ASSIGNMENT_INTEGRITY_TESTS === "1";
const fk = {
  client: "clients_owner_member_assignment_fk",
  deal: "deals_owner_member_assignment_fk",
  task: "tasks_assignee_member_assignment_fk",
};

type Fixture = { orgA: string; orgB: string; ownerA: string; ownerB: string; memberA: string; memberB: string; outsider: string };

let connection: IsolatedConnectionPair | undefined;
let db: PoolClient;
let fixture: Fixture | undefined;
let transactionOpen = false;

describe.skipIf(!enabled)("integridade de atribuições M-01", () => {

  beforeAll(async () => {

    if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte.");

    connection = await createIsolatedConnectionPair();
    db = connection.clientA;

    const installed = await db.query("select conname, convalidated from pg_catalog.pg_constraint where conname = any($1::text[])", [Object.values(fk)]);

    if (installed.rows.length !== 3 || installed.rows.some((row) => !row.convalidated)) {

      throw new Error("M-01 não executado: esta suíte exige 0003/0004 instaladas e validadas no PostgreSQL isolado.");

    }
  });

  beforeEach(async () => {

    await db.query("BEGIN");

    transactionOpen = true;
    fixture = await seed(db);

  });

  afterEach(async () => {

    const current = fixture;

    fixture = undefined;

    if (transactionOpen) {

      await db.query("ROLLBACK");

      transactionOpen = false;

    }

    if (current) {

      const result = await db.query("select count(*)::int as n from public.organization where id=any($1::text[])", [[current.orgA, current.orgB]]);

      expect(result.rows[0].n).toBe(0);
    }

  });

  afterAll(async () => { if (connection) await connection.cleanup(); });

  it("rejeita cliente atribuído a membro de outro tenant", async () => {

    const f = need();

    await fails("insert into public.clients (organization_id,kind,name,owner_user_id) values ($1,'person','x',$2)", [f.orgA, f.memberB], "23503", fk.client);

    expect(await count("clients", f.orgA)).toBe(0);
    expect(await count("clients", f.orgB)).toBe(0);

  });

  it("rejeita oportunidade atribuída a membro de outro tenant", async () => {

    const f = need(); const clientId = await addClient(f.orgA, f.ownerA);

    await fails("insert into public.deals (organization_id,client_id,title,owner_user_id) values ($1,$2,'x',$3)", [f.orgA, clientId, f.memberB], "23503", fk.deal);

    expect(await count("deals", f.orgA)).toBe(0);

  });

  it("rejeita tarefa atribuída a membro de outro tenant", async () => {

    const f = need();

    await fails("insert into public.tasks (organization_id,title,due_at,assignee_user_id) values ($1,'x',now(),$2)", [f.orgA, f.memberB], "23503", fk.task);

    expect(await count("tasks", f.orgA)).toBe(0);

  });

  it("rejeita usuário existente sem membership", async () => {

    const f = need();

    await fails("insert into public.clients (organization_id,kind,name,owner_user_id) values ($1,'person','x',$2)", [f.orgA, f.outsider], "23503", fk.client);

  });

  it("aceita NULL como responsabilidade opcional nas três entidades", async () => {

    const f = need(); const clientId = await addClient(f.orgA, null);

    await db.query("insert into public.deals (organization_id,client_id,title,owner_user_id) values ($1,$2,'x',null)", [f.orgA, clientId]);
    await db.query("insert into public.tasks (organization_id,title,due_at,assignee_user_id) values ($1,'x',now(),null)", [f.orgA]);

    expect(await count("clients", f.orgA)).toBe(1); expect(await count("deals", f.orgA)).toBe(1); expect(await count("tasks", f.orgA)).toBe(1);

  });

  it("bloqueia remoção da membership com cliente atribuído", async () => {

    const f = need(); await addClient(f.orgA, f.memberA);

    await fails("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA], "23001", fk.client);

    expect(await hasMember(f.orgA, f.memberA)).toBe(true);

  });

  it("bloqueia remoção da membership com oportunidade atribuída", async () => {

    const f = need(); const id = await addClient(f.orgA, f.ownerA);

    await db.query("insert into public.deals (organization_id,client_id,title,owner_user_id) values ($1,$2,'x',$3)", [f.orgA, id, f.memberA]);
    await fails("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA], "23001", fk.deal);

  });

  it("bloqueia remoção da membership com tarefa atribuída", async () => {

    const f = need();

    await db.query("insert into public.tasks (organization_id,title,due_at,assignee_user_id) values ($1,'x',now(),$2)", [f.orgA, f.memberA]);
    await fails("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA], "23001", fk.task);

  });

  it.each([
    ["cliente arquivado", "clients", fk.client],
    ["oportunidade arquivada", "deals", fk.deal],
    ["tarefa arquivada", "tasks", fk.task],
  ] as const)("inclui %s ao bloquear saída", async (_label, entity, constraint) => {

    const f = need();

    if (entity === "clients") await db.query("insert into public.clients (organization_id,kind,name,owner_user_id,deleted_at) values ($1,'person','x',$2,now())", [f.orgA, f.memberA]);

    if (entity === "deals") {

      const id = await addClient(f.orgA, f.ownerA);

      await db.query("insert into public.deals (organization_id,client_id,title,owner_user_id,deleted_at) values ($1,$2,'x',$3,now())", [f.orgA, id, f.memberA]);

    }

    if (entity === "tasks") await db.query("insert into public.tasks (organization_id,title,due_at,assignee_user_id,deleted_at) values ($1,'x',now(),$2,now())", [f.orgA, f.memberA]);

    await fails("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA], "23001", constraint);

    expect(await hasMember(f.orgA, f.memberA)).toBe(true);

  });

  it("transfere validamente todas as responsabilidades antes da remoção", async () => {

    const f = need(); const id = await addClient(f.orgA, f.memberA);

    await db.query("insert into public.deals (organization_id,client_id,title,owner_user_id) values ($1,$2,'x',$3)", [f.orgA, id, f.memberA]);
    await db.query("insert into public.tasks (organization_id,title,due_at,assignee_user_id) values ($1,'x',now(),$2)", [f.orgA, f.memberA]);
    await db.query("update public.clients set owner_user_id=$1 where owner_user_id=$2 and organization_id=$3", [f.ownerA, f.memberA, f.orgA]);
    await db.query("update public.deals set owner_user_id=$1 where owner_user_id=$2 and organization_id=$3", [f.ownerA, f.memberA, f.orgA]);
    await db.query("update public.tasks set assignee_user_id=$1 where assignee_user_id=$2 and organization_id=$3", [f.ownerA, f.memberA, f.orgA]);
    await db.query("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA]);

    expect(await hasMember(f.orgA, f.memberA)).toBe(false);
    expect((await db.query("select owner_user_id from public.clients where id=$1", [id])).rows[0].owner_user_id).toBe(f.ownerA);
    expect((await db.query("select owner_user_id from public.deals where organization_id=$1", [f.orgA])).rows[0].owner_user_id).toBe(f.ownerA);
    expect((await db.query("select assignee_user_id from public.tasks where organization_id=$1", [f.orgA])).rows[0].assignee_user_id).toBe(f.ownerA);

  });

  it("permite desatribuir antes de remover e preserva o outro tenant", async () => {

    const f = need(); const id = await addClient(f.orgA, f.memberA); const other = await addClient(f.orgB, f.memberB);

    await db.query("update public.clients set owner_user_id=null where id=$1", [id]);
    await db.query("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA]);

    expect((await db.query("select owner_user_id from public.clients where id=$1", [id])).rows[0].owner_user_id).toBeNull();
    expect((await db.query("select owner_user_id from public.clients where id=$1", [other])).rows[0].owner_user_id).toBe(f.memberB);
    expect(await hasMember(f.orgB, f.memberB)).toBe(true);
    
  });

  it("impede movimentar membership enquanto há referências", async () => {

    const f = need(); await addClient(f.orgA, f.memberA);

    await fails("update public.member set organization_id=$1 where organization_id=$2 and user_id=$3", [f.orgB, f.orgA, f.memberA], "23001", fk.client);

    expect(await hasMember(f.orgA, f.memberA)).toBe(true);
    expect(await hasMember(f.orgB, f.memberA)).toBe(false);
  });

  it("resolve a corrida entre atribuição e remoção sem referência órfã", async () => {

    const f = need(); const concurrent = await connection!.poolB.connect();

    let deleteTransactionOpen = false;
    let insertTransactionOpen = false;
    let pendingInsert: Promise<{ kind: "inserted" } | { kind: "error"; error: unknown }> | undefined;

    try {

      // Publish the complete fixture so the independent connection can see its FK targets.
      await db.query("COMMIT");

      transactionOpen = false;

      await db.query("BEGIN");

      deleteTransactionOpen = true;

      await db.query("SET LOCAL lock_timeout = '8s'");
      await db.query("SET LOCAL statement_timeout = '12s'");

      const deletePid = (await db.query("select pg_backend_pid() as pid")).rows[0].pid as number;

      await db.query("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA]);
      await concurrent.query("BEGIN");

      insertTransactionOpen = true;

      await concurrent.query("SET LOCAL lock_timeout = '8s'");
      await concurrent.query("SET LOCAL statement_timeout = '12s'");

      const insertPid = (await concurrent.query("select pg_backend_pid() as pid")).rows[0].pid as number;
      
      // Attach both fulfillment and rejection handlers immediately, so a fast SQL error
      // can never become an unhandled rejection while lock observation is in progress.
      pendingInsert = concurrent.query("insert into public.clients (organization_id,kind,name,owner_user_id) values ($1,'person','race',$2)", [f.orgA, f.memberA])
        .then(() => ({ kind: "inserted" as const }), (error: unknown) => ({ kind: "error" as const, error }));

      let isBlockedByRemoval = false;

      const deadline = Date.now() + 5_000;

      while (!isBlockedByRemoval && Date.now() < deadline) {

        const observation = await connection!.poolA.query<{ blockers: number[] }>(
          "select pg_blocking_pids($1::int) as blockers", [insertPid],
        );

        isBlockedByRemoval = observation.rows[0]?.blockers.includes(deletePid) ?? false;

        if (!isBlockedByRemoval) await delay(20);

      }

      expect(isBlockedByRemoval).toBe(true);

      await db.query("COMMIT");

      deleteTransactionOpen = false;

      const insertResult = await pendingInsert;

      expect(insertResult).toMatchObject({ kind: "error", error: { code: "23503", constraint: fk.client } });

      await concurrent.query("ROLLBACK");

      insertTransactionOpen = false;

      expect(await count("clients", f.orgA)).toBe(0);
      expect(await hasMember(f.orgA, f.memberA)).toBe(false);
      expect(await hasMember(f.orgB, f.memberB)).toBe(true);
      
    } finally {

      if (transactionOpen) {

        await db.query("ROLLBACK").catch(() => undefined);

        transactionOpen = false;

      }

      if (deleteTransactionOpen) await db.query("ROLLBACK").catch(() => undefined);

      // The insert promise has a rejection handler from creation and is settled before
      // either connection is rolled back or fixture cleanup starts.
      if (pendingInsert) await pendingInsert;

      if (insertTransactionOpen) await concurrent.query("ROLLBACK").catch(() => undefined);

      concurrent.release();

      await cleanup(db, f);
      
    }
  });
  it("preserva auditoria e atividades após desatribuição e saída", async () => {

    const f = need(); const id = await addClient(f.orgA, f.memberA);
    const audit = await db.query("insert into public.audit_logs (organization_id,actor_user_id,action,entity_type,entity_id) values ($1,$2,'historic','client',$3) returning id", [f.orgA, f.memberA, id]);
    const activity = await db.query("insert into public.activities (organization_id,type,subject,actor_user_id,client_id) values ($1,'note','history',$2,$3) returning id", [f.orgA, f.memberA, id]);

    await db.query("update public.clients set owner_user_id=null where id=$1", [id]);
    await db.query("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.memberA]);

    expect((await db.query("select count(*)::int n from public.audit_logs where id=$1", [audit.rows[0].id])).rows[0].n).toBe(1);
    expect((await db.query("select count(*)::int n from public.activities where id=$1", [activity.rows[0].id])).rows[0].n).toBe(1);

  });

  it("faz cleanup transacional sem deixar a organização de teste persistida", async () => {

    const f = need(); await addClient(f.orgA, f.memberA);

    await db.query("delete from public.clients where organization_id=$1", [f.orgA]);
    await db.query("delete from public.member where organization_id=$1", [f.orgA]);
    await db.query("delete from public.organization where id=$1", [f.orgA]);

    expect((await db.query("select count(*)::int n from public.organization where id=$1", [f.orgA])).rows[0].n).toBe(0);

  });

  it("mantém a invariante do último OWNER e seu SQLSTATE específico", async () => {

    const f = need();

    await db.query("savepoint owner_invariant");
    await db.query("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.ownerA]);

    let error: unknown;

    try { await db.query("set constraints all immediate"); } catch (caught) { error = caught; }

    expect(error).toMatchObject({ code: "23514", constraint: "organization_requires_owner" });

    await db.query("rollback to savepoint owner_invariant");
    await db.query("release savepoint owner_invariant");
    await db.query("set constraints all deferred");

    expect(await hasMember(f.orgA, f.ownerA)).toBe(true);

  });

});

async function seed(db: PoolClient): Promise<Fixture> {

  const s = randomUUID();
  const f = { orgA: "m01-a-" + s, orgB: "m01-b-" + s, ownerA: "m01-oa-" + s, ownerB: "m01-ob-" + s, memberA: "m01-ma-" + s, memberB: "m01-mb-" + s, outsider: "m01-x-" + s };

  await db.query("insert into public.organization (id,name,slug) values ($1,'A',$2),($3,'B',$4)", [f.orgA, "m01-a-" + s, f.orgB, "m01-b-" + s]);
  await db.query("insert into public.\"user\" (id,name,email,email_verified) values ($1,'A',$2,true),($3,'B',$4,true),($5,'C',$6,true),($7,'D',$8,true),($9,'X',$10,true)", [f.ownerA,s+"-a@test.invalid",f.ownerB,s+"-b@test.invalid",f.memberA,s+"-c@test.invalid",f.memberB,s+"-d@test.invalid",f.outsider,s+"-x@test.invalid"]);
  await db.query("insert into public.member (id,organization_id,user_id,role) values ($1,$2,$3,'owner'),($4,$5,$6,'owner'),($7,$2,$8,'member'),($9,$5,$10,'member')", ["m01-o-a-"+s,f.orgA,f.ownerA,"m01-o-b-"+s,f.orgB,f.ownerB,"m01-link-a-"+s,f.memberA,"m01-link-b-"+s,f.memberB]);
  await db.query("set constraints all immediate"); await db.query("set constraints all deferred");

  return f;

}

async function fails(statement: string, values: unknown[], code: string, constraint: string) {

  await db.query("savepoint expected_error");

  let error: unknown;

  try { await db.query(statement, values); } catch (caught) { error = caught; }

  expect(error).toMatchObject({ code, constraint });

  await db.query("rollback to savepoint expected_error"); await db.query("release savepoint expected_error");

}

async function addClient(org: string, owner: string | null) {

  const result = await db.query("insert into public.clients (organization_id,kind,name,owner_user_id) values ($1,'person',$2,$3) returning id", [org, "client-" + randomUUID(), owner]);

  return result.rows[0].id as string;

}

async function count(table: "clients" | "deals" | "tasks", org: string) {

  const result = await db.query("select count(*)::int n from public." + table + " where organization_id=$1", [org]);

  return result.rows[0].n as number;

}

async function hasMember(org: string, user: string) {

  const result = await db.query("select exists(select 1 from public.member where organization_id=$1 and user_id=$2) found", [org, user]);

  return result.rows[0].found as boolean;

}

async function cleanup(db: PoolClient, f: Fixture) {

  await db.query("begin");

  let open = true;

  try {

    for (const table of ["activities", "tasks", "deals", "contacts", "clients", "audit_logs", "member"]) {

      await db.query("delete from public." + table + " where organization_id=any($1::text[])", [[f.orgA, f.orgB]]);

    }

    await db.query("delete from public.organization where id=any($1::text[])", [[f.orgA, f.orgB]]);
    await db.query("delete from public.\"user\" where id=any($1::text[])", [[f.ownerA, f.ownerB, f.memberA, f.memberB, f.outsider]]);
    await db.query("commit");

    open = false;

  } finally {

    if (open) await db.query("rollback").catch(() => undefined);

  }
}

function need() {
  
  if (!fixture) throw new Error("Fixture M-01 ausente.");
  
  return fixture;

}

function delay(milliseconds: number) {
  
  return new Promise((resolve) => setTimeout(resolve, milliseconds));

}
