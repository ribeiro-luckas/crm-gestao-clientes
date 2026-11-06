import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { createIsolatedConnectionPair, type IsolatedConnectionPair } from "../helpers/test-db";

const enabled = process.env.RUN_TASK_DEAL_CLIENT_INTEGRITY_TESTS === "1";
const consistencyFk = "tasks_deal_client_consistency_fk";
const m01TaskFk = "tasks_assignee_member_assignment_fk";

type Fixture = {
  orgA: string; orgB: string; ownerA: string; ownerB: string; outsider: string;
  clientA1: string; clientA2: string; clientB: string; dealA1: string; dealA2: string; dealB: string;
};

let connection: IsolatedConnectionPair | undefined;
let db: PoolClient;
let fixture: Fixture | undefined;
let transactionOpen = false;

describe.skipIf(!enabled)("integridade I-01 entre tarefa, oportunidade e cliente", () => {

  beforeAll(async () => {

    if (process.env.DATABASE_URL) throw new Error("DATABASE_URL proibida nesta suíte; use TEST_DATABASE_URL.");

    connection = await createIsolatedConnectionPair();
    db = connection.clientA;

    const names = [consistencyFk, m01TaskFk];
    const constraints = await db.query<{ conname: string; convalidated: boolean }>(
      "select conname, convalidated from pg_catalog.pg_constraint where conname = any($1::text[])", [names],
    );

    if (constraints.rows.length !== names.length || constraints.rows.some((row) => !row.convalidated)) {

      throw new Error("Suíte I-01 não executada: exige migrações I-01 e M-01 instaladas e validadas no banco isolado.");

    }

  });

  beforeEach(async () => {

    await db.query("begin");

    transactionOpen = true;
    fixture = await seed(db);

  });

  afterEach(async () => {

    const current = fixture;

    fixture = undefined;

    if (transactionOpen) {

      await db.query("rollback");

      transactionOpen = false;

    }

    if (current) {

      await cleanup(current);

      const remaining = await db.query<{ total: number }>(
        "select count(*)::int as total from public.organization where id = any($1::text[])", [[current.orgA, current.orgB]],
      );

      expect(remaining.rows[0]?.total).toBe(0);

    }

  });

  afterAll(async () => {
    
    if (connection) await connection.cleanup();
  
  });

  it("aceita tarefa vinculada à oportunidade e ao mesmo cliente", async () => {

    const f = need();
    const taskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1);
    const row = await db.query("select client_id, deal_id from public.tasks where id=$1", [taskId]);

    expect(row.rows).toEqual([{ client_id: f.clientA1, deal_id: f.dealA1 }]);

  });

  it("rejeita INSERT de tarefa quando cliente e oportunidade divergem", async () => {

    const f = need();

    await fails(
      db,
      "insert into public.tasks (organization_id,title,due_at,client_id,deal_id) values ($1,'mismatch',now(),$2,$3)",
      [f.orgA, f.clientA1, f.dealA2], "23503", consistencyFk,
    );

    const rows = await db.query("select id from public.tasks where organization_id=$1", [f.orgA]);

    expect(rows.rows).toHaveLength(0);

  });

  it("mantém as duas FKs de tenant quando a tarefa informa só cliente ou só oportunidade", async () => {

    const f = need();

    await fails(db,
      "insert into public.tasks (organization_id,title,due_at,client_id) values ($1,'foreign client',now(),$2)",
      [f.orgA, f.clientB], "23503", "tasks_client_same_org_fk");

    await fails(db,
      "insert into public.tasks (organization_id,title,due_at,deal_id) values ($1,'foreign deal',now(),$2)",
      [f.orgA, f.dealB], "23503", "tasks_deal_same_org_fk");

    await failsWithAnyConstraint(db,
      "insert into public.tasks (organization_id,title,due_at,client_id,deal_id) values ($1,'client and deal from different tenants',now(),$2,$3)",
      [f.orgB, f.clientB, f.dealA1], "23503", ["tasks_deal_same_org_fk", consistencyFk]);

    await fails(db,
      "update public.deals set client_id=$1 where id=$2",
      [f.clientB, f.dealA1], "23503", "deals_client_same_org_fk");
      
    expect((await db.query("select id from public.tasks where organization_id=$1", [f.orgA])).rows).toHaveLength(0);
    expect((await db.query("select client_id from public.deals where id=$1", [f.dealA1])).rows).toEqual([{ client_id: f.clientA1 }]);

  });

  it("preserva os estados opcionais confirmados: nenhum vínculo, cliente apenas e oportunidade apenas", async () => {

    const f = need();
    const noLinks = await insertTask(db, f.orgA, null, null);
    const clientOnly = await insertTask(db, f.orgA, f.clientA1, null);
    const dealOnly = await insertTask(db, f.orgA, null, f.dealA1);
    const rows = await db.query(
      "select id, client_id, deal_id from public.tasks where id = any($1::uuid[])",
      [[noLinks, clientOnly, dealOnly]]);

    expect(rows.rows).toHaveLength(3);
    expect(rows.rows.find((row) => row.id === noLinks)).toMatchObject({ client_id: null, deal_id: null });
    expect(rows.rows.find((row) => row.id === clientOnly)).toMatchObject({ client_id: f.clientA1, deal_id: null });
    expect(rows.rows.find((row) => row.id === dealOnly)).toMatchObject({ client_id: null, deal_id: f.dealA1 });

    await fails(db,
      "insert into public.deals (organization_id,client_id,title) values ($1,null,'missing client')",
      [f.orgA], "23502", undefined);

  });

  it("rejeita UPDATE de tarefa para combinação divergente sem alterar a linha", async () => {

    const f = need();
    const taskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1);

    await fails(db, "update public.tasks set client_id=$1 where id=$2", [f.clientA2, taskId], "23503", consistencyFk);

    const row = await db.query("select client_id, deal_id from public.tasks where id=$1", [taskId]);

    expect(row.rows).toEqual([{ client_id: f.clientA1, deal_id: f.dealA1 }]);

  });

  it("bloqueia trocar o cliente da oportunidade enquanto tarefa ativa o referencia explicitamente", async () => {

    const f = need();
    const activeTaskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1);

    await fails(db, "update public.deals set client_id=$1 where id=$2", [f.clientA2, f.dealA1], "23001", consistencyFk);

    expect((await db.query("select client_id from public.deals where id=$1", [f.dealA1])).rows).toEqual([{ client_id: f.clientA1 }]);
    expect((await db.query("select client_id from public.tasks where id=$1", [activeTaskId])).rows).toEqual([{ client_id: f.clientA1 }]);

  });

  it("bloqueia troca do cliente da oportunidade por tarefa arquivada, sem mutação parcial", async () => {

    const f = need();
    const archivedTaskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1, true);

    await fails(db, "update public.deals set client_id=$1 where id=$2", [f.clientA2, f.dealA1], "23001", consistencyFk);

    expect((await db.query("select client_id from public.deals where id=$1", [f.dealA1])).rows).toEqual([{ client_id: f.clientA1 }]);
    expect((await db.query("select client_id, deleted_at from public.tasks where id=$1", [archivedTaskId])).rows)
      .toEqual([{ client_id: f.clientA1, deleted_at: expect.any(Date) }]);

  });

  it("permite reconciliação explícita de tarefas antes e depois da troca da oportunidade", async () => {

    const f = need();
    const activeTaskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1);
    const archivedTaskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1, true);

    // RESTRICT é imediato: desatrelar o cliente satisfaz MATCH SIMPLE antes de alterar o deal.
    await db.query("update public.tasks set client_id=null where id = any($1::uuid[])", [[activeTaskId, archivedTaskId]]);
    await db.query("update public.deals set client_id=$1 where id=$2", [f.clientA2, f.dealA1]);
    await db.query("update public.tasks set client_id=$1 where id = any($2::uuid[])", [f.clientA2, [activeTaskId, archivedTaskId]]);

    expect((await db.query("select client_id from public.deals where id=$1", [f.dealA1])).rows).toEqual([{ client_id: f.clientA2 }]);
    expect((await db.query("select id, client_id from public.tasks where id = any($1::uuid[]) order by id", [[activeTaskId, archivedTaskId]])).rows)
      .toEqual(expect.arrayContaining([{ id: activeTaskId, client_id: f.clientA2 }, { id: archivedTaskId, client_id: f.clientA2 }]));
    expect((await db.query("select client_id from public.deals where id=$1", [f.dealB])).rows).toEqual([{ client_id: f.clientB }]);

  });

  it("mantém tarefa com cliente NULL opcional ao trocar cliente da oportunidade", async () => {

    const f = need();
    const dealOnlyTaskId = await insertTask(db, f.orgA, null, f.dealA1);

    await db.query("update public.deals set client_id=$1 where id=$2", [f.clientA2, f.dealA1]);

    expect((await db.query("select client_id, deal_id from public.tasks where id=$1", [dealOnlyTaskId])).rows)
      .toEqual([{ client_id: null, deal_id: f.dealA1 }]);
    expect((await db.query("select client_id from public.deals where id=$1", [f.dealA1])).rows).toEqual([{ client_id: f.clientA2 }]);

  });

  it("permite transferir os dois vínculos juntos para um par válido", async () => {

    const f = need();
    const taskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1);

    await db.query("update public.tasks set client_id=$1, deal_id=$2 where id=$3", [f.clientA2, f.dealA2, taskId]);

    const row = await db.query("select client_id, deal_id from public.tasks where id=$1", [taskId]);

    expect(row.rows).toEqual([{ client_id: f.clientA2, deal_id: f.dealA2 }]);

  });

  it("aplica a consistência a registros arquivados e bloqueia exclusão física ainda referenciada", async () => {

    const f = need();
    const archivedTaskId = await insertTask(db, f.orgA, f.clientA1, f.dealA1, true);
    const archivedDealOnlyTaskId = await insertTask(db, f.orgA, null, f.dealA1, true);

    await db.query("update public.deals set deleted_at=now() where id=$1", [f.dealA2]);
    await fails(db,
      "insert into public.tasks (organization_id,title,due_at,client_id,deal_id,deleted_at) values ($1,'archived mismatch',now(),$2,$3,now())",
      [f.orgA, f.clientA1, f.dealA2], "23503", consistencyFk);

    const archivedDealTaskId = await insertTask(db, f.orgA, f.clientA2, f.dealA2, true);

    await fails(db, "update public.tasks set client_id=$1 where id=$2", [f.clientA2, archivedTaskId], "23503", consistencyFk);
    await failsWithAnyConstraint(db,
      "delete from public.deals where id=$1",
      [f.dealA1], "23001", ["tasks_deal_same_org_fk", consistencyFk]);

    expect((await db.query("select deleted_at from public.tasks where id=$1", [archivedTaskId])).rows[0]?.deleted_at).not.toBeNull();
    expect((await db.query("select deleted_at from public.tasks where id=$1", [archivedDealOnlyTaskId])).rows[0]?.deleted_at).not.toBeNull();
    expect((await db.query("select deleted_at from public.tasks where id=$1", [archivedDealTaskId])).rows[0]?.deleted_at).not.toBeNull();

  });

  it("mantém obrigatória a associação de oportunidade com cliente", async () => {

    const f = need();

    await fails(db, "update public.deals set client_id=null where id=$1", [f.dealA1], "23502", undefined);

    const row = await db.query("select client_id from public.deals where id=$1", [f.dealA1]);

    expect(row.rows).toEqual([{ client_id: f.clientA1 }]);

  });

  it("restringe exclusão de cliente fisicamente referenciado, sem remover a tarefa", async () => {

    const f = need();
    const clientId = randomUUID();

    await db.query("insert into public.clients (id,organization_id,kind,name) values ($1,$2,'company','task-only client')", [clientId, f.orgA]);

    const taskId = await insertTask(db, f.orgA, clientId, null);

    await fails(db, "delete from public.clients where id=$1", [clientId], "23001", "tasks_client_same_org_fk");

    expect((await db.query("select client_id from public.tasks where id=$1", [taskId])).rows).toEqual([{ client_id: clientId }]);

  });

  it("preserva a FK M-01 de atribuição e não muda outro tenant", async () => {

    const f = need();
    
    await fails(db,
      "insert into public.tasks (organization_id,title,due_at,assignee_user_id) values ($1,'invalid assignee',now(),$2)",
      [f.orgA, f.outsider], "23503", m01TaskFk);

    const otherTenant = await db.query("select id, client_id from public.deals where id=$1", [f.dealB]);

    expect(otherTenant.rows).toEqual([{ id: f.dealB, client_id: f.clientB }]);

  });

  it("preserva a invariante PostgreSQL do último OWNER", async () => {

    const f = need();

    await db.query("savepoint owner_invariant");

    let error: unknown;

    try {

      await db.query("delete from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.ownerA]);
      await db.query("set constraints all immediate");

    } catch (caught) {
      
      error = caught;
    
    }

    expect(error).toMatchObject({ code: "23514", constraint: "organization_requires_owner" });

    await db.query("rollback to savepoint owner_invariant");
    await db.query("release savepoint owner_invariant");
    await db.query("set constraints all deferred");

    expect((await db.query("select id from public.member where organization_id=$1 and user_id=$2", [f.orgA, f.ownerA])).rows).toHaveLength(1);

  });

  it("faz cleanup transacional escopado de fixture já confirmada", async () => {

    const f = need();

    await insertTask(db, f.orgA, f.clientA1, f.dealA1);
    await db.query("commit");
    transactionOpen = false;
    await cleanup(f);

    const remaining = await db.query("select id from public.organization where id = any($1::text[])", [[f.orgA, f.orgB]]);

    expect(remaining.rows).toHaveLength(0);

  });

  it("serializa INSERT concorrente com troca do cliente sem confirmar associação órfã", async () => {

    const f = need();

    await db.query("commit");

    transactionOpen = false;

    const updater = db;
    const inserter = await connection!.poolB.connect();

    let updateOpen = false;
    let insertOpen = false;
    let pendingInsert: Promise<{ kind: "inserted" } | { kind: "error"; error: unknown }> | undefined;

    try {
      await updater.query("begin");

      updateOpen = true;

      await updater.query("set local lock_timeout='8s'");
      await updater.query("set local statement_timeout='12s'");

      const updaterPid = (await updater.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;

      await updater.query("update public.deals set client_id=$1 where id=$2", [f.clientA2, f.dealA1]);

      await inserter.query("begin");

      insertOpen = true;

      await inserter.query("set local lock_timeout='8s'");

      await inserter.query("set local statement_timeout='12s'");
      const inserterPid = (await inserter.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;

      pendingInsert = inserter.query(
        "insert into public.tasks (organization_id,title,due_at,client_id,deal_id) values ($1,'racing task',now(),$2,$3)",
        [f.orgA, f.clientA1, f.dealA1],
      ).then(
        () => ({ kind: "inserted" as const }),
        (error: unknown) => ({ kind: "error" as const, error }),
      );

      await waitForBlocker(connection!.poolA, inserterPid, updaterPid);
      await updater.query("commit");

      updateOpen = false;

      expect(await pendingInsert).toMatchObject({ kind: "error", error: { code: "23503", constraint: consistencyFk } });

      await inserter.query("rollback");

      insertOpen = false;

      expect((await db.query("select client_id from public.deals where id=$1", [f.dealA1])).rows).toEqual([{ client_id: f.clientA2 }]);
      expect((await db.query("select id from public.tasks where organization_id=$1", [f.orgA])).rows).toHaveLength(0);
      expect((await db.query("select client_id from public.deals where id=$1", [f.dealB])).rows).toEqual([{ client_id: f.clientB }]);

    } finally {

      if (updateOpen) await updater.query("rollback").catch(() => undefined);
      if (pendingInsert) await pendingInsert;
      if (insertOpen) await inserter.query("rollback").catch(() => undefined);

      inserter.release();
    }

  }, 15_000);

});

async function seed(client: PoolClient): Promise<Fixture> {

  const key = randomUUID();
  const f: Fixture = {
    orgA: `i01-a-${key}`, orgB: `i01-b-${key}`,
    ownerA: `i01-owner-a-${key}`, ownerB: `i01-owner-b-${key}`, outsider: `i01-outsider-${key}`,
    clientA1: randomUUID(), clientA2: randomUUID(), clientB: randomUUID(),
    dealA1: randomUUID(), dealA2: randomUUID(), dealB: randomUUID(),
  };

  await client.query(
    "insert into public.organization (id,name,slug) values ($1,'I01 A',$2),($3,'I01 B',$4)",
    [f.orgA, `i01-a-${key}`, f.orgB, `i01-b-${key}`]);

  await client.query(
    'insert into public."user" (id,name,email,email_verified) values ($1,$2,$3,true),($4,$5,$6,true),($7,$8,$9,true)',
    [f.ownerA, "I01 Owner A", `${key}-a@example.invalid`, f.ownerB, "I01 Owner B", `${key}-b@example.invalid`, f.outsider, "I01 outsider", `${key}-x@example.invalid`],
  );

  await client.query(
    "insert into public.member (id,organization_id,user_id,role) values ($1,$2,$3,'owner'),($4,$5,$6,'owner')",
    [`i01-member-a-${key}`, f.orgA, f.ownerA, `i01-member-b-${key}`, f.orgB, f.ownerB],
  );

  await client.query(
    "insert into public.clients (id,organization_id,kind,name) values ($1,$2,'company','A1'),($3,$2,'company','A2'),($4,$5,'company','B')",
    [f.clientA1, f.orgA, f.clientA2, f.clientB, f.orgB],
  );

  await client.query(
    "insert into public.deals (id,organization_id,client_id,title) values ($1,$2,$3,'D A1'),($4,$2,$5,'D A2'),($6,$7,$8,'D B')",
    [f.dealA1, f.orgA, f.clientA1, f.dealA2, f.clientA2, f.dealB, f.orgB, f.clientB],
  );

  await client.query("set constraints all immediate");
  await client.query("set constraints all deferred");

  return f;

}

async function insertTask(client: PoolClient, organizationId: string, clientId: string | null, dealId: string | null, archived = false) {

  const id = randomUUID();

  await client.query(
    "insert into public.tasks (id,organization_id,title,due_at,client_id,deal_id,deleted_at) values ($1,$2,$3,now(),$4,$5,$6)",
    [id, organizationId, `task-${id}`, clientId, dealId, archived ? new Date() : null],
  );

  return id;

}

async function fails(client: PoolClient, statement: string, values: unknown[], code: string, constraint: string | undefined) {

  await client.query("savepoint expected_failure");

  let error: unknown;

  try {
    
    await client.query(statement, values);
  
  } catch (caught) {
    
    error = caught;
  
  }

  expect(error).toMatchObject({ code, ...(constraint ? { constraint } : {}) });

  await client.query("rollback to savepoint expected_failure");
  await client.query("release savepoint expected_failure");

}

async function failsWithAnyConstraint(client: PoolClient, statement: string, values: unknown[], code: string, constraints: string[]) {

  await client.query("savepoint expected_failure");

  let error: unknown;

  try {
    
    await client.query(statement, values);
  
  } catch (caught) {
    
    error = caught;
  
  }

  expect(error).toMatchObject({ code });
  expect(constraints).toContain((error as { constraint?: unknown } | undefined)?.constraint);

  await client.query("rollback to savepoint expected_failure");
  await client.query("release savepoint expected_failure");

}

async function waitForBlocker(pool: IsolatedConnectionPair["poolA"], waitingPid: number, blockerPid: number, timeoutMs = 5_000) {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    const result = await pool.query<{ blockers: number[] }>("select pg_blocking_pids($1::int) as blockers", [waitingPid]);

    if (result.rows[0]?.blockers.includes(blockerPid)) return;

    await new Promise((resolve) => setTimeout(resolve, 20));

  }

  throw new Error(`PostgreSQL não observou a operação ${waitingPid} bloqueada pela transação ${blockerPid}.`);

}

async function cleanup(f: Fixture) {

  await db.query("begin");

  let open = true;

  try {

    await db.query("delete from public.tasks where organization_id=any($1::text[])", [[f.orgA, f.orgB]]);
    await db.query("delete from public.deals where organization_id=any($1::text[])", [[f.orgA, f.orgB]]);
    await db.query("delete from public.clients where organization_id=any($1::text[])", [[f.orgA, f.orgB]]);
    await db.query("delete from public.member where organization_id=any($1::text[])", [[f.orgA, f.orgB]]);
    await db.query("delete from public.organization where id=any($1::text[])", [[f.orgA, f.orgB]]);
    await db.query('delete from public."user" where id=any($1::text[])', [[f.ownerA, f.ownerB, f.outsider]]);
    await db.query("commit");

    open = false;

  } finally {

    if (open) await db.query("rollback").catch(() => undefined);

  }

}

function need() {
  
  if (!fixture) throw new Error("Fixture I-01 ausente.");
  
  return fixture;

}
