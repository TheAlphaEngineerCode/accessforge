/**
 * Project + environment route tests — CRUD happy paths plus the path-param
 * validation regression: a malformed `:projectId` must answer 400, never 500.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildTestApp, register, type TestApp } from '../helpers/app.js';

describe('project routes', () => {
  let t: TestApp;
  let cookie: string;

  beforeEach(async () => {
    t = await buildTestApp();
    const session = await register(t.app, {
      email: 'projects@accessforge.test',
      password: 'S3cur3-Forge-Proj-XX',
      displayName: 'Project Owner',
      orgName: 'Project Org',
      orgSlug: 'project-org',
    });
    cookie = session.cookie;
  });

  afterEach(async () => {
    await t.close();
  });

  async function createProject(): Promise<{ id: string; name: string }> {
    const res = await t.app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie },
      payload: { name: 'Demo Store', baseUrl: 'https://store.example.test' },
    });
    expect(res.statusCode).toBe(201);
    return (JSON.parse(res.body) as { project: { id: string; name: string } }).project;
  }

  it('creates and lists projects for the active tenant', async () => {
    const project = await createProject();
    const res = await t.app.inject({ method: 'GET', url: '/projects', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { projects: ReadonlyArray<{ id: string }> };
    expect(body.projects.map((p) => p.id)).toContain(project.id);
  });

  it('fetches a project by id', async () => {
    const project = await createProject();
    const res = await t.app.inject({
      method: 'GET',
      url: `/projects/${project.id}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { project: { name: string } }).project.name).toBe('Demo Store');
  });

  it('answers 400 — not 500 — for a malformed projectId', async () => {
    for (const bad of ['not-a-uuid', '123', 'null']) {
      const res = await t.app.inject({
        method: 'GET',
        url: `/projects/${bad}`,
        headers: { cookie },
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('creates and lists environments under a project', async () => {
    const project = await createProject();
    const create = await t.app.inject({
      method: 'POST',
      url: `/projects/${project.id}/environments`,
      headers: { cookie },
      payload: { name: 'staging', baseUrl: 'https://staging.example.test', type: 'staging' },
    });
    expect(create.statusCode).toBe(201);

    const list = await t.app.inject({
      method: 'GET',
      url: `/projects/${project.id}/environments`,
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    const body = JSON.parse(list.body) as { environments: ReadonlyArray<{ type: string }> };
    expect(body.environments).toHaveLength(1);
    expect(body.environments[0]!.type).toBe('STAGING');
  });

  it('rejects unauthenticated project access', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/projects' });
    expect(res.statusCode).toBe(401);
  });
});
