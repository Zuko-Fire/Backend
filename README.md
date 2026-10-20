# SA — Система для кадастровых инженеров

## 📋 Описание

SA (Surveyor's Assistant) — это веб-система для кадастровых инженеров, предназначенная для управления земельными участками, проектами землеустройства и пространственными данными. Система обеспечивает автоматизированную работу с геопространственными данными, включая поддержку PostGIS для работы с полигонами и земельными участками.

## 🚀 Быстрый старт

### 1. Установка Docker

Убедитесь, что Docker установлен:
```bash
docker --version
```

### 2. Запуск системы

```bash
# Сборка и запуск всех сервисов
docker compose up --build -d

# Проверка статуса
docker compose ps
```

### 3. Доступ к сервисам

| Сервис | URL | Описание |
|--------|-----|----------|
| **API** | `http://localhost:4000` | Backend API |
| **Swagger** | `http://localhost:4000/api` | Интерактивная документация API |
| **pgAdmin** | `http://localhost:5050` | Управление базой данных |

### 4. Первичная настройка

Создайте административного пользователя:
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "name": "Admin",
    "password": "admin123"
  }'
```

## 🔐 Авторизация

### Регистрация
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "Иван Иванов",
    "password": "securepassword123"
  }'
```

### Вход
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Ответ содержит JWT токен доступа:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Иванов"
  }
}
```

### Использование токена

Все защищённые эндпоинты требуют передачи токена в заголовке:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Основные сущности

### 1. Проекты

Проект — это контейнер для всех данных, связанных с землеустроительной работой.

**Создать проект:**
```bash
curl -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Межевание участка №1",
    "description": "Проект межевания земельного участка"
  }'
```

**Получить мои проекты:**
```bash
curl http://localhost:4000/projects/my \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Получить проекты, где вы участник:**
```bash
curl http://localhost:4000/projects/member \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Полигоны

Полигон — это географическая граница проекта, представленная в формате GeoJSON.

**Создать полигон:**
```bash
curl -X POST http://localhost:4000/projects/1/polygons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Граница участка",
    "coordinates": {
      "type": "Polygon",
      "coordinates": [
        [
          [37.6173, 55.7558],
          [37.62, 55.7558],
          [37.62, 55.76],
          [37.6173, 55.76],
          [37.6173, 55.7558]
        ]
      ]
    }
  }'
```

**Поиск полигонов рядом с точкой:**
```bash
curl "http://localhost:4000/projects/polygons/search/near?lat=55.7558&lon=37.6173&radius=1000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Земельные участки

Земельный участок — это детальная информация о конкретном участке земли.

**Создать земельный участок:**
```bash
curl -X POST http://localhost:4000/projects/land-plots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cadastral_number": "77:01:0001001:123",
    "area": 1500.5,
    "land_category": "Земли населённых пунктов",
    "permitted_use": "Для жилищного строительства",
    "address": "г. Москва, ул. Примерная, д. 1",
    "status": "active",
    "registration_date": "2024-01-15"
  }'
```

**Поиск по кадастровому номеру:**
```bash
curl "http://localhost:4000/projects/land-plots?cadastral_number=77:01:0001001:123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Участники проекта

Добавьте коллег к проекту для совместной работы:

**Добавить участника:**
```bash
curl -X POST http://localhost:4000/projects/1/members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "role": "editor"
  }'
```

Роли участников:
- `viewer` — только просмотр
- `editor` — просмотр и редактирование
- `admin` — полный доступ

### 5. Виды карты

Сохраняйте виды карты для быстрого доступа к важным областям:

**Сохранить вид карты:**
```bash
curl -X POST http://localhost:4000/projects/1/map-views \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 55.7558,
    "lon": 37.6173,
    "zoom": 12
  }'
```

### 6. Документы

Загружайте документы, связанные с проектом:

**Загрузить документ:**
```bash
curl -X POST http://localhost:4000/projects/1/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Акт межевания.pdf",
    "type": "assignment",
    "filePath": "/uploads/act_mezhevaniya.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf"
  }'
```

### 7. Справочные данные

Система содержит справочники для стандартных данных:

**Категории земель:**
```bash
curl http://localhost:4000/reference/land-categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Виды разрешенного использования:**
```bash
curl http://localhost:4000/reference/permitted-uses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Типы межевых знаков:**
```bash
curl http://localhost:4000/reference/marker-types \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Нормативы точности:**
```bash
curl http://localhost:4000/reference/precision-standards \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗺️ Работа с картами

Система поддерживает работу с геопространственными данными через PostGIS:

1. **Создайте проект** — это ваш рабочий контейнер
2. **Добавьте полигон** — нарисуйте границы участка в формате GeoJSON
3. **Создайте земельный участок** — заполните кадастровые данные
4. **Сохраните вид карты** — зафиксируйте важное местоположение

## 🔍 Поиск и фильтрация

- **По кадастровому номеру:** `GET /projects/land-plots?cadastral_number=77:01:0001001:123`
- **По координатам:** `GET /projects/polygons/search/near?lat=55.7558&lon=37.6173&radius=1000`
- **По области:** `GET /projects/polygons/search/intersects?minLat=55.75&maxLat=55.76&minLon=37.61&maxLon=37.62`

## 🛠️ Администрирование

### Управление проектами

- **Создание:** `POST /projects`
- **Обновление:** `PUT /projects/:id`
- **Удаление:** `DELETE /projects/:id`
- **Копирование:** `POST /projects/:id/copy`

### Управление статусами

Проекты имеют жизненный цикл:
- `draft` — черновик
- `in_review` — на проверке
- `approved` — утверждён
- `returned` — возвращён на доработку

```bash
curl -X PUT http://localhost:4000/projects/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review"}'
```

## 🐳 Развёртывание

### Переменные окружения

Создайте `.env` файл:
```env
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=sa
JWT_SECRET=your_secret_key
PORT=4000
```

### Сборка и запуск

```bash
# Сборка
docker compose build

# Запуск
docker compose up -d

# Остановка
docker compose down

# Перезапуск
docker compose restart
```

## 📱 API документация

Полная интерактивная документация доступна по адресу:
**http://localhost:4000/api**

Здесь вы можете:
- Просматривать все доступные эндпоинты
- Тестировать запросы прямо в браузере
- Изучать структуру данных

## 🔒 Безопасность

- JWT аутентификация с refresh токенами
- Ролевой доступ к проектам
- Валидация всех входных данных
- Защита от SQL-инъекций через TypeORM

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker compose logs backend`
2. Убедитесь, что все сервисы запущены: `docker compose ps`
3. Проверьте доступность API: `curl http://localhost:4000/`

## 📝 Лицензия

Проект разработан для кадастровых инженеров с целью автоматизации работы с пространственными данными.
