import { Router } from 'express';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { profileController } from '../controllers/profile.controller';
import { experienceController } from '../controllers/experience.controller';
import { educationController } from '../controllers/education.controller';
import { skillController } from '../controllers/skill.controller';
import { certificationController } from '../controllers/certification.controller';
import {
  updateProfileSchema,
  updateAvatarSchema,
  updateBannerSchema,
  profileIdParams,
  createExperienceSchema,
  updateExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  createCertificationSchema,
  addSkillSchema,
  skillIdParams,
  endorseParams,
  idParams,
} from '../validators/user.validators';

export const userRouter = Router();

// Every route requires an authenticated user (identity injected by the gateway).
userRouter.use(requireUser);

// ─── Own profile ───────────────────────────────────────────
userRouter.get('/me', asyncHandler(profileController.getMe));
userRouter.put('/me', validate({ body: updateProfileSchema }), asyncHandler(profileController.updateMe));
userRouter.patch('/me/avatar', validate({ body: updateAvatarSchema }), asyncHandler(profileController.updateAvatar));
userRouter.patch('/me/banner', validate({ body: updateBannerSchema }), asyncHandler(profileController.updateBanner));

// ─── Experience ────────────────────────────────────────────
userRouter.get('/me/experience', asyncHandler(experienceController.list));
userRouter.post('/me/experience', validate({ body: createExperienceSchema }), asyncHandler(experienceController.create));
userRouter.put(
  '/me/experience/:id',
  validate({ params: idParams, body: updateExperienceSchema }),
  asyncHandler(experienceController.update),
);
userRouter.delete('/me/experience/:id', validate({ params: idParams }), asyncHandler(experienceController.remove));

// ─── Education ─────────────────────────────────────────────
userRouter.get('/me/education', asyncHandler(educationController.list));
userRouter.post('/me/education', validate({ body: createEducationSchema }), asyncHandler(educationController.create));
userRouter.put(
  '/me/education/:id',
  validate({ params: idParams, body: updateEducationSchema }),
  asyncHandler(educationController.update),
);
userRouter.delete('/me/education/:id', validate({ params: idParams }), asyncHandler(educationController.remove));

// ─── Skills ────────────────────────────────────────────────
userRouter.get('/me/skills', asyncHandler(skillController.list));
userRouter.post('/me/skills', validate({ body: addSkillSchema }), asyncHandler(skillController.add));
userRouter.delete('/me/skills/:skillId', validate({ params: skillIdParams }), asyncHandler(skillController.remove));

// ─── Certifications ────────────────────────────────────────
userRouter.get('/me/certifications', asyncHandler(certificationController.list));
userRouter.post(
  '/me/certifications',
  validate({ body: createCertificationSchema }),
  asyncHandler(certificationController.create),
);
userRouter.delete('/me/certifications/:id', validate({ params: idParams }), asyncHandler(certificationController.remove));

// ─── Endorse another user's skill ──────────────────────────
userRouter.post(
  '/:profileId/skills/:skillId/endorse',
  validate({ params: endorseParams }),
  asyncHandler(skillController.endorse),
);

// ─── Public profile (keep last so /me and other literals win) ──
userRouter.get('/:id', validate({ params: profileIdParams }), asyncHandler(profileController.getById));
