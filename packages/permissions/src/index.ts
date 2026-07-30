/**
 * @accessforge/permissions — single source of truth mapping roles → permission sets.
 *
 * Default role for a new member is `VIEWER` (read-only). Adding a permission to the
 * spec means adding a row here; the RBAC test (`tests/rbac.test.ts`) fails if a role
 * silently grants a permission that's not declared in its row.
 */
import type { Permission, Role } from '@accessforge/domain';

type PermSet = ReadonlySet<Permission>;

const ROLES: Readonly<Record<Role, PermSet>> = {
  OWNER: new Set<Permission>([
    'project.read',
    'project.write',
    'scan.create',
    'scan.read',
    'journey.read',
    'journey.write',
    'issue.read',
    'issue.manage',
    'rule.read',
    'rule.manage',
    'baseline.read',
    'baseline.manage',
    'policy.read',
    'policy.manage',
    'report.read',
    'integration.manage',
    'organization.manage',
    'audit.read',
  ]),

  ADMIN: new Set<Permission>([
    'project.read',
    'project.write',
    'scan.create',
    'scan.read',
    'journey.read',
    'journey.write',
    'issue.read',
    'issue.manage',
    'rule.read',
    'rule.manage',
    'baseline.read',
    'baseline.manage',
    'policy.read',
    'policy.manage',
    'report.read',
    'integration.manage',
    'audit.read',
  ]),

  ACCESSIBILITY_ENGINEER: new Set<Permission>([
    'project.read',
    'project.write',
    'scan.create',
    'scan.read',
    'journey.read',
    'journey.write',
    'issue.read',
    'issue.manage',
    'rule.read',
    'rule.manage',
    'baseline.read',
    'baseline.manage',
    'policy.read',
    'policy.manage',
    'report.read',
    'audit.read',
  ]),

  DEVELOPER: new Set<Permission>([
    'project.read',
    'scan.create',
    'scan.read',
    'journey.read',
    'issue.read',
    'rule.read',
    'baseline.read',
    'policy.read',
    'report.read',
  ]),

  QA: new Set<Permission>([
    'project.read',
    'scan.create',
    'scan.read',
    'journey.read',
    'journey.write',
    'issue.read',
    'issue.manage',
    'rule.read',
    'baseline.read',
    'baseline.manage',
    'policy.read',
    'report.read',
  ]),

  VIEWER: new Set<Permission>([
    'project.read',
    'scan.read',
    'journey.read',
    'issue.read',
    'rule.read',
    'baseline.read',
    'policy.read',
    'report.read',
  ]),
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const set = ROLES[role];
  return set ? set.has(permission) : false;
}

export function permissionsFor(role: Role): ReadonlySet<Permission> {
  return ROLES[role] ?? new Set<Permission>();
}

export function canAny(role: Role | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canAll(role: Role | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export const RBAC_MATRIX: Readonly<Record<Role, ReadonlyArray<Permission>>> = {
  OWNER: Array.from(ROLES.OWNER),
  ADMIN: Array.from(ROLES.ADMIN),
  ACCESSIBILITY_ENGINEER: Array.from(ROLES.ACCESSIBILITY_ENGINEER),
  DEVELOPER: Array.from(ROLES.DEVELOPER),
  QA: Array.from(ROLES.QA),
  VIEWER: Array.from(ROLES.VIEWER),
};
