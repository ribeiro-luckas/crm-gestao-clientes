import type { APIRequestContext, Page, Response } from "@playwright/test";

const signInPath = "/api/auth/sign-in/email";
const maximumRateLimitRetries = 3;
const schedulerMarginMs = 100;

type HttpResponse = Pick<Response, "status" | "headers">;

/** Wait only for the active Better Auth block window; do not alter the limit. */
export async function retryAfterBetterAuthRateLimit<T extends HttpResponse>(send: () => Promise<T>): Promise<T> {

  for (let retry = 0; retry <= maximumRateLimitRetries; retry += 1) {

    const response = await send();

    if (response.status() !== 429 || retry === maximumRateLimitRetries) return response;

    const retryAfterSeconds = Number(response.headers()["x-retry-after"]);

    if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 1) return response;

    await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000 + schedulerMarginMs));
    
  }

  throw new Error("Fluxo de retry Better Auth terminou sem uma resposta HTTP.");
}

export function signInWithRateLimitRetry(
  request: APIRequestContext,
  credentials: { email: string; password: string },
  origin: string,
) {

  return retryAfterBetterAuthRateLimit(() => request.post(signInPath, {
    headers: { origin },
    data: credentials,
  }));

}

export function submitSignInFormWithRateLimitRetry(page: Page, submit: () => Promise<unknown>) {

  return retryAfterBetterAuthRateLimit(async () => {

    const response = page.waitForResponse((candidate) => {

      const url = new URL(candidate.url());

      return url.pathname === signInPath && candidate.request().method() === "POST";

    });

    await submit();

    return response;

  });
}
