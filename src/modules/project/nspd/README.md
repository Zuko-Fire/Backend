# NSPD API — Справочник эндпоинтов

Базовый URL: `http://localhost:4000/projects/nspd`

Без авторизации.

---

## 1. Слои

### `GET /projects/nspd/layers`

Получить список всех доступных слоёв НСПД.

**Ответ:**
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

**Где использовать:** Первый шаг перед поиском — узнать доступные слои и их IDs.

---

### `GET /projects/nspd/layers/:layerId`

Получить информацию о конкретном слое.

**Параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| layerId | number | ID слоя (узнать из `/layers`) |

**Ответ:** объект `NSPDLayerConfig` или `404`, если слой не найден.

---

### `GET /projects/nspd/layers/:layerId/legend`

Получить SVG-легенду слоя (визуальное описание символов).

**Параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| layerId | number | ID слоя |

**Ответ:** SVG-файл (`Content-Type: image/svg+xml`).

---

## 2. Карты (WMS)

### `GET /projects/nspd/map/url`

Получить URL WMS-запроса для загрузки карты. Не скачивает изображение — только строит URL.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|-----------|------|-------------|----------|
| layerId | number | Да | ID слоя (из `/layers`) |
| minLng | number | Да | Минимальная долгота |
| minLat | number | Да | Минимальная широта |
| maxLng | number | Да | Максимальная долгота |
| maxLat | number | Да | Максимальная широта |
| width | number | Нет | Ширина изображения (по умолч. 1024) |
| height | number | Нет | Высота изображения (по умолч. 1024) |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/map/url?layerId=36048&minLng=37.6&minLat=55.7&maxLng=37.7&maxLat=55.8"
```

**Ответ:**
```json
{
  "url": "https://nspd.gov.ru/api/aeggis/v3/36048/wms?REQUEST=GetMap&..."
}
```

---

### `GET /projects/nspd/map`

Загрузить WMS-карту как PNG-изображение.

**Параметры:** те же, что и у `/map/url`.

**Ответ:** PNG-файл (`Content-Type: image/png`).

**Где использовать:** Отображение карты на фронтенде.

---

## 3. Конвертация координат

### `GET /projects/nspd/coords/convert`

Конвертация между EPSG:4326 (широта/долгота) и EPSG:3857 (Web Mercator).

**Параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| lat | number | Широта (EPSG:4326) |
| lng | number | Долгота (EPSG:4326) |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/coords/convert?lat=55.7558&lng=37.6173"
```

**Ответ:**
```json
{
  "input": { "lat": 55.7558, "lng": 37.6173 },
  "webMercator": { "x": 4189501.23, "y": 7368345.67 },
  "backToLatLon": { "lat": 55.7558, "lng": 37.6173 }
}
```

**Где использовать:** Для построения BBOX в формате EPSG:3857 при запросе WMS-карт.

---

## 4. Поиск объектов

### `GET /projects/nspd/search`

Поиск объектов по текстовому запросу (кадастровый номер, адрес и т.д.).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| query | string | Да | Кадастровый номер или адрес |
| themeId | number | Нет | Тема поиска (по умолч. 1 — объекты недвижимости) |

**ThemeId значения:**
| Значение | Описание |
|----------|----------|
| 1 | Объекты недвижимости (по умолч.) |
| 2 | Кадастровое деление |
| 4 | Административно-территориальное деление |
| 5 | Зоны и территории |
| 7 | Территориальные зоны |
| 15 | Комплексы объектов |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/search?query=77:01:0010015:1234"
```

**Ответ:**
```json
[
  {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[37.6, 55.7], [37.7, 55.7], [37.7, 55.8], [37.6, 55.8], [37.6, 55.7]]]
    },
    "properties": {
      "category": 36048,
      "categoryName": "Земельные участки из ЕГРН",
      "cad_num": "77:01:0010015:1234",
      "area": 1000.5,
      "addr": "г. Москва, ул. Примерная, д. 1"
    },
    "layerMeta": { ... }
  }
]
```

---

### `GET /projects/nspd/search/layer`

Поиск в конкретном слое.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| query | string | Да | Кадастровый номер или адрес |
| layerId | number | Да | ID слоя (из `/layers`) |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/search/layer?query=77:01:0010015:1234&layerId=36048"
```

**Ответ:** массив `NspdFeature[]` (как у `/search`).

---

### `GET /projects/nspd/search/at-point`

Поиск объектов по координатам точки (WMS GetFeatureInfo).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| lat | number | Да | Широта точки |
| lng | number | Да | Долгота точки |
| layerId | number | Да | ID слоя |

**Пример:**
```bash
curl "http://localhost:4000/projects/nspd/search/at-point?lat=55.7558&lng=37.6173&layerId=36048"
```

**Ответ:** массив объектов, найденных в точке.

**Где использовать:** Клик по карте — получить объекты в точке клика.

---

### `POST /projects/nspd/search/contour`

Поиск объектов внутри полигона (контура).

**Query параметр:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| layerIds | string | Комma-separated IDs слоёв (напр. `"36048,36049"`) |

**Body (JSON):**
```json
{
  "coordinates": [
    [
      [37.6, 55.7],
      [37.7, 55.7],
      [37.7, 55.8],
      [37.6, 55.8],
      [37.6, 55.7]
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
      [37.6, 55.7],
      [37.7, 55.7],
      [37.7, 55.8],
      [37.6, 55.8],
      [37.6, 55.7]
    ]]
  }'
```

**Ответ:** массив `NspdFeature[]` — все объекты внутри контура.

**Где использовать:** Поиск всех земельных участков в заданном контуре (например, граница проекта).

---

## 5. Данные вкладок (Tab Data)

Данные вкладок объекта НСПД. Требуют `geomId` — идентификатор геометрии объекта.

**Где взять `geomId`:** В ответе на поиск (`/search`, `/search/at-point`) в `properties` объекта есть поле `geomId` или `id`.

---

### `GET /projects/nspd/tab/land-parts/:geomId`

Данные вкладки **"Части ЗУ"** — подучастки земельного участка.

**Параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| geomId | number | ID геометрии объекта (из ответа поиска) |

**Ответ:** `string[] | null` — список кадастровых номеров частей.

---

### `GET /projects/nspd/tab/land-links/:geomId`

Данные вкладки **"Связанные ЗУ"** — связанные земельные участки.

**Ответ:** `string[] | null` — список кадастровых номеров.

---

### `GET /projects/nspd/tab/permission-type/:geomId`

Данные вкладки **"Виды разрешенного использования"**.

**Ответ:** `string[] | null` — список видов разрешённого использования.

---

### `GET /projects/nspd/tab/composition-land/:geomId`

Данные вкладки **"Состав ЕЗП"** — единый недвижимый комплекс.

**Ответ:** `string[] | null` — список объектов в составе ЕЗП.

---

### `GET /projects/nspd/tab/build-parts/:geomId`

Данные вкладки **"Части ОКС"** — части объекта капитального строительства.

**Ответ:** `string[] | null` — список частей ОКС.

---

### `GET /projects/nspd/tab/objects`

Данные вкладки **"Объекты"** для объектов без координат.

**Параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| objdocId | number | ID документа объекта |
| registersId | number | ID регистра |

**Ответ:**
```json
{
  "Регистр 1": ["кад_номер_1", "кад_номер_2"],
  "Регистр 2": ["кад_номер_3"]
}
```

---

## 6. Кэш

### `GET /projects/nspd/cache/stats`

Статистика кэша.

**Ответ:**
```json
{
  "layers": 12,
  "legends": 5,
  "http": 3600000,
  "ttlMs": 3600000
}
```

---

### `POST /projects/nspd/cache/clear`

Очистить все кэши.

**Ответ:**
```json
{ "message": "NSPD cache cleared" }
```

---

## Справочник слоёв (Layer IDs)

| ID | Название | Тип геометрии |
|----|----------|---------------|
| 36048 | Земельные участки из ЕГРН | Polygon |
| 36049 | Здания | Polygon |
| 36328 | Сооружения | Polygon |
| 36329 | Объекты незавершённого строительства | Polygon |
| 36070 | Кадастровые районы | Polygon |
| 36071 | Кадастровые округа | Polygon |
| 855413 | Кадастровые кварталы | Polygon |
| 875845 | Зоны с особыми условиями | Polygon |
| 879243 | Красные линии | Polygon |

Полный актуальный список — через `GET /projects/nspd/layers`.

---

## Типичные сценарии

### 1. Найти участок по кадастровому номеру
```bash
curl "http://localhost:4000/projects/nspd/search?query=77:01:0010015:1234"
```

### 2. Показать все участки в границах проекта
```bash
# 1. Получить границы проекта (из БД)
# 2. Поиск в контуре
curl -X POST "http://localhost:4000/projects/nspd/search/contour?layerIds=36048" \
  -H "Content-Type: application/json" \
  -d '{"coordinates": [[[...]]]}'
```

### 3. Клик по карте — узнать объекты в точке
```bash
curl "http://localhost:4000/projects/nspd/search/at-point?lat=55.7558&lng=37.6173&layerId=36048"
```

### 4. Показать карту участка
```bash
curl "http://localhost:4000/projects/nspd/map?layerId=36048&minLng=37.6&minLat=55.7&maxLng=37.7&maxLat=55.8&width=800&height=600" \
  -o map.png
```

### 5. Узнать детали участка (вкладки)
```bash
# geomId берём из ответа поиска
curl "http://localhost:4000/projects/nspd/tab/land-parts/12345"
curl "http://localhost:4000/projects/nspd/tab/permission-type/12345"
```
