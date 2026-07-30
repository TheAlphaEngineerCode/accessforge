-- AccessForge — initial schema (Phase 0 + Phase 1 additions)
--
-- Conventions:
--   * All tenant-scoped tables carry `organization_id UUID NOT NULL` with a FK to
--     `organizations` and an index. The application layer rejects queries missing
--     this predicate (ADR-0005).
--   * All timestamps use `TIMESTAMPTZ` at UTC, default `now()`.
--   * Identity columns use UUIDv4 via `gen_random_uuid()`.
--   * IDs from app code are inserted explicitly; default is fallback for tests.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────── Organizations ─────────────────────────────────────

CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX organizations_slug_idx ON organizations(slug);

-- ───────────────────────── Users ────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_email_idx ON users(email);

-- ───────────────────────── Memberships (tenant boundary) ───────────────────

CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL
                  CHECK (role IN (
                    'OWNER', 'ADMIN', 'ACCESSIBILITY_ENGINEER',
                    'DEVELOPER', 'QA', 'VIEWER'
                  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX memberships_user_id_idx ON memberships(user_id);
CREATE INDEX memberships_organization_id_idx ON memberships(organization_id);

-- ───────────────────────── Sessions ─────────────────────────────────────────

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role            TEXT,
  token_hash      TEXT NOT NULL UNIQUE,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  ip              TEXT,
  user_agent      TEXT,
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_token_hash_idx ON sessions(token_hash);

-- ───────────────────────── Audit events (append-only) ───────────────────────

CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  before_state    JSONB,
  after_state     JSONB,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip              TEXT,
  correlation_id  TEXT NOT NULL
);

CREATE INDEX audit_events_org_idx    ON audit_events(organization_id, timestamp DESC);
CREATE INDEX audit_events_actor_idx  ON audit_events(actor_id, timestamp DESC);
CREATE INDEX audit_events_corrid_idx ON audit_events(correlation_id);

-- ───────────────────────── Event log (internal bus persistence) ─────────────

CREATE TABLE events (
  id              UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  type            TEXT NOT NULL,
  version         INT NOT NULL,
  source          TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  correlation_id  TEXT NOT NULL,
  causation_id    TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL,
  payload         JSONB NOT NULL
);

CREATE INDEX events_org_type_idx     ON events(organization_id, type, occurred_at DESC);
CREATE INDEX events_correlation_idx  ON events(correlation_id);

-- ───────────────────────── Projects ─────────────────────────────────────────

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  description     TEXT,
  base_url        TEXT NOT NULL,
  repository_url  TEXT,
  default_branch  TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX projects_org_idx ON projects(organization_id, name);

-- ───────────────────────── Environments ─────────────────────────────────────

CREATE TABLE environments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  base_url        TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('LOCAL','PREVIEW','DEVELOPMENT','STAGING','PRODUCTION')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX environments_org_idx     ON environments(organization_id, project_id);
CREATE INDEX environments_project_idx ON environments(project_id, name);

-- ───────────────────────── Scans ────────────────────────────────────────────

CREATE TABLE scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_id  UUID REFERENCES environments(id) ON DELETE SET NULL,
  scan_type       TEXT NOT NULL
                  CHECK (scan_type IN ('PAGE','SITE','JOURNEY','REGRESSION','CI')),
  status          TEXT NOT NULL DEFAULT 'QUEUED'
                  CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  trigger         TEXT,
  commit_sha      TEXT,
  branch          TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scans_org_project_idx ON scans(organization_id, project_id, created_at DESC);
CREATE INDEX scans_org_status_idx  ON scans(organization_id, status);

-- ───────────────────────── Pages ────────────────────────────────────────────

CREATE TABLE pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  title           TEXT,
  route           TEXT,
  last_scanned_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, url)
);

CREATE INDEX pages_org_project_idx ON pages(organization_id, project_id, url);

-- ───────────────────────── Page snapshots ───────────────────────────────────

CREATE TABLE page_snapshots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  page_id                UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  scan_id                UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  dom_snapshot_url       TEXT,
  accessibility_tree_url TEXT,
  screenshot_url         TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX page_snapshots_org_scan_idx ON page_snapshots(organization_id, scan_id);

-- ───────────────────────── Rules ────────────────────────────────────────────

CREATE TABLE rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL
                  CHECK (category IN (
                    'SEMANTICS','KEYBOARD','FOCUS','FORMS','ARIA','COLOR',
                    'NAVIGATION','IMAGES','HEADINGS','LANDMARKS','TABLES',
                    'DYNAMIC_CONTENT','MEDIA','RESPONSIVE'
                  )),
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL
                  CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  wcag_references TEXT[] NOT NULL DEFAULT '{}',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  engine          TEXT NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX rules_org_category_idx ON rules(organization_id, category);

-- ───────────────────────── Issues ───────────────────────────────────────────

CREATE TABLE issues (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  scan_id          UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id          UUID REFERENCES pages(id) ON DELETE SET NULL,
  journey_id       UUID,
  journey_step_id  UUID,
  rule_id          UUID REFERENCES rules(id) ON DELETE SET NULL,
  category         TEXT NOT NULL,
  severity         TEXT NOT NULL,
  impact           TEXT NOT NULL
                   CHECK (impact IN ('MINOR','MODERATE','SERIOUS','CRITICAL')),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  selector         TEXT,
  html_snippet     TEXT,
  accessible_name  TEXT,
  expected         TEXT,
  actual           TEXT,
  wcag_references  TEXT[] NOT NULL DEFAULT '{}',
  evidence         JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'OPEN'
                   CHECK (status IN ('OPEN','ACKNOWLEDGED','ACCEPTED_RISK','RESOLVED','FALSE_POSITIVE')),
  fingerprint      TEXT NOT NULL,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX issues_org_scan_idx      ON issues(organization_id, scan_id);
CREATE INDEX issues_org_status_idx    ON issues(organization_id, status);
CREATE INDEX issues_org_project_idx   ON issues(organization_id, project_id, status);
CREATE INDEX issues_fingerprint_idx   ON issues(organization_id, fingerprint);

-- ───────────────────────── Journeys ─────────────────────────────────────────

CREATE TABLE journeys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  start_url       TEXT NOT NULL,
  priority        INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX journeys_org_project_idx ON journeys(organization_id, project_id, name);

-- ───────────────────────── Journey steps ────────────────────────────────────

CREATE TABLE journey_steps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  journey_id       UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  step_order       INT NOT NULL,
  name             TEXT NOT NULL,
  action_type      TEXT NOT NULL
                   CHECK (action_type IN (
                     'NAVIGATE','CLICK','TYPE','PRESS_KEY','SELECT',
                     'CHECK','UPLOAD','WAIT','ASSERT'
                   )),
  target           JSONB NOT NULL,
  input            JSONB NOT NULL DEFAULT '{}',
  expected_outcome JSONB,
  timeout          INT,
  UNIQUE (journey_id, step_order)
);

CREATE INDEX journey_steps_org_journey_idx ON journey_steps(organization_id, journey_id, step_order);

-- ───────────────────────── Baselines ────────────────────────────────────────

CREATE TABLE baselines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scan_id         UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX baselines_org_project_idx ON baselines(organization_id, project_id, name);

-- ───────────────────────── Regressions ──────────────────────────────────────

CREATE TABLE regressions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  baseline_id      UUID NOT NULL REFERENCES baselines(id) ON DELETE CASCADE,
  scan_id          UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  issue_fingerprint TEXT NOT NULL,
  kind             TEXT NOT NULL
                   CHECK (kind IN ('NEW','UNCHANGED','RESOLVED','REGRESSED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (baseline_id, scan_id, issue_fingerprint)
);

CREATE INDEX regressions_org_baseline_idx ON regressions(organization_id, baseline_id, scan_id);

-- ───────────────────────── Policies ─────────────────────────────────────────

CREATE TABLE policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  config          JSONB NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX policies_org_idx ON policies(organization_id, project_id);

-- ───────────────────────── Migrations ledger ───────────────────────────────

CREATE TABLE schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);