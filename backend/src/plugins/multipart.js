import multipart from '@fastify/multipart';

export async function registerMultipart(fastify) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    }
  });
}

