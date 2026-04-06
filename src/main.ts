import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 8091;

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api');

  // Swagger Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Loan Management API')
    .setDescription(
      `## 🏦 Loan Management System API

A comprehensive loan management API built for Cambodian microfinance institutions.

### Modules
- **Authentication** — JWT login, token-based route protection, profile endpoint
- **User Management** — CRUD with role-based access (Admin, Director, Manager, Loan Officer, Teller, Customer)
- **Loan Products** — Configure loan types, interest rates (flat/declining), terms, and currencies (USD/KHR)
- **Loan Applications** — Submit requests, upload documents, multi-level approval workflow
- **Repayment Schedules** — Generate EMI or balloon payment schedules with grace periods
- **Disbursements** — Cash or bank transfer with partial disbursement support
- **Repayments & Collection** — Record payments, early repayment, PAR 30/60/90 overdue tracking

### Authentication
All endpoints require a valid JWT Bearer token unless marked as public.
Use \`POST /api/auth/login\` to obtain a token.

### Approval Workflow
\`DRAFT → SUBMITTED → UNDER_REVIEW → OFFICER_APPROVED → MANAGER_APPROVED → APPROVED → DISBURSED → CLOSED\`
`,
    )
    .setVersion('1.0.0')
    .addBearerAuth();

  // Add server URLs based on environment
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    swaggerConfig.addServer(
      `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
      'Production',
    );
  }
  swaggerConfig.addServer(`http://localhost:${port}`, 'Local Development');

  const document = SwaggerModule.createDocument(app, swaggerConfig.build());
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Loan API — Swagger',
    customCss: `.swagger-ui .topbar { display: none }`,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Loan API is running on port: ${port}`);
  console.log(`📚 Swagger docs: /api/docs`);
}
bootstrap();

