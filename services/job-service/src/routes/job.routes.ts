import { Router } from 'express';
import { asyncHandler, validate, requireUser, requireRole } from '@linkedin-clone/shared';
import { jobController } from '../controllers/job.controller';
import { applicationController } from '../controllers/application.controller';
import { companyController } from '../controllers/company.controller';
import {
  createJobSchema,
  updateJobSchema,
  listJobsQuery,
  applyBody,
  updateStatusBody,
  createCompanySchema,
  updateCompanySchema,
  listCompaniesQuery,
  idParams,
  slugParams,
  appIdParams,
} from '../validators/job.validators';

export const jobRouter = Router();

// Identity is injected by the gateway; every route requires an authenticated user.
jobRouter.use(requireUser);

// ─── Companies (static prefix — register before /:id) ──────
jobRouter.get('/companies', validate({ query: listCompaniesQuery }), asyncHandler(companyController.list));
jobRouter.post('/companies', validate({ body: createCompanySchema }), asyncHandler(companyController.create));
jobRouter.put('/companies/:id', validate({ params: idParams, body: updateCompanySchema }), asyncHandler(companyController.update));
jobRouter.get('/companies/:slug', validate({ params: slugParams }), asyncHandler(companyController.getBySlug));

// ─── Application status (two-segment literal before /:id) ──
jobRouter.put(
  '/applications/:appId/status',
  validate({ params: appIdParams, body: updateStatusBody }),
  asyncHandler(applicationController.updateStatus),
);

// ─── Current user's lists (literal /me before /:id) ────────
jobRouter.get('/me/applications', asyncHandler(applicationController.listMine));
jobRouter.get('/me/saved', asyncHandler(applicationController.listSaved));

// ─── Jobs ──────────────────────────────────────────────────
jobRouter.get('/', validate({ query: listJobsQuery }), asyncHandler(jobController.list));
jobRouter.post('/', requireRole('RECRUITER', 'ADMIN'), validate({ body: createJobSchema }), asyncHandler(jobController.create));
jobRouter.get('/:id', validate({ params: idParams }), asyncHandler(jobController.getById));
jobRouter.put('/:id', validate({ params: idParams, body: updateJobSchema }), asyncHandler(jobController.update));
jobRouter.delete('/:id', validate({ params: idParams }), asyncHandler(jobController.remove));

// ─── Applications on a job ─────────────────────────────────
jobRouter.post('/:id/apply', validate({ params: idParams, body: applyBody }), asyncHandler(applicationController.apply));
jobRouter.get('/:id/applications', validate({ params: idParams }), asyncHandler(applicationController.listForJob));

// ─── Saved jobs ────────────────────────────────────────────
jobRouter.post('/:id/save', validate({ params: idParams }), asyncHandler(applicationController.save));
jobRouter.delete('/:id/save', validate({ params: idParams }), asyncHandler(applicationController.unsave));
