# NSPD API — Тестовые данные и примеры

Базовый URL: `http://localhost:4000/projects/nspd`

---

## 1. Слои

### GET /projects/nspd/layers

**Пример:**
```bash
curl http://localhost:4000/projects/nspd/layers
```

**Ответ:** массив слоёв (64 шт.)
```json
[
  {
    "id": 36048,
    "name": "Земельные участки из ЕГРН",
    "enabled": true,
    "description": "Границы земельных участков из ЕГРН",
    "layerMeta": {
      "title": "Земельные участки из ЕГРН",
      "layerTreeId": 36048,
      "layerId": 36048,
      "layerType": "wms",
      "geometryType": "Polygon",
      "layerName": "36048",
      "layerVisibleByDefault": true,
      "categoryId": 36048
    }
  }
]
```

---

### GET /projects/nspd/layers/:layerId

**Тестовые layerId:**
| ID | Название |
|----|----------|
| 36048 | Земельные участки из ЕГРН |
| 36049 | Здания |
| 36071 | Кадастровые округа |
| 875845 | Зоны с особыми условиями |
| 875831 | Населённые пункты (полигоны) |

**Пример:**
```bash
curl http://localhost:4000/projects/nspd/layers/36048
```

---

### GET /projects/nspd/layers/:layerId/legend

**Пример:**
```bash
curl -o legend.svg http://localhost:4000/projects/nspd/layers/36048/legend
```

---

## 2. Поиск

### GET /projects/nspd/search

**Тестовые query:**
| Query | Описание |
|-------|----------|
| `54:19:112001:20894` | Кадастровый номер (ЕГРН) |
| `test` | Тестовый запрос |

**Тестовые themeId:**
| ID | Описание |
|----|----------|
| 1 | Объекты недвижимости (по умолч.) |
| 2 | Кадастровое деление |
| 4 | Административно-территориальное деление |
| 5 | Зоны и территории |

**Примеры:**
```bash
# Поиск по кадастровому номеру
curl "http://localhost:4000/projects/nspd/search?query=54:19:112001:20894"

# Поиск с указанием темы
curl "http://localhost:4000/projects/nspd/search?query=test&themeId=2"
```

---

### GET /projects/nspd/search/layer

**Тестовые данные:**
| Query | layerId | Описание |
|-------|---------|----------|
| `test` | 36048 | Поиск в Земельных участках |
| `test` | 36049 | Поиск в Зданиях |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/search/layer?query=test&layerId=36048"
```

---

### GET /projects/nspd/search/at-point

**Тестовые координаты (Москва):**
| lat | lng | Описание |
|-----|-----|----------|
| 55.7558 | 37.6173 | Красная площадь |
| 55.7522 | 37.6156 | ГУМ |

**Тестовые layerId:**
| ID | Описание |
|----|----------|
| 36048 | Земельные участки |
| 36049 | Здания |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/search/at-point?lat=55.7558&lng=37.6173&layerId=36048"
```

---

### POST /projects/nspd/search/contour

**Тестовый контур (Красная площадь, Москва):**
```json
{
  "coordinates": [
    [
      [37.6140, 55.7530],
      [37.6240, 55.7530],
      [37.6240, 55.7570],
      [37.6140, 55.7570],
      [37.6140, 55.7530]
    ]
  ],
  "onlyIntersects": false
}
```

**Пример:**
```bash
curl -X POST "http://localhost:4000/projects/nspd/search/contour?layerIds=36048" \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [[
      [37.6140, 55.7530],
      [37.6240, 55.7530],
      [37.6240, 55.7570],
      [37.6140, 55.7570],
      [37.6140, 55.7530]
    ]]
  }'
```

---

## 3. Данные вкладок

**Важно:** `geomId` берётся из ответа поиска. Для тестовых примеров используются реальные geomId из ответа поиска по `54:19:112001:20894`.

### GET /projects/nspd/tab/land-parts/:geomId

**Тестовые geomId:**
| geomId | categoryId | Описание |
|--------|------------|----------|
| 734211049 | 36368 | Части ЗУ (ЕГРН) |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/tab/land-parts/734211049?categoryId=36368"
```

**Ответ:**
```json
["54:19:112001:20894/1", "54:19:112001:20894/2"]
```

---

### GET /projects/nspd/tab/land-links/:geomId

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/tab/land-links/734211049?categoryId=36368"
```

---

### GET /projects/nspd/tab/permission-type/:geomId

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/tab/permission-type/734211049?categoryId=36368"
```

---

### GET /projects/nspd/tab/composition-land/:geomId

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/tab/composition-land/734211049?categoryId=36368"
```

---

### GET /projects/nspd/tab/build-parts/:geomId

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/tab/build-parts/734211049?categoryId=36368"
```

---

### GET /projects/nspd/tab/objects

**Тестовые данные:**
| objdocId | registersId | Описание |
|----------|-------------|----------|
| 1 | 2 | Тестовые объекты |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/tab/objects?objdocId=1&registersId=2"
```

---

## 4. Конвертация координат

**Тестовые координаты:**
| lat | lng | Описание |
|-----|-----|----------|
| 55.7558 | 37.6173 | Красная площадь, Москва |
| 59.9343 | 30.3351 | Исаакиевский собор, СПб |
| 56.8389 | 60.6057 | Екатеринбург |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/coords/convert?lat=55.7558&lng=37.6173"
```

**Ответ:**
```json
{
  "lat": 55.7558,
  "lon": 37.6173,
  "x": 4187538.68,
  "y": -70888.981
}
```

---

## 5. Кэш

### GET /projects/nspd/cache/stats

**Пример:**
```bash
curl http://localhost:4000/projects/nspd/cache/stats
```

**Ответ:**
```json
{
  "layers": {
    "count": 0,
    "ttlMs": 3600000
  },
  "legends": {
    "count": 0,
    "ttlMs": 3600000
  }
}
```

---

### POST /projects/nspd/cache/clear

**Пример:**
```bash
curl -X POST http://localhost:4000/projects/nspd/cache/clear
```

**Ответ:**
```json
{ "message": "Кэш НСПД очищен" }
```

---

## Полный сценарий тестирования

### 1. Найти участок по кадастровому номеру
```bash
curl "http://localhost:4000/projects/nspd/search?query=54:19:112001:20894"
```

### 2. Получить данные вкладок найденного участка
```bash
# geomId = 734211049 (из ответа поиска выше)
curl "http://localhost:4000/projects/nspd/tab/land-parts/734211049?categoryId=36368"
curl "http://localhost:4000/projects/nspd/tab/land-links/734211049?categoryId=36368"
curl "http://localhost:4000/projects/nspd/tab/permission-type/734211049?categoryId=36368"
```

### 3. Поиск объектов в точке (клик по карте)
```bash
curl "http://localhost:4000/projects/nspd/search/at-point?lat=55.7558&lng=37.6173&layerId=36048"
```

### 4. Поиск объектов в контуре
```bash
curl -X POST "http://localhost:4000/projects/nspd/search/contour?layerIds=36048" \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [[
      [37.6140, 55.7530],
      [37.6240, 55.7530],
      [37.6240, 55.7570],
      [37.6140, 55.7570],
      [37.6140, 55.7530]
    ]]
  }'
```

### 5. Конвертация координат
```bash
curl "http://localhost:4000/projects/nspd/coords/convert?lat=55.7558&lng=37.6173"
```

### 6. Проверка кэша
```bash
curl http://localhost:4000/projects/nspd/cache/stats
```
