import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { mediaController } from '../controllers/media.controller';
import { idParams, presignedUploadSchema } from '../validators/media.validators';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const mediaRouter = Router();

// Identity is injected by the gateway; every route requires an authenticated user.
mediaRouter.use(requireUser);

mediaRouter.post('/upload', upload.single('file'), asyncHandler(mediaController.upload));
mediaRouter.post(
  '/upload/presigned',
  validate({ body: presignedUploadSchema }),
  asyncHandler(mediaController.presigned),
);
mediaRouter.get('/:id', validate({ params: idParams }), asyncHandler(mediaController.get));
mediaRouter.delete('/:id', validate({ params: idParams }), asyncHandler(mediaController.remove));
