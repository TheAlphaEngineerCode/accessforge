/**
 * Project routes — list/create/archive projects, nested environments.
 *
 * Projects are the root of the accessibility monitoring tree. Environments live
 * under projects and hold the actual target `baseUrl` that the browser engine
 * will eventually scan (Phase 2).
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AppDeps } from './context.js';
import { BadRequest, Forbidden } from './context.js';
import { requirePermission } from './rbac.js';
import type { Repositories } from '../db/repositories.js';
import type { ProjectId } from '@accessforge/domain';
import { projectId as parseProjectId } from '@accessforge/domain';

const createProjectBody = (body: unknown) => {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' && b.name.trim().length > 0 ? b.name.trim() : null;
  const baseUrl = typeof b.baseUrl === 'string' && b.baseUrl.length > 0 ? b.baseUrl : null;
  if (!name || !baseUrl) return null;
  return {
    name,
    description: typeof b.description === 'string' ? b.description : null,
    baseUrl,
    repositoryUrl: typeof b.repositoryUrl === 'string' ? b.repositoryUrl : null,
    defaultBranch: typeof b.defaultBranch === 'string' ? b.defaultBranch : null,
  };
};

const createEnvironmentBody = (body: unknown) => {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' && b.name.trim().length > 0 ? b.name.trim() : null;
  const baseUrl = typeof b.baseUrl === 'string' && b.baseUrl.length > 0 ? b.baseUrl : null;
  const type = typeof b.type === 'string' ? b.type.toUpperCase() : null;
  const allowed = ['LOCAL', 'PREVIEW', 'DEVELOPMENT', 'STAGING', 'PRODUCTION'];
  if (!name || !baseUrl || !type || !allowed.includes(type)) return null;
  return {
    name,
    baseUrl,
    type: type as 'LOCAL' | 'PREVIEW' | 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION',
  };
};

export interface ProjectRoutesDeps {
  readonly deps: AppDeps;
  readonly repos: Repositories;
}

/** Read and validate the `:projectId` path param; 400 on anything that is not a UUID. */
function projectIdParam(request: FastifyRequest): ProjectId {
  const params = request.params as Record<string, unknown>;
  const raw = params['projectId'];
  if (typeof raw !== 'string' || raw.length === 0) throw new BadRequest('invalid projectId');
  try {
    return parseProjectId(raw);
  } catch {
    throw new BadRequest('invalid projectId');
  }
}

export function projectRoutes(opts: ProjectRoutesDeps): (app: FastifyInstance) => void {
  const { repos } = opts;
  return (app) => {
    app.get(
      '/projects',
      { preHandler: [requirePermission('project.read')] },
      async (request, reply) => {
        const orgId = request.auth.tenant!.organizationId;
        const projects = await repos.projects.listForOrganization(orgId);
        return reply.code(200).send({ projects });
      },
    );

    app.post(
      '/projects',
      { preHandler: [requirePermission('project.write')] },
      async (request, reply) => {
        const body = createProjectBody(request.body);
        if (!body) throw new BadRequest('invalid payload');
        const orgId = request.auth.tenant!.organizationId;
        const project = await repos.projects.insert({
          organizationId: orgId,
          name: body.name,
          description: body.description,
          baseUrl: body.baseUrl,
          repositoryUrl: body.repositoryUrl,
          defaultBranch: body.defaultBranch,
        });
        request.auditPatch = {
          action: 'project.created',
          resourceType: 'project',
          resourceId: project.id,
          after: { name: project.name, baseUrl: project.baseUrl },
        };
        return reply.code(201).send({ project });
      },
    );

    app.get(
      '/projects/:projectId',
      { preHandler: [requirePermission('project.read')] },
      async (request, reply) => {
        const orgId = request.auth.tenant!.organizationId;
        const projectId = projectIdParam(request);
        const project = await repos.projects.findById(orgId, projectId);
        if (!project) throw new Forbidden('project not found');
        return reply.code(200).send({ project });
      },
    );

    app.get(
      '/projects/:projectId/environments',
      { preHandler: [requirePermission('project.read')] },
      async (request, reply) => {
        const orgId = request.auth.tenant!.organizationId;
        const projectId = projectIdParam(request);
        const environments = await repos.environments.listForProject(orgId, projectId);
        return reply.code(200).send({ environments });
      },
    );

    app.post(
      '/projects/:projectId/environments',
      { preHandler: [requirePermission('project.write')] },
      async (request, reply) => {
        const body = createEnvironmentBody(request.body);
        if (!body) throw new BadRequest('invalid payload');
        const orgId = request.auth.tenant!.organizationId;
        const projectId = projectIdParam(request);
        const environment = await repos.environments.insert({
          organizationId: orgId,
          projectId,
          name: body.name,
          baseUrl: body.baseUrl,
          type: body.type,
        });
        request.auditPatch = {
          action: 'environment.created',
          resourceType: 'environment',
          resourceId: environment.id,
          after: { name: environment.name, baseUrl: environment.baseUrl, type: environment.type },
        };
        return reply.code(201).send({ environment });
      },
    );
  };
}
