import { z } from 'zod';

const uuid = z.string().uuid();

export const idParams = z.object({ id: uuid });

export const presignedUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
});
export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
