# Этап 1: Сборка
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем зависимости
COPY package*.json ./

# Устанавливаем ВСЁ (включая devDependencies для сборки)
RUN yarn install --frozen-lockfile && yarn cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN yarn build


# Этап 2: Запуск
FROM node:22-alpine AS runner

WORKDIR /app

# Устанавливаем зависимости ОТ ROOT (пока есть права)
COPY --from=builder /app/package*.json ./
RUN yarn install --production --frozen-lockfile && yarn cache clean --force

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# Создаём пользователя и передаём владение
RUN addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nestjs -G nodejs \
    && chown -R nestjs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]