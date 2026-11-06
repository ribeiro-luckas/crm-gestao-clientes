import { defaultAc, defaultRoles } from "better-auth/plugins/organization/access";
import type { AccessControl, Role } from "better-auth/plugins/access";

// Keep Better Auth's role matrix identical in server and browser clients.
// The update-member-role hook applies the narrower OWNER-only policy while
// preserving ADMIN's other member:update capabilities (including teams).
export const organizationAccessControl = defaultAc as AccessControl;
export const organizationRoles = defaultRoles as Record<string, Role>;
