import { FastifyInstance } from 'fastify';
import { CropRequestSchema } from '../types';
import { fetchImage, FetchError } from '../utils/fetchImage';
import { processAvatar } from '../services/cropper';

export default async function cropRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/crop', async (request, reply) => {
    // 1. Validate Input (Zod)
    const result = CropRequestSchema.safeParse(request.body);
    if (!result.success) {
      // Chỉ chấp nhận 256/512, sai trả 400
      return reply.code(400).send({ 
        error: 'Invalid input', 
        details: result.error.format() 
      });
    }

    const { image_url, size, format } = result.data;

    try {
      // 2. Fetch Image (Check SSRF, Timeout, Size)
      const imageBuffer = await fetchImage(image_url);

      // 3. Process Image
      const output = await processAvatar({
        buffer: imageBuffer,
        size,
        format
      });

      return reply.send(output);

    } catch (error: any) {
      request.log.error(error);

      // Map error code chuẩn
      if (error instanceof FetchError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      
      if (error.message === 'IMAGE_PROCESSING_FAILED') {
        return reply.code(422).send({ error: 'Cannot process this image file' });
      }

      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}