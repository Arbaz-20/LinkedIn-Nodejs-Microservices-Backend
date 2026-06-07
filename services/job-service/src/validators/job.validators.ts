import { z } from 'zod';

const uuid = z.string().uuid();

const locationType = z.enum(['ONSITE', 'REMOTE', 'HYBRID']);
const employmentType = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']);
const experienceLevel = z.enum(['ENTRY', 'ASSOCIATE', 'MID_SENIOR', 'DIRECTOR', 'EXECUTIVE']);
const applicationStatus = z.enum([
  'SUBMITTED',
  'REVIEWED',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
  'WITHDRAWN',
]);

// ─── Params ────────────────────────────────────────────────
export const idParams = z.object({ id: uuid });
export const slugParams = z.object({ slug: z.string().trim().min(1).max(160) });
export const appIdParams = z.object({ appId: uuid });

// ─── Jobs ──────────────────────────────────────────────────
export const createJobSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  location: z.string().trim().max(200).nullable().optional(),
  locationType: locationType.optional(),
  employmentType,
  experienceLevel,
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  salaryCurrency: z.string().trim().max(8).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).optional(),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1),
    location: z.string().trim().max(200).nullable(),
    locationType,
    employmentType,
    experienceLevel,
    salaryMin: z.number().int().nonnegative().nullable(),
    salaryMax: z.number().int().nonnegative().nullable(),
    salaryCurrency: z.string().trim().max(8),
    skills: z.array(z.string().trim().min(1).max(80)),
    isActive: z.boolean(),
  })
  .partial();
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const listJobsQuery = z.object({
  q: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  employmentType: employmentType.optional(),
  experienceLevel: experienceLevel.optional(),
  locationType: locationType.optional(),
  companyId: uuid.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// ─── Applications ──────────────────────────────────────────
export const applyBody = z.object({
  resumeUrl: z.string().trim().url().max(2048).nullable().optional(),
  coverLetter: z.string().trim().max(10000).nullable().optional(),
});
export type ApplyInput = z.infer<typeof applyBody>;

export const updateStatusBody = z.object({ status: applicationStatus });
export type UpdateStatusInput = z.infer<typeof updateStatusBody>;

// ─── Companies ─────────────────────────────────────────────
export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(160).optional(),
  logoUrl: z.string().trim().url().max(2048).nullable().optional(),
  bannerUrl: z.string().trim().url().max(2048).nullable().optional(),
  website: z.string().trim().url().max(2048).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  size: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    logoUrl: z.string().trim().url().max(2048).nullable(),
    bannerUrl: z.string().trim().url().max(2048).nullable(),
    website: z.string().trim().url().max(2048).nullable(),
    industry: z.string().trim().max(120).nullable(),
    size: z.string().trim().max(60).nullable(),
    description: z.string().trim().max(20000).nullable(),
    location: z.string().trim().max(200).nullable(),
    foundedYear: z.number().int().min(1800).max(2100).nullable(),
  })
  .partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const listCompaniesQuery = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
