# Этап 1: Сборка
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем зависимости
COPY package*.json ./

# Устанавливаем ВСЁ (включая devDependencies для сборки и миграций)
RUN yarn install --frozen-lockfile && yarn cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN yarn build

# Этап 2: Запуск
FROM node:22-alpine AS runner

WORKDIR /app

# Устанавливаем зависимости (нужны для typeorm CLI)
COPY --from=builder /app/package*.json ./
RUN yarn install --production --frozen-lockfile && yarn cache clean --force

# Копируем собранный код (включая миграции!)
COPY --from=builder /app/dist ./dist

# Копируем data-source.ts для миграций
COPY --from=builder /app/src/data-source.ts ./dist/data-source.js

# Копируем скрипт миграций
COPY --from=builder /app/dist/migrate.js ./dist/migrate.js

# Создаём пользователя
RUN addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nestjs -G nodejs \
    && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3000

# ⚠️ Сначала миграции, потом приложение
CMD ["sh", "-c", "node dist/migrate.js && node dist/main.js"]