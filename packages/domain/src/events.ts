import type { EventId, OrganizationId, AuditEventId, UserId } from './ids.js';

export interface EventEnvelope<T extends EventType = EventType, P = unknown> {
  readonly id: EventId;
  readonly type: T;
  readonly version: 1;
  readonly organizationId: OrganizationId;
  readonly source: string;
  readonly entityId: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly occurredAt: Date;
  readonly payload: P;
}

export type EventType =
  | 'project.created'
  | 'project.updated'
  | 'environment.created'
  | 'scan.queued'
  | 'scan.started'
  | 'scan.completed'
  | 'scan.failed'
  | 'page.discovered'
  | 'issue.detected'
  | 'issue.resolved'
  | 'issue.reopened'
  | 'journey.started'
  | 'journey.step.completed'
  | 'journey.step.failed'
  | 'journey.completed'
  | 'journey.failed'
  | 'baseline.created'
  | 'regression.detected'
  | 'quality_gate.passed'
  | 'quality_gate.failed'
  | 'user.registered'
  | 'user.login'
  | 'user.logout'
  | 'session.revoked'
  | 'organization.created'
  | 'rule.updated'
  | 'policy.updated';

export const ALL_EVENT_TYPES: readonly EventType[] = [
  'project.created',
  'project.updated',
  'environment.created',
  'scan.queued',
  'scan.started',
  'scan.completed',
  'scan.failed',
  'page.discovered',
  'issue.detected',
  'issue.resolved',
  'issue.reopened',
  'journey.started',
  'journey.step.completed',
  'journey.step.failed',
  'journey.completed',
  'journey.failed',
  'baseline.created',
  'regression.detected',
  'quality_gate.passed',
  'quality_gate.failed',
  'user.registered',
  'user.login',
  'user.logout',
  'session.revoked',
  'organization.created',
  'rule.updated',
  'policy.updated',
] as const;

export function buildEvent<T extends EventType, P>(
  partial: Omit<EventEnvelope<T, P>, 'version'>,
): EventEnvelope<T, P> {
  return { version: 1, ...partial };
}

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly organizationId: OrganizationId | null;
  readonly actorId: UserId | null;
  readonly action: string;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly before: unknown;
  readonly after: unknown;
  readonly timestamp: Date;
  readonly ip: string | null;
  readonly correlationId: string;
}