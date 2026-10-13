import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from '../src/libs/interceptor/Logging.interceptor';
import {graphqlUploadExpress} from "graphql-upload"
import * as express from "express"
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { CSRF_HEADER_NAME } from './components/auth/auth-cookie.util';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

const parseCorsOrigins = (): string[] | boolean => {
  const raw = process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN;
  if (!raw) return process.env.NODE_ENV === 'production' ? [] : true;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.useGlobalPipes(new ValidationPipe())
  app.useGlobalInterceptors(new LoggingInterceptor())
  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      CSRF_HEADER_NAME,
      'x-xsrf-token',
      'apollo-require-preflight',
      'x-apollo-operation-name',
    ],
    exposedHeaders: [CSRF_HEADER_NAME],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  })
  app.use(cookieParser())

  app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }))
  app.use("/uploads", express.static('./uploads'))

  // In production the API process also serves the compiled React application.
  // This keeps the public deployment to one local origin/port and avoids a
  // separate Vite preview process. The directory can be overridden for a
  // different deployment layout, while PM2 sets it explicitly for ROOMi.
  const frontendDist = path.resolve(
    process.env.FRONTEND_DIST_DIR ?? path.resolve(process.cwd(), '../frontend/dist'),
  );
  const frontendIndex = path.join(frontendDist, 'index.html');
  if (existsSync(frontendIndex)) {
    app.use(express.static(frontendDist, { fallthrough: true }));
    app.use((request, response, next) => {
      const acceptsHtml = request.headers.accept?.includes('text/html');
      const isApiPath = /^\/(?:graphql|csrf(?:-token)?|uploads(?:\/|$)|socket\.io(?:\/|$)|healthz(?:\/|$))/.test(request.path);

      if (request.method !== 'GET' || !acceptsHtml || isApiPath) {
        next();
        return;
      }

      response.sendFile(frontendIndex);
    });
  }

  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT_API ?? 3008);
  console.log('ROOMI-API PORT:', process.env.PORT_API ?? 3008);

  
}
bootstrap();
