import { z } from 'zod';

const uuid = z.string().uuid();
const isoDate = z.coerce.date();

// ─── Profile ───────────────────────────────────────────────
export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    headline: z.string().trim().max(220).nullable(),
    summary: z.string().trim().max(5000).nullable(),
    location: z.string().trim().max(120).nullable(),
    website: z.string().url().max(255).nullable(),
    industry: z.string().trim().max(120).nullable(),
    isOpenToWork: z.boolean(),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateAvatarSchema = z.object({ avatarUrl: z.string().url().max(512) });
export const updateBannerSchema = z.object({ bannerUrl: z.string().url().max(512) });

export const profileIdParams = z.object({ id: uuid });
export const profileScopedParams = z.object({ profileId: uuid });

// ─── Experience ────────────────────────────────────────────
export const createExperienceSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    company: z.string().trim().min(1).max(150),
    companyLogo: z.string().url().max(512).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
    isCurrent: z.boolean().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => v.isCurrent || !v.endDate || v.endDate >= v.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;

export const updateExperienceSchema = createExperienceSchema;
export const idParams = z.object({ id: uuid });

// ─── Education ─────────────────────────────────────────────
const currentYear = new Date().getUTCFullYear();
export const createEducationSchema = z
  .object({
    school: z.string().trim().min(1).max(150),
    degree: z.string().trim().max(150).nullable().optional(),
    fieldOfStudy: z.string().trim().max(150).nullable().optional(),
    startYear: z.coerce.number().int().min(1900).max(currentYear + 10),
    endYear: z.coerce.number().int().min(1900).max(currentYear + 10).nullable().optional(),
    grade: z.string().trim().max(60).nullable().optional(),
    activities: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.endYear == null || v.endYear >= v.startYear, {
    message: 'endYear must be on or after startYear',
    path: ['endYear'],
  });
export type CreateEducationInput = z.infer<typeof createEducationSchema>;
export const updateEducationSchema = createEducationSchema;

// ─── Skills ────────────────────────────────────────────────
export const addSkillSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(100).nullable().optional(),
});
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export const skillIdParams = z.object({ skillId: uuid });
export const endorseParams = z.object({ profileId: uuid, skillId: uuid });

// ─── Certifications ────────────────────────────────────────
export const createCertificationSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    issuingOrg: z.string().trim().min(1).max(200),
    issueDate: isoDate,
    expirationDate: isoDate.nullable().optional(),
    credentialId: z.string().trim().max(150).nullable().optional(),
    credentialUrl: z.string().url().max(512).nullable().optional(),
  })
  .refine((v) => v.expirationDate == null || v.expirationDate >= v.issueDate, {
    message: 'expirationDate must be on or after issueDate',
    path: ['expirationDate'],
  });
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
