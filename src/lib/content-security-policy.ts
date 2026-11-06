/**
 * Content Security Policy for the current self-hosted Next.js application.
 * A nonce is generated per document request by proxy.ts.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  options: { development: boolean; websocketOrigin?: string },
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    "img-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${options.websocketOrigin ? ` ${options.websocketOrigin}` : ""}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return directives.join("; ");
}
