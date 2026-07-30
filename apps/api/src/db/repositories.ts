/**
 * Repositories — the only DAO layer the rest of `apps/api` is allowed to call.
 *
 * Tests substitute the in-memory implementation in `tests/memory/repositories.ts`;
 * production wires `PgRepositories` against the typed pool. Tenant-scoped lookups
 * MUST receive `organizationId` — routers do not invent it from a header. The
 * repository rejects an undefined tenant input with a runtime check that fails
 * loudly in tests (ADR-0005 — tenant scoping is enforced by code, not memory).
 */
import type {
  AuditEvent,
  AuditEventId,
  Environment,
  EnvironmentId,
  EnvironmentType,
  EventEnvelope,
  EventId,
  EventType,
  Issue,
  IssueId,
  Journey,
  JourneyId,
  JourneyStep,
  JourneyStepId,
  Membership,
  Organization,
  OrganizationId,
  Page,
  PageId,
  PageSnapshot,
  Project,
  ProjectId,
  Role,
  Rule,
  RuleCategory,
  RuleId,
  Scan,
  ScanId,
  ScanStatus,
  ScanType,
  Session,
  User,
  UserId,
} from '@accessforge/domain';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
  insert(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  }): Promise<User>;
}

export interface OrganizationRepository {
  findBySlug(slug: string): Promise<Organization | null>;
  findById(id: OrganizationId): Promise<Organization | null>;
  insert(input: { name: string; slug: string }): Promise<Organization>;
  listForUser(userId: UserId): Promise<readonly (Organization & { role: Role })[]>;
}

export interface MembershipRepository {
  find(organizationId: OrganizationId, userId: UserId): Promise<Membership | null>;
  insert(input: {
    organizationId: OrganizationId;
    userId: UserId;
    role: Role;
  }): Promise<Membership>;
  listForUser(userId: UserId): Promise<readonly Membership[]>;
}

export interface SessionRepository {
  insert(input: {
    userId: UserId;
    organizationId: OrganizationId | null;
    role: Role | null;
    tokenHash: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: UserId): Promise<number>;
}

export interface AuditRepository {
  insert(input: {
    organizationId: OrganizationId | null;
    actorId: UserId | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    before: unknown;
    after: unknown;
    ip: string | null;
    correlationId: string;
  }): Promise<AuditEvent>;
  listForOrganization(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<readonly AuditEvent[]>;
}

export interface EventRepository {
  insert<T extends EventType, P>(event: EventEnvelope<T, P>): Promise<void>;
  listForOrganization(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<readonly EventEnvelope[]>;
}

export interface ProjectRepository {
  insert(input: {
    organizationId: OrganizationId;
    name: string;
    description: string | null;
    baseUrl: string;
    repositoryUrl: string | null;
    defaultBranch: string | null;
  }): Promise<Project>;
  findById(organizationId: OrganizationId, projectId: ProjectId): Promise<Project | null>;
  listForOrganization(organizationId: OrganizationId): Promise<readonly Project[]>;
  archive(organizationId: OrganizationId, projectId: ProjectId): Promise<void>;
}

export interface EnvironmentRepository {
  insert(input: {
    organizationId: OrganizationId;
    projectId: ProjectId;
    name: string;
    baseUrl: string;
    type: EnvironmentType;
  }): Promise<Environment>;
  findById(
    organizationId: OrganizationId,
    environmentId: EnvironmentId,
  ): Promise<Environment | null>;
  listForProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<readonly Environment[]>;
}

export interface ScanRepository {
  insert(input: {
    organizationId: OrganizationId;
    projectId: ProjectId;
    environmentId: EnvironmentId | null;
    scanType: ScanType;
    trigger: string | null;
    commitSha: string | null;
    branch: string | null;
    createdBy: UserId | null;
  }): Promise<Scan>;
  findById(organizationId: OrganizationId, scanId: ScanId): Promise<Scan | null>;
  listForProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    limit: number,
  ): Promise<readonly Scan[]>;
  updateStatus(
    organizationId: OrganizationId,
    scanId: ScanId,
    status: ScanStatus,
    opts?: {
      startedAt?: Date;
      finishedAt?: Date;
    },
  ): Promise<void>;
}

export interface PageRepository {
  upsert(input: {
    organizationId: OrganizationId;
    projectId: ProjectId;
    url: string;
    title: string | null;
    route: string | null;
  }): Promise<Page>;
  findById(organizationId: OrganizationId, pageId: PageId): Promise<Page | null>;
  listForProject(organizationId: OrganizationId, projectId: ProjectId): Promise<readonly Page[]>;
}

export interface PageSnapshotRepository {
  insert(input: {
    organizationId: OrganizationId;
    pageId: PageId;
    scanId: ScanId;
    domSnapshotUrl: string | null;
    accessibilityTreeUrl: string | null;
    screenshotUrl: string | null;
  }): Promise<PageSnapshot>;
  findByScan(organizationId: OrganizationId, scanId: ScanId): Promise<readonly PageSnapshot[]>;
}

export interface RuleRepository {
  upsert(input: {
    organizationId: OrganizationId | null;
    code: string;
    name: string;
    category: RuleCategory;
    description: string;
    severity: string;
    wcagReferences: ReadonlyArray<string>;
    enabled: boolean;
    engine: string;
    version: number;
  }): Promise<Rule>;
  findByCode(organizationId: OrganizationId | null, code: string): Promise<Rule | null>;
  listForOrganization(organizationId: OrganizationId | null): Promise<readonly Rule[]>;
  listEnabled(organizationId: OrganizationId | null): Promise<readonly Rule[]>;
}

export interface IssueRepository {
  upsert(input: {
    organizationId: OrganizationId;
    scanId: ScanId;
    projectId: ProjectId;
    pageId: PageId | null;
    journeyId: JourneyId | null;
    journeyStepId: JourneyStepId | null;
    ruleId: RuleId | null;
    category: RuleCategory;
    severity: string;
    impact: string;
    title: string;
    description: string;
    selector: string | null;
    htmlSnippet: string | null;
    accessibleName: string | null;
    expected: string | null;
    actual: string | null;
    wcagReferences: ReadonlyArray<string>;
    evidence: Readonly<Record<string, unknown>>;
    fingerprint: string;
  }): Promise<Issue>;
  findById(organizationId: OrganizationId, issueId: IssueId): Promise<Issue | null>;
  listForScan(organizationId: OrganizationId, scanId: ScanId): Promise<readonly Issue[]>;
  listForProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    limit: number,
  ): Promise<readonly Issue[]>;
  updateStatus(
    organizationId: OrganizationId,
    issueId: IssueId,
    status: string,
    opts?: {
      resolvedAt?: Date | null;
    },
  ): Promise<void>;
  resolveManyByFingerprint(
    organizationId: OrganizationId,
    fingerprints: ReadonlyArray<string>,
  ): Promise<number>;
}

export interface JourneyRepository {
  insert(input: {
    organizationId: OrganizationId;
    projectId: ProjectId;
    name: string;
    description: string | null;
    startUrl: string;
    priority: number;
  }): Promise<Journey>;
  findById(organizationId: OrganizationId, journeyId: JourneyId): Promise<Journey | null>;
  listForProject(organizationId: OrganizationId, projectId: ProjectId): Promise<readonly Journey[]>;
}

export interface JourneyStepRepository {
  insert(input: {
    organizationId: OrganizationId;
    journeyId: JourneyId;
    order: number;
    name: string;
    actionType: string;
    target: Readonly<Record<string, unknown>>;
    input: Readonly<Record<string, unknown>>;
    expectedOutcome: Readonly<Record<string, unknown>> | null;
    timeout: number | null;
  }): Promise<JourneyStep>;
  listForJourney(
    organizationId: OrganizationId,
    journeyId: JourneyId,
  ): Promise<readonly JourneyStep[]>;
}

export interface Repositories {
  users: UserRepository;
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
  sessions: SessionRepository;
  audit: AuditRepository;
  events: EventRepository;
  projects: ProjectRepository;
  environments: EnvironmentRepository;
  scans: ScanRepository;
  pages: PageRepository;
  pageSnapshots: PageSnapshotRepository;
  rules: RuleRepository;
  issues: IssueRepository;
  journeys: JourneyRepository;
  journeySteps: JourneyStepRepository;
  /**
   * Run `fn` against a repository set bound to a single database transaction —
   * everything commits or rolls back together. The in-memory implementation has
   * no rollback; it exists so handlers can be written against one contract.
   */
  withTransaction<T>(fn: (repos: Repositories) => Promise<T>): Promise<T>;
  /** Cheap connectivity probe for readiness checks. Throws when the store is down. */
  ping(): Promise<void>;
}

export type { AuditEventId, EventId, ScanStatus, ScanType };
