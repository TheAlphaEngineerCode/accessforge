/**
 * In-memory Repositories — pure JS implementation backed by Maps. Used by integration
 * tests so they can run without a Postgres or pg-mem connection.
 *
 * Rules:
 *  - All tenant-scoped queries reject `organizationId === undefined` with a runtime
 *    error — same contract as the pg layer.
 *  - `uuid` via `crypto.randomUUID()` — collisions are statistically impossible.
 *  - No async delay simulation. Tests stay deterministic.
 *  - Tenant-scoped `listForOrganization`, `listForProject` etc. throw on `undefined`
 *    tenant input.
 */
import { randomUUID } from 'node:crypto';
import type {
  AuditEvent,
  AuditEventId,
  Environment,
  EnvironmentType,
  EventEnvelope,
  EventType,
  Journey,
  JourneyStep,
  Membership,
  Organization,
  OrganizationId,
  Page,
  PageSnapshot,
  Project,
  ProjectId,
  EnvironmentId,
  Rule,
  RuleCategory,
  Scan,
  ScanId,
  ScanStatus,
  ScanType,
  Session,
  User,
  UserId,
  Issue,
  IssueId,
  JourneyId,
  JourneyStepId,
  RuleId,
  PageId,
  PageSnapshotId,
  Role,
} from '@accessforge/domain';
import {
  auditEventId,
  eventId,
  organizationId as orgId,
  projectId as pid,
  environmentId as envId,
  scanId as sid,
  pageId as pageIdFn,
  pageSnapshotId as snapshotIdFn,
  ruleId as ruleIdFn,
  issueId as issueIdFn,
  journeyId as journeyIdFn,
  journeyStepId as journeyStepIdFn,
  userId as uid,
} from '@accessforge/domain';
import type {
  AuditRepository,
  EnvironmentRepository,
  EventRepository,
  IssueRepository,
  JourneyRepository,
  JourneyStepRepository,
  MembershipRepository,
  OrganizationRepository,
  PageRepository,
  PageSnapshotRepository,
  ProjectRepository,
  Repositories,
  RuleRepository,
  ScanRepository,
  SessionRepository,
  UserRepository,
} from '../../src/db/repositories.js';

const ROLES: readonly Role[] = [
  'OWNER', 'ADMIN', 'ACCESSIBILITY_ENGINEER', 'DEVELOPER', 'QA', 'VIEWER',
] as const;

function assertRole(v: unknown): Role {
  if (typeof v === 'string' && (ROLES as readonly string[]).includes(v)) return v as Role;
  throw new Error(`invalid role: ${String(v)}`);
}

function requireOrg(orgId: OrganizationId | undefined): asserts orgId is OrganizationId {
  if (!orgId) throw new Error('organizationId is required');
}

class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private readonly byEmail = new Map<string, string>();
  async findByEmail(email: string): Promise<User | null> {
    const id = this.byEmail.get(email.toLowerCase());
    return id ? (this.users.get(id) ?? null) : null;
  }
  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
  async insert(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  }): Promise<User> {
    const id = uid(randomUUID());
    const now = new Date();
    const user: User = {
      id, email: input.email.toLowerCase(), passwordHash: input.passwordHash,
      displayName: input.displayName, status: input.status ?? 'ACTIVE',
      createdAt: now, updatedAt: now,
    };
    this.users.set(id, user);
    this.byEmail.set(user.email, id);
    return user;
  }
}

class MemoryMembershipRepository implements MembershipRepository {
  private readonly memberships = new Map<string, Membership>();
  async find(orgId: OrganizationId, userId: UserId): Promise<Membership | null> {
    for (const m of this.memberships.values()) {
      if (m.organizationId === orgId && m.userId === userId) return m;
    }
    return null;
  }
  async insert(input: {
    organizationId: OrganizationId;
    userId: UserId;
    role: Role;
  }): Promise<Membership> {
    const id = randomUUID();
    const now = new Date();
    const m: Membership = {
      id, organizationId: input.organizationId, userId: input.userId, role: input.role,
      createdAt: now, updatedAt: now,
    };
    this.memberships.set(id, m);
    return m;
  }
  async listForUser(userId: UserId): Promise<readonly Membership[]> {
    return Array.from(this.memberships.values()).filter((m) => m.userId === userId);
  }
  all(): ReadonlyArray<Membership> {
    return Array.from(this.memberships.values());
  }
}

class MemoryOrganizationRepository implements OrganizationRepository {
  private readonly orgs = new Map<string, Organization>();
  private readonly bySlug = new Map<string, string>();

  constructor(private readonly memberships: MemoryMembershipRepository) {}

  all(): ReadonlyArray<Organization> {
    return Array.from(this.orgs.values());
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const id = this.bySlug.get(slug);
    return id ? (this.orgs.get(id) ?? null) : null;
  }
  async findById(id: OrganizationId): Promise<Organization | null> {
    return this.orgs.get(id) ?? null;
  }
  async insert(input: { name: string; slug: string }): Promise<Organization> {
    const id = orgId(randomUUID());
    const now = new Date();
    const org: Organization = {
      id, name: input.name, slug: input.slug, createdAt: now, updatedAt: now,
    };
    this.orgs.set(id, org);
    this.bySlug.set(input.slug, id);
    return org;
  }
  async listForUser(userId: UserId): Promise<readonly (Organization & { role: Role })[]> {
    const list = this.memberships.all().filter((m) => m.userId === userId);
    return list.map((m) => {
      const org = this.orgs.get(m.organizationId);
      if (!org) throw new Error('dangling membership');
      return { ...org, role: m.role };
    });
  }
}

class MemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();
  private readonly byTokenHash = new Map<string, string>();
  async insert(input: {
    userId: UserId;
    organizationId: OrganizationId | null;
    role: Role | null;
    tokenHash: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<Session> {
    const id = randomUUID();
    const s: Session = {
      id,
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
      tokenHash: input.tokenHash,
      issuedAt: new Date(),
      expiresAt: input.expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
      revokedAt: null,
    };
    this.sessions.set(id, s);
    this.byTokenHash.set(input.tokenHash, id);
    return s;
  }
  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const id = this.byTokenHash.get(tokenHash);
    return id ? (this.sessions.get(id) ?? null) : null;
  }
  async revoke(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (s) this.sessions.set(id, { ...s, revokedAt: new Date() });
  }
  async revokeAllForUser(userId: UserId): Promise<number> {
    let n = 0;
    for (const [id, s] of this.sessions) {
      if (s.userId === userId && !s.revokedAt) {
        this.sessions.set(id, { ...s, revokedAt: new Date() });
        n++;
      }
    }
    return n;
  }
}

class MemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEvent[] = [];
  async insert(input: {
    organizationId: OrganizationId | null;
    actorId: UserId | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    before: unknown;
    after: unknown;
    ip: string | null;
    correlationId: string;
  }): Promise<AuditEvent> {
    const ev: AuditEvent = {
      id: auditEventId(randomUUID()),
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: input.before,
      after: input.after,
      timestamp: new Date(),
      ip: input.ip,
      correlationId: input.correlationId,
    };
    this.events.push(ev);
    return ev;
  }
  async listForOrganization(organizationId: OrganizationId, limit: number): Promise<readonly AuditEvent[]> {
    requireOrg(organizationId);
    return this.events
      .filter((e) => e.organizationId === organizationId)
      .slice(-Math.max(1, Math.min(limit, 200)))
      .reverse();
  }
}

class MemoryEventRepository implements EventRepository {
  private readonly events: EventEnvelope[] = [];
  async insert<T extends EventType, P>(event: EventEnvelope<T, P>): Promise<void> {
    this.events.push(event as unknown as EventEnvelope);
  }
  async listForOrganization(organizationId: OrganizationId, limit: number): Promise<readonly EventEnvelope[]> {
    requireOrg(organizationId);
    return this.events
      .filter((e) => e.organizationId === organizationId)
      .slice(-Math.max(1, Math.min(limit, 200)))
      .reverse();
  }
}

class MemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();
  async insert(input: {
    organizationId: OrganizationId;
    name: string;
    description: string | null;
    baseUrl: string;
    repositoryUrl: string | null;
    defaultBranch: string | null;
  }): Promise<Project> {
    requireOrg(input.organizationId);
    const id = pid(randomUUID());
    const now = new Date();
    const project: Project = {
      id,
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      baseUrl: input.baseUrl,
      repositoryUrl: input.repositoryUrl,
      defaultBranch: input.defaultBranch,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, project);
    return project;
  }
  async findById(organizationId: OrganizationId, projectId: ProjectId): Promise<Project | null> {
    requireOrg(organizationId);
    const p = this.projects.get(projectId);
    return p && p.organizationId === organizationId ? p : null;
  }
  async listForOrganization(organizationId: OrganizationId): Promise<readonly Project[]> {
    requireOrg(organizationId);
    return Array.from(this.projects.values()).filter((p) => p.organizationId === organizationId);
  }
  async archive(organizationId: OrganizationId, projectId: ProjectId): Promise<void> {
    requireOrg(organizationId);
    const p = this.projects.get(projectId);
    if (p && p.organizationId === organizationId) {
      this.projects.set(projectId, { ...p, status: 'ARCHIVED', updatedAt: new Date() });
    }
  }
}

class MemoryEnvironmentRepository implements EnvironmentRepository {
  private readonly environments = new Map<string, Environment>();
  async insert(input: {
    organizationId: OrganizationId;
    projectId: ProjectId;
    name: string;
    baseUrl: string;
    type: EnvironmentType;
  }): Promise<Environment> {
    requireOrg(input.organizationId);
    const id = envId(randomUUID());
    const env: Environment = {
      id,
      organizationId: input.organizationId,
      projectId: input.projectId,
      name: input.name,
      baseUrl: input.baseUrl,
      type: input.type,
      createdAt: new Date(),
    };
    this.environments.set(id, env);
    return env;
  }
  async findById(organizationId: OrganizationId, environmentId: EnvironmentId): Promise<Environment | null> {
    requireOrg(organizationId);
    const e = this.environments.get(environmentId);
    return e && e.organizationId === organizationId ? e : null;
  }
  async listForProject(organizationId: OrganizationId, projectId: ProjectId): Promise<readonly Environment[]> {
    requireOrg(organizationId);
    return Array.from(this.environments.values()).filter(
      (e) => e.organizationId === organizationId && e.projectId === projectId,
    );
  }
}

// ───────────────────────── Stubs (Phase 2) ────────────────────────────────────

class MemoryScanRepository implements ScanRepository {
  async insert(_input: never): Promise<never> {
    throw new Error('Phase 2 not implemented — see IMPLEMENTATION_STATUS.md');
  }
  async findById(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForProject(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async updateStatus(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}
class MemoryPageRepository implements PageRepository {
  async upsert(_input: never): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async findById(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForProject(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}
class MemoryPageSnapshotRepository implements PageSnapshotRepository {
  async insert(_input: never): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async findByScan(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}
class MemoryRuleRepository implements RuleRepository {
  async upsert(_input: never): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async findByCode(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForOrganization(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listEnabled(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}
class MemoryIssueRepository implements IssueRepository {
  async upsert(_input: never): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async findById(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForScan(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForProject(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async updateStatus(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async resolveManyByFingerprint(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}
class MemoryJourneyRepository implements JourneyRepository {
  async insert(_input: never): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async findById(): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForProject(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}
class MemoryJourneyStepRepository implements JourneyStepRepository {
  async insert(_input: never): Promise<never> { throw new Error('Phase 2 not implemented'); }
  async listForJourney(): Promise<never> { throw new Error('Phase 2 not implemented'); }
}

// ───────────────────────── Aggregate ──────────────────────────────────────────

export interface MemoryRepositories extends Repositories {
  readonly _memberships: MemoryMembershipRepository;
  readonly _organizations: MemoryOrganizationRepository;
  reset(): void;
}

export function buildMemoryRepositories(): MemoryRepositories {
  const memberships = new MemoryMembershipRepository();
  const orgs = new MemoryOrganizationRepository(memberships);
  return {
    users: new MemoryUserRepository(),
    organizations: orgs,
    memberships,
    sessions: new MemorySessionRepository(),
    audit: new MemoryAuditRepository(),
    events: new MemoryEventRepository(),
    projects: new MemoryProjectRepository(),
    environments: new MemoryEnvironmentRepository(),
    scans: new MemoryScanRepository() as unknown as ScanRepository,
    pages: new MemoryPageRepository() as unknown as PageRepository,
    pageSnapshots: new MemoryPageSnapshotRepository() as unknown as PageSnapshotRepository,
    rules: new MemoryRuleRepository() as unknown as RuleRepository,
    issues: new MemoryIssueRepository() as unknown as IssueRepository,
    journeys: new MemoryJourneyRepository() as unknown as JourneyRepository,
    journeySteps: new MemoryJourneyStepRepository() as unknown as JourneyStepRepository,
    get _memberships() { return memberships; },
    get _organizations() { return orgs; },
    reset() {
      // simple behaviour — fresh buildMemoryRepositories() in each test
    },
  };
}

// Unused-id-brands toucher to satisfy tree-shaking-aware linters
void auditEventId; void eventId; void snapshotIdFn; void ruleIdFn; void issueIdFn;
void journeyIdFn; void journeyStepIdFn; void sid; void pageIdFn;