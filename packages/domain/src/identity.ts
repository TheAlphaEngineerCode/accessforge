import type {
  OrganizationId,
  UserId,
  ProjectId,
  EnvironmentId,
  ScanId,
  PageId,
  PageSnapshotId,
  IssueId,
  RuleId,
  JourneyId,
  JourneyStepId,
  BaselineId,
  RegressionId,
  PolicyId,
} from './ids.js';

/**
 * User-facing roles (spec §53). Declared once here; the permission matrix in
 * `@accessforge/permissions` is the source of truth for what each grants.
 */
export type Role = 'OWNER' | 'ADMIN' | 'ACCESSIBILITY_ENGINEER' | 'DEVELOPER' | 'QA' | 'VIEWER';

export const ALL_ROLES: readonly Role[] = [
  'OWNER',
  'ADMIN',
  'ACCESSIBILITY_ENGINEER',
  'DEVELOPER',
  'QA',
  'VIEWER',
] as const;

export type Permission =
  | 'project.read'
  | 'project.write'
  | 'scan.create'
  | 'scan.read'
  | 'journey.read'
  | 'journey.write'
  | 'issue.read'
  | 'issue.manage'
  | 'rule.read'
  | 'rule.manage'
  | 'baseline.read'
  | 'baseline.manage'
  | 'policy.read'
  | 'policy.manage'
  | 'report.read'
  | 'integration.manage'
  | 'organization.manage'
  | 'audit.read';

export const ALL_PERMISSIONS: readonly Permission[] = [
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
] as const;

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Membership {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: Role;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Session {
  readonly id: string;
  readonly userId: UserId;
  readonly organizationId: OrganizationId | null;
  readonly role: Role | null;
  readonly tokenHash: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly revokedAt: Date | null;
}

export type EnvironmentType = 'LOCAL' | 'PREVIEW' | 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

export const ALL_ENVIRONMENT_TYPES: readonly EnvironmentType[] = [
  'LOCAL',
  'PREVIEW',
  'DEVELOPMENT',
  'STAGING',
  'PRODUCTION',
] as const;

export interface Project {
  readonly id: ProjectId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly description: string | null;
  readonly baseUrl: string;
  readonly repositoryUrl: string | null;
  readonly defaultBranch: string | null;
  readonly status: 'ACTIVE' | 'ARCHIVED';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Environment {
  readonly id: EnvironmentId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId;
  readonly name: string;
  readonly baseUrl: string;
  readonly type: EnvironmentType;
  readonly createdAt: Date;
}

export type ScanType = 'PAGE' | 'SITE' | 'JOURNEY' | 'REGRESSION' | 'CI';
export type ScanStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export const ALL_SCAN_TYPES: readonly ScanType[] = [
  'PAGE',
  'SITE',
  'JOURNEY',
  'REGRESSION',
  'CI',
] as const;

export interface Scan {
  readonly id: ScanId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId | null;
  readonly scanType: ScanType;
  readonly status: ScanStatus;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly trigger: string | null;
  readonly commitSha: string | null;
  readonly branch: string | null;
  readonly createdBy: UserId | null;
  readonly createdAt: Date;
}

export interface Page {
  readonly id: PageId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId;
  readonly url: string;
  readonly title: string | null;
  readonly route: string | null;
  readonly lastScannedAt: Date | null;
  readonly createdAt: Date;
}

export interface PageSnapshot {
  readonly id: PageSnapshotId;
  readonly organizationId: OrganizationId;
  readonly pageId: PageId;
  readonly scanId: ScanId;
  readonly domSnapshotUrl: string | null;
  readonly accessibilityTreeUrl: string | null;
  readonly screenshotUrl: string | null;
  readonly createdAt: Date;
}

export type IssueSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueImpact = 'MINOR' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ACCEPTED_RISK' | 'RESOLVED' | 'FALSE_POSITIVE';
export type RuleCategory =
  | 'SEMANTICS'
  | 'KEYBOARD'
  | 'FOCUS'
  | 'FORMS'
  | 'ARIA'
  | 'COLOR'
  | 'NAVIGATION'
  | 'IMAGES'
  | 'HEADINGS'
  | 'LANDMARKS'
  | 'TABLES'
  | 'DYNAMIC_CONTENT'
  | 'MEDIA'
  | 'RESPONSIVE';

export const ALL_RULE_CATEGORIES: readonly RuleCategory[] = [
  'SEMANTICS',
  'KEYBOARD',
  'FOCUS',
  'FORMS',
  'ARIA',
  'COLOR',
  'NAVIGATION',
  'IMAGES',
  'HEADINGS',
  'LANDMARKS',
  'TABLES',
  'DYNAMIC_CONTENT',
  'MEDIA',
  'RESPONSIVE',
] as const;

export interface Rule {
  readonly id: RuleId;
  readonly organizationId: OrganizationId | null;
  readonly code: string;
  readonly name: string;
  readonly category: RuleCategory;
  readonly description: string;
  readonly severity: IssueSeverity;
  readonly wcagReferences: ReadonlyArray<string>;
  readonly enabled: boolean;
  readonly engine: string;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Issue {
  readonly id: IssueId;
  readonly organizationId: OrganizationId;
  readonly scanId: ScanId;
  readonly projectId: ProjectId;
  readonly pageId: PageId | null;
  readonly journeyId: JourneyId | null;
  readonly journeyStepId: JourneyStepId | null;
  readonly ruleId: RuleId | null;
  readonly category: RuleCategory;
  readonly severity: IssueSeverity;
  readonly impact: IssueImpact;
  readonly title: string;
  readonly description: string;
  readonly selector: string | null;
  readonly htmlSnippet: string | null;
  readonly accessibleName: string | null;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly wcagReferences: ReadonlyArray<string>;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly status: IssueStatus;
  readonly fingerprint: string;
  readonly firstDetectedAt: Date;
  readonly lastDetectedAt: Date;
  readonly resolvedAt: Date | null;
}

export interface Journey {
  readonly id: JourneyId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId;
  readonly name: string;
  readonly description: string | null;
  readonly startUrl: string;
  readonly priority: number;
  readonly status: 'ACTIVE' | 'ARCHIVED';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type JourneyAction =
  'NAVIGATE' | 'CLICK' | 'TYPE' | 'PRESS_KEY' | 'SELECT' | 'CHECK' | 'UPLOAD' | 'WAIT' | 'ASSERT';

export const ALL_JOURNEY_ACTIONS: readonly JourneyAction[] = [
  'NAVIGATE',
  'CLICK',
  'TYPE',
  'PRESS_KEY',
  'SELECT',
  'CHECK',
  'UPLOAD',
  'WAIT',
  'ASSERT',
] as const;

export interface JourneyStep {
  readonly id: JourneyStepId;
  readonly organizationId: OrganizationId;
  readonly journeyId: JourneyId;
  readonly order: number;
  readonly name: string;
  readonly actionType: JourneyAction;
  readonly target: Readonly<Record<string, unknown>>;
  readonly input: Readonly<Record<string, unknown>>;
  readonly expectedOutcome: Readonly<Record<string, unknown>> | null;
  readonly timeout: number | null;
}

export interface Baseline {
  readonly id: BaselineId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId;
  readonly scanId: ScanId;
  readonly name: string;
  readonly createdBy: UserId | null;
  readonly createdAt: Date;
}

export type RegressionKind = 'NEW' | 'UNCHANGED' | 'RESOLVED' | 'REGRESSED';

export const ALL_REGRESSION_KINDS: readonly RegressionKind[] = [
  'NEW',
  'UNCHANGED',
  'RESOLVED',
  'REGRESSED',
] as const;

export interface Regression {
  readonly id: RegressionId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId;
  readonly baselineId: BaselineId;
  readonly scanId: ScanId;
  readonly issueFingerprint: string;
  readonly kind: RegressionKind;
  readonly createdAt: Date;
}

export interface Policy {
  readonly id: PolicyId;
  readonly organizationId: OrganizationId;
  readonly projectId: ProjectId | null;
  readonly name: string;
  readonly description: string | null;
  readonly config: Readonly<Record<string, unknown>>;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
