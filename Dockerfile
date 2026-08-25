# Этап 1: Сборка
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем зависимости
COPY package*.json yarn.lock* ./

# Устанавливаем ВСЁ (включая devDependencies для сборки и миграций)
RUN yarn install --frozen-lockfile && yarn cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN yarn build

# Этап 2: Запуск
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Копируем package.json для production-зависимостей
COPY --from=builder /app/package*.json /app/yarn.lock* ./
RUN yarn install --production --frozen-lockfile && yarn cache clean --force

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# ✅ ИСПРАВЛЕНИЕ: Используем RUN с условием вместо COPY с bash-хаками
# Если файл существует в src, копируем его в dist (для TypeORM миграций)
RUN if [ -f /app/src/data-source.ts ]; then \
    cp /app/src/data-source.ts ./dist/data-source.js; \
    fi

# Создаём непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nestjs -G nodejs \
    && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 4000

# Сначала миграции, потом приложение
CMD ["sh", "-c", "node dist/migrate.js && node dist/main.js"]