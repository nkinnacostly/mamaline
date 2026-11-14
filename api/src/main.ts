import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Lets PrismaService close its connections when the host stops or redeploys the app.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
// Not awaited: on Vercel, listen() is taken over by the platform and its promise may never
// settle, and an awaited top-level promise would stop the module from finishing loading.
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
