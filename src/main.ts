import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { BodyValidationPipe } from './common/pipes/body-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SA server API')
    .setDescription('SA API')
    .setVersion('1.0')
    .addTag('Projects', 'Управление проектами')
    .addTag('Polygons', 'Геометрия и полигоны (PostGIS)')
    .addTag('LandPlots', 'Земельные участки')
    .addTag('Project Members', 'Участники проектов')
    .addTag('Map Views', 'Сохранённые виды карты')
    .addTag('SA')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Global filters and interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Cookie parser
  app.use(cookieParser());

  // Only validate body DTOs, skip query/param/user validation
  app.useGlobalPipes(new BodyValidationPipe());

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });
}
bootstrap();
