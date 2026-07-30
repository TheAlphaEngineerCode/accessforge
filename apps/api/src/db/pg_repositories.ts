/**
 * Postgres implementations of the Repository interfaces needed by Phase 0 + 1.
 *
 * The repositories for scans/pages/rules/issues/journeys are declared in
 * `repositories.ts` and wired in Phase 2 (browser engine). Phase 1 exercises
 * users, organizations, memberships, sessions, audit events, projects and
 * environments — exactly the set of endpoints Phase 1 ships.
 */
import type { TypedPool } from '@accessforge/database';
import {
  asString,
  asOptionalString,
  asDate,
  asOptionalDate,
  asNumber,
} from '@accessforge/database';
import type {
  AuditEvent,
  AuditEventId,
  Environment,
  EnvironmentType,
  EventEnvelope,
  EventType,
  Membership,
  Organization,
  OrganizationId,
  Project,
  Role,
  Session,
  User,
  UserId,
} from '@accessforge/domain';
import {
  organizationId as orgId,
  userId as uid,
} from '@accessforge/domain';
import type {
  AuditRepository,
  EnvironmentRepository,
  EventRepository,
  MembershipRepository,
  OrganizationRepository,
  ProjectRepository,
  Repositories,
  SessionRepository,
  UserRepository,
  ProjectId,
  EnvironmentId,
} from './repositories.js';

const ROLES: readonly Role[] = [
  'OWNER', 'ADMIN', 'ACCESSIBILITY_ENGINEER', 'DEVELOPER', 'QA', 'VIEWER',
] as const;

function assertRole(value: unknown): Role {
  if (typeof value === 'string' && (ROLES as readonly string[]).includes(value)) {
    return value as Role;
  }
  throw new Error(`invalid role value: ${String(value)}`);
}

function parseUser(row: Record<string, unknown>): User {
  return {
    id: uid(asString(row.id)),
    email: asString(row.email),
    passwordHash: asString(row.password_hash),
    displayName: asString(row.display_name),
    status: row.status as 'ACTIVE' | 'SUSPENDED' | 'INVITED',
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

function parseOrg(row: Record<string, unknown>): Organization {
  return {
    id: orgId(asString(row.id)),
    name: asString(row.name),
    slug: asString(row.slug),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

function parseMembership(row: Record<string, unknown>): Membership {
  return {
    id: asString(row.id),
    organizationId: orgId(asString(row.organization_id)),
    userId: uid(asString(row.user_id)),
    role: assertRole(row.role),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

function parseSession(row: Record<string, unknown>): Session {
  return {
    id: asString(row.id),
    userId: uid(asString(row.user_id)),
    organizationId: row.organization_id ? orgId(asString(row.organization_id)) : null,
    role: row.role ? assertRole(row.role) : null,
    tokenHash: asString(row.token_hash),
    issuedAt: asDate(row.issued_at),
    expiresAt: asDate(row.expires_at),
    ip: asOptionalString(row.ip),
    userAgent: asOptionalString(row.user_agent),
    revokedAt: asOptionalDate(row.revoked_at),
  };
}

function parseAudit(row: Record<string, unknown>): AuditEvent {
  return {
    id: asString(row.id) as AuditEventId,
    organizationId: row.organization_id ? orgId(asString(row.organization_id)) : null,
    actorId: row.actor_id ? uid(asString(row.actor_id)) : null,
    action: asString(row.action),
    resourceType: asOptionalString(row.resource_type),
    resourceId: asOptionalString(row.resource_id),
    before: row.before_state ?? null,
    after: row.after_state ?? null,
    timestamp: asDate(row.timestamp),
    ip: asOptionalString(row.ip),
    correlationId: asString(row.correlation_id),
  };
}

function parseProject(row: Record<string, unknown>): Project {
  return {
    id: orgId(asString(row.id)) as unknown as Project['id'],
    organizationId: orgId(asString(row.organization_id)),
    name: asString(row.name),
    description: asOptionalString(row.description),
    baseUrl: asString(row.base_url),
    repositoryUrl: asOptionalString(row.repository_url),
    defaultBranch: asOptionalString(row.default_branch),
    status: asString(row.status) as 'ACTIVE' | 'ARCHIVED',
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

function parseEnvironment(row: Record<string, unknown>): Environment {
  return {
    id: orgId(asString(row.id)) as unknown as Environment['id'],
    organizationId: orgId(asString(row.organization_id)),
    projectId: orgId(asString(row.project_id)) as unknown as Project['id'],
    name: asString(row.name),
    baseUrl: asString(row.base_url),
    type: asString(row.type) as EnvironmentType,
    createdAt: asDate(row.created_at),
  };
}

class PgUserRepository implements UserRepository {
  constructor(private readonly pool: TypedPool) {}
  async findByEmail(email: string): Promise<User | null> {
    return this.pool.queryOne(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()],
      parseUser,
    );
  }
  async findById(id: UserId): Promise<User | null> {
    return this.pool.queryOne('SELECT * FROM users WHERE id = $1', [id], parseUser);
  }
  async insert(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  }): Promise<User> {
    const user = await this.pool.queryOne<User>(
      `INSERT INTO users (email, password_hash, display_name, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.email.toLowerCase(), input.passwordHash, input.displayName, input.status ?? 'ACTIVE'],
      parseUser,
    );
    if (!user) throw new Error('user insert returned no rows');
    return user;
  }
}

class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: TypedPool) {}
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.pool.queryOne(
      'SELECT * FROM organizations WHERE slug = $1',
      [slug],
      parseOrg,
    );
  }
  async findById(id: OrganizationId): Promise<Organization | null> {
    return this.pool.queryOne('SELECT * FROM organizations WHERE id = $1', [id], parseOrg);
  }
  async insert(input: { name: string; slug: string }): Promise<Organization> {
    const org = await this.pool.queryOne<Organization>(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *',
      [input.name, input.slug],
      parseOrg,
    );
    if (!org) throw new Error('organization insert returned no rows');
    return org;
  }
  async listForUser(userId: UserId): Promise<readonly (Organization & { role: Role })[]> {
    return this.pool.query(
      `SELECT o.*, m.role AS role
       FROM organizations o
       JOIN memberships m ON m.organization_id = o.id
       WHERE m.user_id = $1
       ORDER BY o.name`,
      [userId],
      (row) => ({ ...parseOrg(row), role: assertRole(row.role) }),
    );
  }
}

class PgMembershipRepository implements MembershipRepository {
  constructor(private readonly pool: TypedPool) {}
  async find(organizationId: OrganizationId, userId: UserId): Promise<Membership | null> {
    return this.pool.queryOne(
      `SELECT * FROM memberships WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId],
      parseMembership,
    );
  }
  async insert(input: {
    organizationId: OrganizationId;
    userId: UserId;
    role: Role;
  }): Promise<Membership> {
    const m = await this.pool.queryOne<Membership>(
      `INSERT INTO memberships (organization_id, user_id, role)
       VALUES ($1, $2, $3) RETURNING *`,
      [input.organizationId, input.userId, input.role],
      parseMembership,
    );
    if (!m) throw new Error('membership insert returned no rows');
    return m;
  }
  async listForUser(userId: UserId): Promise<readonly Membership[]> {
    return this.pool.query(
      'SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at',
      [userId],
      parseMembership,
    );
  }
}

class PgSessionRepository implements SessionRepository {
  constructor(private readonly pool: TypedPool) {}
  async insert(input: {
    userId: UserId;
    organizationId: OrganizationId | null;
    role: Role | null;
    tokenHash: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<Session> {
    const s = await this.pool.queryOne<Session>(
      `INSERT INTO sessions
         (user_id, organization_id, role, token_hash, expires_at, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        input.userId,
        input.organizationId,
        input.role,
        input.tokenHash,
        input.expiresAt,
        input.ip,
        input.userAgent,
      ],
      parseSession,
    );
    if (!s) throw new Error('session insert returned no rows');
    return s;
  }
  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.pool.queryOne(
      'SELECT * FROM sessions WHERE token_hash = $1',
      [tokenHash],
      parseSession,
    );
  }
  async revoke(id: string): Promise<void> {
    await this.pool.execute(
      'UPDATE sessions SET revoked_at = now() WHERE id = $1',
      [id],
    );
  }
  async revokeAllForUser(userId: UserId): Promise<number> {
    const res = await this.pool.execute(
      'UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
    return res.rowCount ?? 0;
  }
}

class PgAuditRepository implements AuditRepository {
  constructor(private readonly pool: TypedPool) {}
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
    const ev = await this.pool.queryOne<AuditEvent>(
      `INSERT INTO audit_events
         (organization_id, actor_id, action, resource_type, resource_id, before_state, after_state, ip, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        input.organizationId,
        input.actorId,
        input.action,
        input.resourceType,
        input.resourceId,
        JSON.stringify(input.before ?? null),
        JSON.stringify(input.after ?? null),
        input.ip,
        input.correlationId,
      ],
      parseAudit,
    );
    if (!ev) throw new Error('audit insert returned no rows');
    return ev;
  }
  async listForOrganization(organizationId: OrganizationId, limit: number): Promise<readonly AuditEvent[]> {
    return this.pool.query(
      'SELECT * FROM audit_events WHERE organization_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [organizationId, Math.min(limit, 200)],
      parseAudit,
    );
  }
}

class PgEventRepository implements EventRepository {
  constructor(private readonly pool: TypedPool) {}
  async insert<T extends EventType, P>(event: EventEnvelope<T, P>): Promise<void> {
    await this.pool.execute(
      `INSERT INTO events
         (id, organization_id, type, version, source, entity_id, correlation_id, causation_id, occurred_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.id,
        event.organizationId,
        event.type,
        event.version,
        event.source,
        event.entityId,
        event.correlationId,
        event.causationId,
        event.occurredAt,
        JSON.stringify(event.payload),
      ],
    );
  }
  async listForOrganization(organizationId: OrganizationId, limit: number): Promise<readonly EventEnvelope[]> {
    return this.pool.query(
      `SELECT * FROM events WHERE organization_id = $1 ORDER BY occurred_at DESC LIMIT $2`,
      [organizationId, Math.min(limit, 200)],
      (row) => ({
        id: asString(row.id) as EventEnvelope['id'],
        type: asString(row.type) as EventEnvelope['type'],
        version: asNumber(row.version) as 1,
        organizationId: orgId(asString(row.organization_id)),
        source: asString(row.source),
        entityId: asString(row.entity_id),
        correlationId: asString(row.correlation_id),
        causationId: asOptionalString(row.causation_id),
        occurredAt: asDate(row.occurred_at),
        payload: row.payload ?? {},
      }),
    );
  }
}

class PgProjectRepository implements ProjectRepository {
  constructor(private readonly pool: TypedPool) {}
  async insert(input: {
    organizationId: OrganizationId;
    name: string;
    description: string | null;
    baseUrl: string;
    repositoryUrl: string | null;
    defaultBranch: string | null;
  }): Promise<Project> {
    const p = await this.pool.queryOne<Project>(
      `INSERT INTO projects (organization_id, name, description, base_url, repository_url, default_branch)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        input.organizationId,
        input.name,
        input.description,
        input.baseUrl,
        input.repositoryUrl,
        input.defaultBranch,
      ],
      parseProject,
    );
    if (!p) throw new Error('project insert returned no rows');
    return p;
  }
  async findById(organizationId: OrganizationId, projectId: ProjectId): Promise<Project | null> {
    return this.pool.queryOne(
      'SELECT * FROM projects WHERE organization_id = $1 AND id = $2',
      [organizationId, projectId],
      parseProject,
    );
  }
  async listForOrganization(organizationId: OrganizationId): Promise<readonly Project[]> {
    return this.pool.query(
      'SELECT * FROM projects WHERE organization_id = $1 ORDER BY name',
      [organizationId],
      parseProject,
    );
  }
  async archive(organizationId: OrganizationId, projectId: ProjectId): Promise<void> {
    await this.pool.execute(
      `UPDATE projects SET status = 'ARCHIVED', updated_at = now()
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, projectId],
    );
  }
}

class PgEnvironmentRepository implements EnvironmentRepository {
  constructor(private readonly pool: TypedPool) {}
  async insert(input: {
    organizationId: OrganizationId;
    projectId: ProjectId;
    name: string;
    baseUrl: string;
    type: EnvironmentType;
  }): Promise<Environment> {
    const e = await this.pool.queryOne<Environment>(
      `INSERT INTO environments (organization_id, project_id, name, base_url, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.organizationId, input.projectId, input.name, input.baseUrl, input.type],
      parseEnvironment,
    );
    if (!e) throw new Error('environment insert returned no rows');
    return e;
  }
  async findById(organizationId: OrganizationId, environmentId: EnvironmentId): Promise<Environment | null> {
    return this.pool.queryOne(
      'SELECT * FROM environments WHERE organization_id = $1 AND id = $2',
      [organizationId, environmentId],
      parseEnvironment,
    );
  }
  async listForProject(organizationId: OrganizationId, projectId: ProjectId): Promise<readonly Environment[]> {
    return this.pool.query(
      'SELECT * FROM environments WHERE organization_id = $1 AND project_id = $2 ORDER BY name',
      [organizationId, projectId],
      parseEnvironment,
    );
  }
}

export function buildPgRepositories(pool: TypedPool): Repositories {
  return {
    users: new PgUserRepository(pool),
    organizations: new PgOrganizationRepository(pool),
    memberships: new PgMembershipRepository(pool),
    sessions: new PgSessionRepository(pool),
    audit: new PgAuditRepository(pool),
    events: new PgEventRepository(pool),
    projects: new PgProjectRepository(pool),
    environments: new PgEnvironmentRepository(pool),
    // Phase 2: scans, pages, pageSnapshots, rules, issues, journeys, journeySteps
    // are wired when the browser engine lands. The interfaces exist; the pg
    // implementations are intentionally not shipped yet to keep Phase 1 scope
    // honest (see IMPLEMENTATION_STATUS.md).
    scans: undefined as never,
    pages: undefined as never,
    pageSnapshots: undefined as never,
    rules: undefined as never,
    issues: undefined as never,
    journeys: undefined as never,
    journeySteps: undefined as never,
  };
}