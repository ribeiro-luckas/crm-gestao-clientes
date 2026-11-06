import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";

describe("Content Security Policy", () => {

  it("usa nonce e mantém exceções de desenvolvimento limitadas ao script-src", () => {

    const policy = buildContentSecurityPolicy("synthetic-nonce", {
      development: true,
      websocketOrigin: "ws://127.0.0.1:3100",
    });

    expect(policy).toContain("script-src 'self' 'nonce-synthetic-nonce' 'strict-dynamic' 'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'nonce-synthetic-nonce'");
    expect(policy).toContain("style-src-elem 'self' 'nonce-synthetic-nonce'");
    expect(policy).toContain("style-src-attr 'none'");
    expect(policy).toContain("connect-src 'self' ws://127.0.0.1:3100");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("img-src 'self'");
    expect(policy).toContain("font-src 'self'");
    expect(policy).not.toContain("manifest-src");
    expect(policy).not.toContain("media-src");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("data:");
    expect(policy).not.toContain("blob:");

  });

  it("não habilita unsafe-eval nem websocket em produção", () => {

    const policy = buildContentSecurityPolicy("production-nonce", { development: false });

    expect(policy).toContain("script-src 'self' 'nonce-production-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src-elem 'self' 'nonce-production-nonce'");
    expect(policy).toContain("style-src-attr 'none'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).toContain("connect-src 'self'");
    
  });
});
