import Fastify from 'fastify';
import cropRoutes from './routes/crop';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 10485760 // 10MB JSON body limit (để chứa URL dài nếu cần, không phải ảnh)
});

// Healthcheck
server.get('/health', async () => {
  return {
    ok: true,
    service: 'avatar-cropper',
    version: '1.0.0'
  };
});

// Register Routes
server.register(cropRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();