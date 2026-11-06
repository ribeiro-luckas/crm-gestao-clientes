import { AsyncLocalStorage } from "node:async_hooks";
import { mapOrganizationRequiresOwnerError, type OrganizationOwnerConflict } from "@/lib/organization-owner-invariant-error";
import { mapMemberAssignmentIntegrityError, type MemberAssignmentConflict } from "@/lib/member-assignment-integrity-error";

type AuthRequestErrorContext = {
  pathname: string;
  organizationOwnerConflict?: OrganizationOwnerConflict;
  memberAssignmentConflict?: MemberAssignmentConflict;
};

const requestContext = new AsyncLocalStorage<AuthRequestErrorContext>();
const protectedMembershipEndpoints = new Set([
  "/api/auth/organization/leave",
  "/api/auth/organization/remove-member",
]);

/** Records the exact PG invariant only for the membership-removal HTTP routes. */
export function recordOrganizationOwnerInvariantError(error: unknown): boolean {
  
  const context = requestContext.getStore();

  if (!context || !protectedMembershipEndpoints.has(context.pathname)) return false;

  const mappedError = mapOrganizationRequiresOwnerError(error);

  if (!mappedError) return false;

  context.organizationOwnerConflict = mappedError;

  return true;
}

/** Records only a matching M-01 RESTRICT violation on membership-removal routes. */
export function recordMemberAssignmentIntegrityError(error: unknown): boolean {

  const context = requestContext.getStore();

  if (!context || !protectedMembershipEndpoints.has(context.pathname)) return false;

  const mappedError = mapMemberAssignmentIntegrityError(error);

  if (!mappedError) return false;

  context.memberAssignmentConflict = mappedError;

  return true;
}

export function getOrganizationOwnerConflictResponse(
  response: Response,
  context: AuthRequestErrorContext,
): Response {

  if (response.status < 500 || !context.organizationOwnerConflict) return response;

  const headers = new Headers(response.headers);

  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(JSON.stringify(context.organizationOwnerConflict), { status: 409, headers });
}

export function getMemberAssignmentConflictResponse(
  response: Response,
  context: AuthRequestErrorContext,
): Response {

  if (response.status < 500 || !context.memberAssignmentConflict) return response;

  const headers = new Headers(response.headers);

  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(JSON.stringify(context.memberAssignmentConflict), { status: 409, headers });
}

export async function handleAuthRequestWithMappedErrors(
  pathname: string,
  operation: () => Promise<Response>,
) {

  const context: AuthRequestErrorContext = { pathname };

  return requestContext.run(context, async () => {

    let response: Response;

    try {

      response = await operation();

    } catch (error) {

      if (recordOrganizationOwnerInvariantError(error)) {

        response = new Response(null, { status: 500 });

      } else if (recordMemberAssignmentIntegrityError(error)) {

        response = new Response(null, { status: 500 });

      } else {

        throw error;

      }
    }

    const ownerResponse = getOrganizationOwnerConflictResponse(response, context);

    if (ownerResponse !== response) return ownerResponse;

    return getMemberAssignmentConflictResponse(response, context);
  });
}
