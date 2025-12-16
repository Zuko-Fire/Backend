# backend/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем только зависимости
COPY package.json yarn.lock ./

# Устанавливаем только production-зависимости (важно!)
RUN yarn install --production --frozen-lockfile

# Копируем исходники
COPY . .

# Собираем приложение
RUN yarn build

# === Production stage ===
FROM node:22-alpine

WORKDIR /app

# Устанавливаем только production-зависимости
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Копируем собранный бандл
COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/main"]