/**
 * Seed the demo organization and a sysadmin user, plus the three demo projects the
 * AccessForge spec requires (`Accessible Store`, `Broken Commerce`, `SaaS Dashboard`).
 * Used by `make db-seed` and the demo scenarios.
 */
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '@accessforge/auth';
import type { TypedPool } from '@accessforge/database';

const SEED_ORG_NAME = 'AccessForge Labs';
const SEED_ORG_SLUG = 'accessforge-labs';
const SEED_USER_EMAIL = 'demo@accessforge.test';
const SEED_DISPLAY_NAME = 'Demo Operator';
const SEED_USER_PASSWORD = 'AccessForge-Demo-12345!';

const DEMO_PROJECTS = [
  {
    name: 'Accessible Store',
    description: 'Demo e-commerce application with intentional accessibility best practices — used for regression-detection baselines.',
    baseUrl: 'https://accessible-store.accessforge.test',
    repositoryUrl: 'https://github.com/TheAlphaEngineerCode/accessforge/tree/main/examples/accessible-store',
    defaultBranch: 'main',
  },
  {
    name: 'Broken Commerce',
    description: 'Demo commerce application with intentional accessibility violations — unlabeled forms, broken focus order, inaccessible modals — for journey and rule testing.',
    baseUrl: 'https://broken-commerce.accessforge.test',
    repositoryUrl: 'https://github.com/TheAlphaEngineerCode/accessforge/tree/main/examples/broken-commerce',
    defaultBranch: 'main',
  },
  {
    name: 'SaaS Dashboard',
    description: 'Internal dashboard application used for dashboard-specific accessibility rules (tables, dynamic content, live regions).',
    baseUrl: 'https://saas-dashboard.accessforge.test',
    repositoryUrl: 'https://github.com/TheAlphaEngineerCode/accessforge/tree/main/examples/saas-dashboard',
    defaultBranch: 'main',
  },
] as const;

const DEMO_ENVIRONMENTS = [
  { name: 'local', baseUrl: 'http://localhost:3000', type: 'LOCAL' as const },
  { name: 'staging', baseUrl: 'https://staging.accessforge.test', type: 'STAGING' as const },
  { name: 'production', baseUrl: 'https://prod.accessforge.test', type: 'PRODUCTION' as const },
] as const;

export interface SeedResult {
  readonly organizationId: string;
  readonly userId: string;
  readonly projectIds: ReadonlyArray<string>;
  readonly adminEmail: string;
  readonly adminPassword: string;
}

export async function seedDemo(pool: TypedPool): Promise<SeedResult> {
  const orgId = randomUUID();
  const userId = randomUUID();
  const passwordHash = await hashPassword(SEED_USER_PASSWORD);

  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM organizations WHERE slug = $1',
    [SEED_ORG_SLUG],
    (r) => ({ id: String(r.id) }),
  );
  if (existing.length > 0) {
    const existingProjects = await pool.query<{ id: string }>(
      'SELECT id FROM projects WHERE organization_id = $1',
      [existing[0]!.id],
      (r) => ({ id: String(r.id) }),
    );
    return {
      organizationId: existing[0]!.id,
      userId,
      projectIds: existingProjects.map((p) => p.id),
      adminEmail: SEED_USER_EMAIL,
      adminPassword: SEED_USER_PASSWORD,
    };
  }

  const projectIds: string[] = [];
  await pool.transaction(async (tx) => {
    await tx.execute(
      `INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)`,
      [orgId, SEED_ORG_NAME, SEED_ORG_SLUG],
    );
    await tx.execute(
      `INSERT INTO users (id, email, password_hash, display_name, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')`,
      [userId, SEED_USER_EMAIL, passwordHash, SEED_DISPLAY_NAME],
    );
    await tx.execute(
      `INSERT INTO memberships (organization_id, user_id, role)
       VALUES ($1, $2, 'OWNER')`,
      [orgId, userId],
    );

    for (const project of DEMO_PROJECTS) {
      const projectId = randomUUID();
      projectIds.push(projectId);
      await tx.execute(
        `INSERT INTO projects (id, organization_id, name, description, base_url, repository_url, default_branch)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          projectId,
          orgId,
          project.name,
          project.description,
          project.baseUrl,
          project.repositoryUrl,
          project.defaultBranch,
        ],
      );
      for (const env of DEMO_ENVIRONMENTS) {
        await tx.execute(
          `INSERT INTO environments (id, organization_id, project_id, name, base_url, type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), orgId, projectId, env.name, env.baseUrl, env.type],
        );
      }
    }
  });

  return {
    organizationId: orgId,
    userId,
    projectIds,
    adminEmail: SEED_USER_EMAIL,
    adminPassword: SEED_USER_PASSWORD,
  };
}

async function main() {
  const { loadEnv } = await import('@accessforge/config');
  const { initPool } = await import('./pool.js');
  const { applyMigrations } = await import('./migrate.js');
  const env = loadEnv();
  const pool = initPool(env);
  try {
    await applyMigrations(pool);
    const result = await seedDemo(pool);
    // eslint-disable-next-line no-console
    console.log('[accessforge] seed done:', {
      organizationId: result.organizationId,
      adminEmail: result.adminEmail,
      adminPassword: '(hidden — check `.env` for the value)',
      projects: result.projectIds.length,
    });
  } finally {
    await pool.close();
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error('seed failed:', err);
    process.exitCode = 1;
  });
}