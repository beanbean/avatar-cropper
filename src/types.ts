import { z } from 'zod';

export const CropRequestSchema = z.object({
  image_url: z.string().url(),
  size: z.union([z.literal(256), z.literal(512)]).optional().default(256),
  format: z.enum(['png', 'jpeg']).optional().default('png'),
});

export type CropRequest = z.infer<typeof CropRequestSchema>;

export interface CropResponse {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  image_base64: string;
}