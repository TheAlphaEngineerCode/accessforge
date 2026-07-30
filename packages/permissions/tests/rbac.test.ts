import { describe, it, expect } from 'vitest';
import { can, canAll, canAny, isAdmin, permissionsFor, RBAC_MATRIX } from '../src/index.js';
import { ALL_ROLES, type Permission } from '@accessforge/domain';

const READS: readonly Permission[] = ['project.read', 'scan.read', 'issue.read', 'report.read'];
const WRITES: readonly Permission[] = [
  'project.write',
  'scan.create',
  'journey.write',
  'issue.manage',
  'organization.manage',
];

describe('rbac matrix completeness', () => {
  it('RBAC_MATRIX has an entry for every role', () => {
    for (const role of ALL_ROLES) {
      expect(RBAC_MATRIX[role]).toBeDefined();
    }
  });
});

describe('rbac core', () => {
  it('viewer can read but never write', () => {
    expect(can('VIEWER', 'project.read')).toBe(true);
    expect(can('VIEWER', 'project.write')).toBe(false);
    expect(can('VIEWER', 'organization.manage')).toBe(false);
    for (const w of WRITES) {
      expect(can('VIEWER', w), `${w} must NOT be granted to VIEWER`).toBe(false);
    }
  });

  it('developer can trigger scans but not manage issues', () => {
    expect(can('DEVELOPER', 'scan.create')).toBe(true);
    expect(can('DEVELOPER', 'scan.read')).toBe(true);
    expect(can('DEVELOPER', 'issue.manage')).toBe(false);
  });

  it('accessibility engineer can manage issues and rules', () => {
    expect(can('ACCESSIBILITY_ENGINEER', 'issue.manage')).toBe(true);
    expect(can('ACCESSIBILITY_ENGINEER', 'rule.manage')).toBe(true);
    expect(can('ACCESSIBILITY_ENGINEER', 'organization.manage')).toBe(false);
  });

  it('qa can manage journeys and issues', () => {
    expect(can('QA', 'journey.write')).toBe(true);
    expect(can('QA', 'issue.manage')).toBe(true);
    expect(can('QA', 'rule.manage')).toBe(false);
  });

  it('owner grants organization.manage; admin does not', () => {
    expect(permissionsFor('OWNER').has('organization.manage')).toBe(true);
    expect(permissionsFor('ADMIN').has('organization.manage')).toBe(false);
  });

  it('canAll is true only when every permission is granted', () => {
    expect(canAll('ACCESSIBILITY_ENGINEER', ['project.write', 'issue.manage'])).toBe(true);
    expect(canAll('QA', ['project.write', 'issue.manage'])).toBe(false);
  });

  it('canAny short-circuits to true', () => {
    expect(canAny('VIEWER', READS)).toBe(true);
    expect(canAny('VIEWER', WRITES)).toBe(false);
  });

  it('null or unknown role fails closed', () => {
    expect(can(null, 'project.read')).toBe(false);
    expect(can(undefined, 'project.read')).toBe(false);
    expect(can('bogus_role' as never, 'project.read')).toBe(false);
  });

  it('isAdmin covers OWNER and ADMIN only', () => {
    expect(isAdmin('OWNER')).toBe(true);
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('ACCESSIBILITY_ENGINEER')).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
