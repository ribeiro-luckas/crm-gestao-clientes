import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/content-security-policy";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function proxy(request: NextRequest) {
  
  // Apply the nonce policy to document reads. API and static responses still
  // receive the basic headers from next.config; the reverse proxy must not add
  // a second CSP policy.
  if (request.method !== "GET" && request.method !== "HEAD") {

    return NextResponse.next();

  }

  const nonce = randomBytes(18).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const websocketOrigin = isDevelopment && LOOPBACK_HOSTS.has(request.nextUrl.hostname)
    ? `${request.nextUrl.protocol === "https:" ? "wss" : "ws"}://${request.nextUrl.host}`
    : undefined;

  const policy = buildContentSecurityPolicy(nonce, {
    development: isDevelopment,
    websocketOrigin,
  });

  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);

  // Next.js extracts the nonce from the forwarded request CSP. This request
  // header is not returned as an enforced CSP response header.
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (isDevelopment) {

    // Next/React development tooling creates transient inline styles. Keep the
    // same policy observable without blocking those development-only assets.
    response.headers.set("Content-Security-Policy-Report-Only", policy);
    response.headers.delete("Content-Security-Policy");

  } else {

    response.headers.set("Content-Security-Policy", policy);
    response.headers.delete("Content-Security-Policy-Report-Only");

  }

  return response;

}

export const config = {

  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],

};
