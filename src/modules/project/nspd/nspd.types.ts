// src/modules/project/nspd/nspd.types.ts
// TypeScript-типы для работы с НСПД (вдохновлено pynspd library)

// ==================== Geometry Types ====================

export type GeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoJSONMultiPoint {
  type: 'MultiPoint';
  coordinates: [number, number][];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [ring]
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][]; // [polygon, ring]
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONMultiPoint
  | GeoJSONLineString
  | GeoJSONMultiLineString
  | GeoJSONPolygon
  | GeoJSONMultiPolygon;

export interface GeoJSONFeature<
  T extends GeoJSONGeometry = GeoJSONGeometry,
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'Feature';
  geometry: T;
  properties: P;
}

export interface GeoJSONFeatureCollection<
  T extends GeoJSONGeometry = GeoJSONGeometry,
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<T, P>[];
}

// ==================== Layer Configuration ====================

export interface LayerNode {
  title: string;
  layerTreeId: number;
  layerId: number;
  layerType: 'wms';
  geometryType: 'Polygon' | 'LineString' | 'Point' | 'GeometryCollection';
  layerName: string;
  layerVisibleByDefault: boolean;
  categoryId: number;
}

export interface NSPDLayerConfig {
  id: number;
  name: string;
  enabled: boolean;
  description?: string;
  layerMeta?: LayerNode;
}

// ==================== Theme IDs ====================

export enum ThemeId {
  REAL_ESTATE_OBJECTS = 1,
  CADASTRAL_DIVISION = 2,
  ADMINISTRATIVE_TERRITORIAL_DIVISION = 4,
  ZONES_AND_TERRITORIES = 5,
  TERRITORIAL_ZONES = 7,
  COMPLEXES_OF_OBJECTS = 15,
}

// ==================== Tab Titles ====================

export type TabTitle =
  | 'Части ЗУ'
  | 'Связанные ЗУ'
  | 'Виды разрешенного использования'
  | 'Состав ЕЗП'
  | 'Части ОКС'
  | 'Объекты';

// ==================== System Info ====================

export interface SystemInfoProperties {
  updateDate?: string | null;
  creationDate?: string | null;
  stateStatus?: string | null;
  statusCode?: number | null;
  averagePrice?: number | null;
  floorIndex?: number | null;
  [key: string]: unknown;
}

// ==================== NspdProperties ====================

export interface NspdProperties {
  category: number;
  categoryName: string;
  systemInfo?: SystemInfoProperties | null;
  cadastralDistrictsCode?: number | null;
  descr?: string | null;
  externalKey?: string | null;
  interactionId?: number | null;
  label?: string | null;
  subcategory?: number | null;
  score?: number | null;
  [key: string]: unknown;
}

// ==================== NspdFeature ====================

export interface NspdFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: NspdProperties & Record<string, unknown>;
  layerMeta?: LayerNode;
}

// ==================== Layer-specific Option Properties ====================

/**
 * Base option properties for all layer types.
 */
export interface BaseOptionProperties {
  titleKey?: string | null;
  noCoords?: boolean;
  objdocId?: number | null;
  registersId?: number | null;
  [key: string]: unknown;
}

/**
 * Land plot options (categoryId: 36048)
 */
export interface LandPlotOptions extends BaseOptionProperties {
  cad_num?: string | null;
  ogr?: string | null;
  okato?: string | null;
  okogu?: string | null;
  area?: number | null;
  area_quoted?: boolean;
  addr?: string | null;
  form_ownership?: string | null;
  purpose?: string | null;
  permitted_type?: string | null;
  set_area?: number | null;
  permitted_use?: string | null;
  cat_total?: number | null;
  [key: string]: unknown;
}

/**
 * Building options (categoryId: 36049)
 */
export interface BuildingOptions extends BaseOptionProperties {
  cad_num?: string | null;
  ogr?: string | null;
  okato?: string | null;
  okogu?: string | null;
  area?: number | null;
  area_quoted?: boolean;
  addr?: string | null;
  floor_index?: number | null;
  construction?: string | null;
  state_status?: string | null;
  permitted_use?: string | null;
  [key: string]: unknown;
}

/**
 * Structure options (categoryId: 36328)
 */
export interface StructureOptions extends BaseOptionProperties {
  cad_num?: string | null;
  ogr?: string | null;
  okato?: string | null;
  okogu?: string | null;
  area?: number | null;
  area_quoted?: boolean;
  addr?: string | null;
  [key: string]: unknown;
}

/**
 * Incomplete construction options (categoryId: 36329)
 */
export interface IncompleteConstructionOptions extends BaseOptionProperties {
  cad_num?: string | null;
  ogr?: string | null;
  okato?: string | null;
  okogu?: string | null;
  area?: number | null;
  area_quoted?: boolean;
  addr?: string | null;
  [key: string]: unknown;
}

/**
 * Cadastral district options (categoryId: 36070, 36071, 855413)
 */
export interface CadastralDistrictOptions extends BaseOptionProperties {
  cad_num?: string | null;
  area?: number | null;
  [key: string]: unknown;
}

/**
 * ZOUIT / special zone options
 */
export interface ZoneOptions extends BaseOptionProperties {
  cad_num?: string | null;
  area?: number | null;
  zone_type?: string | null;
  zone_name?: string | null;
  [key: string]: unknown;
}

/**
 * Generic options for layers without specific property types
 */
export type GenericOptions = BaseOptionProperties;

/**
 * Union of all option property types
 */
export type NspdLayerOptions =
  | LandPlotOptions
  | BuildingOptions
  | StructureOptions
  | IncompleteConstructionOptions
  | CadastralDistrictOptions
  | ZoneOptions
  | GenericOptions;

// ==================== Search Responses ====================

export interface NSPDSearchMeta {
  totalCount: number;
  categoryId: number;
}

export interface NSPDSearchResponse {
  data: GeoJSONFeatureCollection<GeoJSONGeometry, NspdProperties>;
  meta: NSPDSearchMeta[];
}

export interface NSPDBadResponse {
  code: number;
  message: string;
  requestId: string;
}

// ==================== Tab Data Responses ====================

export interface NSPDTabGroupResponse {
  title: string;
  tabs: NSPDTabResponse[];
}

export interface NSPDTabResponse {
  title: string;
  data: Record<string, string | string[] | null>;
}

// ==================== WMS Parameters ====================

export interface WMSGetFeatureInfoParams {
  REQUEST: 'GetFeatureInfo';
  SERVICE: 'WMS';
  VERSION: '1.3.0';
  QUERY_LAYERS: string;
  LAYERS: string;
  INFO_FORMAT: string;
  FEATURE_COUNT: number;
  I: number; // X pixel coordinate
  J: number; // Y pixel coordinate
  WIDTH: number;
  HEIGHT: number;
  X: number; // X coordinate (lat for WMS 1.3.0)
  Y: number; // Y coordinate (lon for WMS 1.3.0)
  SRS?: string;
  CRS?: string; // WMS 1.3.0 uses CRS instead of SRS
  TRANSPARENT: boolean;
  EXCEPTIONS: string;
}

export interface WMSGetMapParams {
  REQUEST: 'GetMap';
  SERVICE: 'WMS';
  VERSION: '1.3.0';
  LAYERS: string;
  STYLES: string;
  SRS: string;
  BBOX: string;
  WIDTH: number;
  HEIGHT: number;
  FORMAT: string;
  TRANSPARENT: boolean;
}

// ==================== Intersect (Contour) Search ====================

export interface NSPDIntersectCategory {
  categories: number[];
  geom: GeoJSONFeatureCollection;
}

export interface NSPDIntersectRequest {
  typeIntersect: 'fullObject';
  categories: NSPDIntersectCategory[];
}

// ==================== Tab Data Request ====================

export interface NSPDTabValuesParams {
  tabClass: string;
  categoryId: number;
  geomId: number;
}

export interface NSPDTabNoCoordsParams {
  tabClass: string;
  objdocId: number;
  registersId: number;
}

// ==================== NSPD Client Configuration ====================

export interface NSPDClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryOnBlockedIp: boolean;
  cacheTtlMs: number;
  proxy?: string;
  dnsResolve?: boolean;
}

// ==================== Default Layers ====================

export const NSPD_DEFAULT_LAYERS: Omit<NSPDLayerConfig, 'layerMeta'>[] = [
  {
    id: 36048,
    name: 'Земельные участки из ЕГРН',
    enabled: true,
    description: 'Границы земельных участков из ЕГРН',
  },
  {
    id: 36049,
    name: 'Здания',
    enabled: true,
    description: 'Здания и объекты незавершенного строительства из ЕГРН',
  },
  {
    id: 36328,
    name: 'Сооружения',
    enabled: true,
    description: 'Сооружения из ЕГРН',
  },
  {
    id: 36329,
    name: 'Объекты незавершенного строительства',
    enabled: true,
    description: 'Объекты незавершённого строительства',
  },
  {
    id: 36070,
    name: 'Кадастровые районы',
    enabled: true,
    description: 'Границы кадастровых районов',
  },
  {
    id: 36071,
    name: 'Кадастровые округа',
    enabled: true,
    description: 'Границы кадастровых округов',
  },
  {
    id: 855413,
    name: 'Кадастровые кварталы',
    enabled: true,
    description: 'Границы кадастровых кварталов',
  },
  {
    id: 875845,
    name: 'Зоны с особыми условиями',
    enabled: true,
    description: 'Охранные зоны, ЗОУИТ',
  },
  {
    id: 879243,
    name: 'Красные линии',
    enabled: true,
    description: 'Границы красных линий',
  },
];

// ==================== Known Layer Definitions ====================

export interface LayerDefinition {
  id: number;
  categoryId: number;
  title: string;
  geometryType: 'Polygon' | 'LineString' | 'Point' | 'GeometryCollection';
  optionsType:
    | 'LandPlot'
    | 'Building'
    | 'Structure'
    | 'IncompleteConstruction'
    | 'CadastralDistrict'
    | 'Zone'
    | 'Generic';
}

export const LAYER_DEFINITIONS: LayerDefinition[] = [
  {
    id: 36048,
    categoryId: 36048,
    title: 'Земельные участки из ЕГРН',
    geometryType: 'Polygon',
    optionsType: 'LandPlot',
  },
  {
    id: 36049,
    categoryId: 36049,
    title: 'Здания',
    geometryType: 'Polygon',
    optionsType: 'Building',
  },
  {
    id: 36328,
    categoryId: 36328,
    title: 'Сооружения',
    geometryType: 'Polygon',
    optionsType: 'Structure',
  },
  {
    id: 36329,
    categoryId: 36329,
    title: 'Объекты незавершенного строительства',
    geometryType: 'Polygon',
    optionsType: 'IncompleteConstruction',
  },
  {
    id: 36070,
    categoryId: 36070,
    title: 'Кадастровые районы',
    geometryType: 'Polygon',
    optionsType: 'CadastralDistrict',
  },
  {
    id: 36071,
    categoryId: 36071,
    title: 'Кадастровые округа',
    geometryType: 'Polygon',
    optionsType: 'CadastralDistrict',
  },
  {
    id: 855413,
    categoryId: 855413,
    title: 'Кадастровые кварталы',
    geometryType: 'Polygon',
    optionsType: 'CadastralDistrict',
  },
  {
    id: 875845,
    categoryId: 875845,
    title: 'Зоны с особыми условиями',
    geometryType: 'Polygon',
    optionsType: 'Zone',
  },
  {
    id: 879243,
    categoryId: 38942,
    title: 'Красные линии',
    geometryType: 'Polygon',
    optionsType: 'Generic',
  },
];

/**
 * Get layer definition by ID
 */
export function getLayerDefinition(
  layerId: number,
): LayerDefinition | undefined {
  return LAYER_DEFINITIONS.find((l) => l.id === layerId);
}

/**
 * Get layer definition by category ID
 */
export function getLayerDefinitionByCategoryId(
  categoryId: number,
): LayerDefinition | undefined {
  return LAYER_DEFINITIONS.find((l) => l.categoryId === categoryId);
}

// ==================== Cadastre Number Regex ====================

/** Regex for extracting cadastre numbers from text */
export const CADASTRE_NUMBER_REGEX = /\d{2}:\d{2}:\d{4}:\d{2,3}/;

/**
 * Extract cadastre numbers from text input.
 * Returns array of cadastre number strings.
 */
export function extractCadastreNumbers(input: string): string[] {
  const matches = input.match(CADASTRE_NUMBER_REGEX);
  if (!matches) return [];
  return matches;
}

// ==================== Coordinate Types ====================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface WebMercatorBbox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}
