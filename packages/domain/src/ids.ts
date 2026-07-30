/**
 * Branded id types — distinct nominal types over UUIDv4 string payloads.
 * See `packages/domain` documentation for rationale.
 */
export type Brand<T, B> = T & { readonly __brand: B };

export type OrganizationId = Brand<string, 'OrganizationId'>;
export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type EnvironmentId = Brand<string, 'EnvironmentId'>;
export type ScanId = Brand<string, 'ScanId'>;
export type PageId = Brand<string, 'PageId'>;
export type PageSnapshotId = Brand<string, 'PageSnapshotId'>;
export type IssueId = Brand<string, 'IssueId'>;
export type RuleId = Brand<string, 'RuleId'>;
export type JourneyId = Brand<string, 'JourneyId'>;
export type JourneyStepId = Brand<string, 'JourneyStepId'>;
export type BaselineId = Brand<string, 'BaselineId'>;
export type RegressionId = Brand<string, 'RegressionId'>;
export type PolicyId = Brand<string, 'PolicyId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type EventId = Brand<string, 'EventId'>;
export type ApprovalId = Brand<string, 'ApprovalId'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const brandId = <B extends string>(value: string): Brand<string, B> => {
  if (!UUID_RE.test(value)) {
    throw new TypeError(`Invalid UUID: ${value}`);
  }
  return value as Brand<string, B>;
};

export const organizationId = (v: string): OrganizationId => brandId(v);
export const userId = (v: string): UserId => brandId(v);
export const sessionId = (v: string): SessionId => brandId(v);
export const projectId = (v: string): ProjectId => brandId(v);
export const environmentId = (v: string): EnvironmentId => brandId(v);
export const scanId = (v: string): ScanId => brandId(v);
export const pageId = (v: string): PageId => brandId(v);
export const pageSnapshotId = (v: string): PageSnapshotId => brandId(v);
export const issueId = (v: string): IssueId => brandId(v);
export const ruleId = (v: string): RuleId => brandId(v);
export const journeyId = (v: string): JourneyId => brandId(v);
export const journeyStepId = (v: string): JourneyStepId => brandId(v);
export const baselineId = (v: string): BaselineId => brandId(v);
export const regressionId = (v: string): RegressionId => brandId(v);
export const policyId = (v: string): PolicyId => brandId(v);
export const auditEventId = (v: string): AuditEventId => brandId(v);
export const eventId = (v: string): EventId => brandId(v);
export const approvalId = (v: string): ApprovalId => brandId(v);