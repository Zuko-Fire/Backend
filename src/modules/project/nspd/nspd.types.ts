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

export interface OptionProperties {
  titleKey?: string | null;
  noCoords?: boolean;
  objdocId?: number | null;
  registersId?: number | null;
  [key: string]: unknown;
}

export interface NspdProperties<T extends OptionProperties = OptionProperties> {
  category: number;
  categoryName: string;
  options: T;
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

export interface NspdFeature<
  T extends GeoJSONGeometry = GeoJSONGeometry,
  P extends NspdProperties = NspdProperties,
> {
  type: 'Feature';
  geometry: T;
  properties: P;
  layerMeta?: LayerNode;
}

// ==================== Layer-specific Option Properties ====================

/**
 * Base option properties for all layer types.
 * @deprecated Use OptionProperties from NspdProperties generic instead.
 */
export interface BaseOptionProperties extends OptionProperties {
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
 * Land record options (categoryId: 36368)
 */
export interface Options36368 extends OptionProperties {
  landRecordType?: string | null;
  landRecordSubtype?: string | null;
  landRecordRegDate?: string | null;
  cadNum?: string | null;
  quarterCadNumber?: string | null;
  readableAddress?: string | null;
  specifiedArea?: number | null;
  declaredArea?: number | null;
  area?: number | null;
  status?: string | null;
  landRecordCategoryType?: string | null;
  permittedUseEstablishedByDocument?: string | null;
  ownershipType?: string | null;
  costValue?: number | null;
  costIndex?: number | null;
  [key: string]: unknown;
}

/**
 * Building record options (categoryId: 36369)
 */
export interface Options36369 extends OptionProperties {
  buildRecordTypeValue?: string | null;
  buildRecordRegistrationDate?: string | null;
  cadNum?: string | null;
  quarterCadNumber?: string | null;
  readableAddress?: string | null;
  buildingName?: string | null;
  purpose?: string | null;
  buildRecordArea?: number | null;
  status?: string | null;
  ownershipType?: string | null;
  costValue?: number | null;
  costIndex?: number | null;
  floors?: string | null;
  undergroundFloors?: string | null;
  materials?: string | null;
  yearBuilt?: string | null;
  yearCommisioning?: string | null;
  culturalHeritageVal?: string | null;
  unitedCadNumber?: string | null;
  facilityCadNumber?: string | null;
  [key: string]: unknown;
}

/**
 * Cadastral quarter options (categoryId: 36381)
 */
export interface Options36381 extends OptionProperties {
  objKindValue?: string | null;
  name?: string | null;
  cadNum?: string | null;
  cadNumKo?: string | null;
  cadNumKr?: string | null;
  cntLand?: number | null;
  cntLandGeom?: number | null;
  cntLandNotGeom?: number | null;
  cntOks?: number | null;
  cntOksGeom?: number | null;
  cntOksNotGeom?: number | null;
  cntEnk?: number | null;
  cntPik?: number | null;
  [key: string]: unknown;
}

/**
 * Cadastral district options (categoryId: 36382)
 */
export interface Options36382 extends OptionProperties {
  objKindValue?: string | null;
  name?: string | null;
  cadNum?: string | null;
  cadNumKo?: string | null;
  cntKk?: number | null;
  cntLand?: number | null;
  cntLandGeom?: number | null;
  cntLandNotGeom?: number | null;
  cntOks?: number | null;
  cntOksGeom?: number | null;
  cntOksNotGeom?: number | null;
  cntEnk?: number | null;
  cntPik?: number | null;
  [key: string]: unknown;
}

/**
 * Structure options (categoryId: 36383)
 */
export interface Options36383 extends OptionProperties {
  objectTypeValue?: string | null;
  registrationDate?: string | null;
  cadNumber?: string | null;
  quarterCadNumber?: string | null;
  addressReadableAddress?: string | null;
  paramsName?: string | null;
  paramsPurpose?: string | null;
  paramsHeight?: number | null;
  paramsDepth?: number | null;
  paramsOccurenceDepth?: number | null;
  paramsExtension?: number | null;
  paramsVolume?: number | null;
  paramsBuiltUpArea?: number | null;
  paramsArea?: number | null;
  objectPreviouslyPosted?: string | null;
  ownershipType?: string | null;
  costValue?: number | null;
  costIndex?: number | null;
  paramsFloors?: string | null;
  paramsUndergroundFloors?: string | null;
  paramsYearBuilt?: string | null;
  paramsYearCommisioning?: string | null;
  culturalHeritageObject?: string | null;
  unitedCadNumber?: string | null;
  facilityCadNumber?: string | null;
  [key: string]: unknown;
}

/**
 * Incomplete construction options (categoryId: 36384)
 */
export interface Options36384 extends OptionProperties {
  objectUnderConstructionRecordRecordTypeValue?: string | null;
  registrationDate?: string | null;
  cadNum?: string | null;
  quarterCadNumber?: string | null;
  readableAddress?: string | null;
  objectUnderConstructionRecordName?: string | null;
  height?: number | null;
  depth?: number | null;
  occurenceDepth?: number | null;
  extension?: number | null;
  volume?: number | null;
  builtUpArea?: number | null;
  commonDataStatus?: string | null;
  ownershipType?: string | null;
  costValue?: number | null;
  costIndex?: number | null;
  degreeReadiness?: string | null;
  purpose?: string | null;
  facilityCadNumber?: string | null;
  [key: string]: unknown;
}

/**
 * Border registration options (categoryId: 36940)
 */
export interface Options36940 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Measuring project land options (categoryId: 37158)
 */
export interface Options37158 extends OptionProperties {
  nominalNumber?: string | null;
  area?: string | null;
  landUseText?: string | null;
  brdNmb?: string | null;
  registrationDate?: string | null;
  documentName?: string | null;
  documentNumber?: string | null;
  documentDate?: string | null;
  documentIssuer?: string | null;
  [key: string]: unknown;
}

/**
 * Cadastral circle options (categoryId: 38030)
 */
export interface Options38030 extends OptionProperties {
  objKindValue?: string | null;
  name?: string | null;
  cadNum?: string | null;
  cntKr?: number | null;
  cntKk?: number | null;
  cntLand?: number | null;
  cntLandGeom?: number | null;
  cntLandNotGeom?: number | null;
  cntOks?: number | null;
  cntOksGeom?: number | null;
  cntOksNotGeom?: number | null;
  cntEnk?: number | null;
  cntPik?: number | null;
  [key: string]: unknown;
}

/**
 * Red line options (categoryId: 38942)
 */
export interface Options38942 extends OptionProperties {
  contentRestrictEncumbrances?: string | null;
  doc?: string | null;
  docType?: string | null;
  docNumber?: string | null;
  docDate?: string | null;
  docGov?: string | null;
  [key: string]: unknown;
}

/**
 * SRLU land options (categoryId: 38943)
 */
export interface Options38943 extends OptionProperties {
  id?: string | null;
  docGuid?: string | null;
  docType?: string | null;
  docGov?: string | null;
  docDate?: string | null;
  docNumber?: string | null;
  condNumbe?: string | null;
  shapeArea?: number | null;
  address?: string | null;
  kvartalId?: string | null;
  nameZone?: string | null;
  categoryCode?: string | null;
  utilization?: string | null;
  [key: string]: unknown;
}

/**
 * Environmental recovery territory options (categoryId: 38944)
 */
export interface Options38944 extends OptionProperties {
  schema1?: string | null;
  name?: string | null;
  partType?: string | null;
  building?: string | null;
  [key: string]: unknown;
}

/**
 * Negative process options (categoryId: 38967)
 */
export interface Options38967 extends OptionProperties {
  subRf?: string | null;
  cadDistr?: string | null;
  district?: string | null;
  processTyTitle?: string | null;
  indexMap?: string | null;
  shapeArea?: number | null;
  zoneProya?: string | null;
  processTy?: string | null;
  recommend?: string | null;
  year?: string | null;
  [key: string]: unknown;
}

/**
 * Land free of third-party rights (categoryId: 38979)
 */
export interface Options38979 extends OptionProperties {
  [key: string]: unknown;
}

/**
 * Land auction options (categoryId: 38981)
 */
export interface Options38981 extends OptionProperties {
  aucThrf?: string | null;
  [key: string]: unknown;
}

/**
 * State border options (categoryId: 38998)
 */
export interface Options38998 extends OptionProperties {
  type?: string | null;
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * KKR territory options (categoryId: 39228)
 */
export interface Options39228 extends OptionProperties {
  kkaccountnumber?: string | null;
  stateKKR?: string | null;
  contract?: string | null;
  contractNum?: string | null;
  krstartdate?: string | null;
  krenddate?: string | null;
  krcustomername?: string | null;
  krcustomeraddress?: string | null;
  krcustomeremail?: string | null;
  krcustomerphone?: string | null;
  krcontractorname?: string | null;
  krsurveyorname?: string | null;
  krsurveyoraddress?: string | null;
  krsurveyoremail?: string | null;
  krsurveyorphone?: string | null;
  krsurveyoratt?: string | null;
  krsurveyorattdate?: string | null;
  krsurveyorsroname?: string | null;
  typeKKR?: string | null;
  [key: string]: unknown;
}

/**
 * ENK options (categoryId: 39663)
 */
export interface Options39663 extends OptionProperties {
  type?: string | null;
  registrationDate?: string | null;
  cadNumber?: string | null;
  quarterCadNumber?: string | null;
  readableAddress?: string | null;
  name?: string | null;
  purpose?: string | null;
  commonDataStatus?: string | null;
  costValue?: number | null;
  facilityCadNumber?: string | null;
  [key: string]: unknown;
}

/**
 * PIK options (categoryId: 39664)
 */
export interface Options39664 extends OptionProperties {
  type?: string | null;
  registrationDate?: string | null;
  name?: string | null;
  purpose?: string | null;
  cadNumber?: string | null;
  quarterCadNumber?: string | null;
  readableAddress?: string | null;
  commonDataStatus?: string | null;
  costValue?: string | null;
  [key: string]: unknown;
}

/**
 * RF subject lines (categoryId: 472796)
 */
export interface Options472796 extends OptionProperties {
  [key: string]: unknown;
}

/**
 * RF subject polygons (categoryId: 472798)
 */
export interface Options472798 extends OptionProperties {
  [key: string]: unknown;
}

/**
 * Municipal formations polygon (categoryId: 472800)
 */
export interface Options472800 extends OptionProperties {
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * Municipal formations linear (categoryId: 472805)
 */
export interface Options472805 extends OptionProperties {
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * Settlements polygons (categoryId: 472812)
 */
export interface Options472812 extends OptionProperties {
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * Shorelines polygonal (categoryId: 472813)
 */
export interface Options472813 extends OptionProperties {
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * Shorelines linear (categoryId: 472816)
 */
export interface Options472816 extends OptionProperties {
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * Territorial zones (categoryId: 472819)
 */
export interface Options472819 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Cultural heritage territories (categoryId: 472820)
 */
export interface Options472820 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Protected natural territories (categoryId: 472825)
 */
export interface Options472825 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Special economic zones (categoryId: 472826)
 */
export interface Options472826 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Hunting grounds (categoryId: 472827)
 */
export interface Options472827 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Advanced development territories (categoryId: 472828)
 */
export interface Options472828 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Gaming zones (categoryId: 472846)
 */
export interface Options472846 extends OptionProperties {
  brdNmb?: string | null;
  [key: string]: unknown;
}

/**
 * Forestry (categoryId: 472847)
 */
export interface Options472847 extends OptionProperties {
  regNumbBorder?: string | null;
  [key: string]: unknown;
}

/**
 * Park boundary (categoryId: 472853)
 */
export interface Options472853 extends OptionProperties {
  [key: string]: unknown;
}

/**
 * Settlements linear (categoryId: 472860)
 */
export interface Options472860 extends OptionProperties {
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
  | Options36368
  | Options36369
  | Options36381
  | Options36382
  | Options36383
  | Options36384
  | Options36940
  | Options37158
  | Options38030
  | Options38942
  | Options38943
  | Options38944
  | Options38967
  | Options38979
  | Options38981
  | Options38998
  | Options39228
  | Options39663
  | Options39664
  | Options472796
  | Options472798
  | Options472800
  | Options472805
  | Options472812
  | Options472813
  | Options472816
  | Options472819
  | Options472820
  | Options472825
  | Options472826
  | Options472827
  | Options472828
  | Options472846
  | Options472847
  | Options472853
  | Options472860
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
    | 'Generic'
    | 'Options36368'
    | 'Options36369'
    | 'Options36381'
    | 'Options36382'
    | 'Options36383'
    | 'Options36384'
    | 'Options36940'
    | 'Options37158'
    | 'Options38030'
    | 'Options38942'
    | 'Options38943'
    | 'Options38944'
    | 'Options38967'
    | 'Options38979'
    | 'Options38981'
    | 'Options38998'
    | 'Options39228'
    | 'Options39663'
    | 'Options39664'
    | 'Options472796'
    | 'Options472798'
    | 'Options472800'
    | 'Options472805'
    | 'Options472812'
    | 'Options472813'
    | 'Options472816'
    | 'Options472819'
    | 'Options472820'
    | 'Options472825'
    | 'Options472826'
    | 'Options472827'
    | 'Options472828'
    | 'Options472846'
    | 'Options472847'
    | 'Options472853'
    | 'Options472860';
}

export const LAYER_DEFINITIONS: LayerDefinition[] = [
  {
    id: 36048,
    categoryId: 36368,
    title: 'Земельные участки из ЕГРН',
    geometryType: 'Polygon',
    optionsType: 'Options36368',
  },
  {
    id: 36049,
    categoryId: 36369,
    title: 'Здания',
    geometryType: 'Polygon',
    optionsType: 'Options36369',
  },
  {
    id: 36328,
    categoryId: 36383,
    title: 'Сооружения',
    geometryType: 'Polygon',
    optionsType: 'Options36383',
  },
  {
    id: 36329,
    categoryId: 36384,
    title: 'Объекты незавершенного строительства',
    geometryType: 'Polygon',
    optionsType: 'Options36384',
  },
  {
    id: 36071,
    categoryId: 36381,
    title: 'Кадастровые кварталы',
    geometryType: 'Polygon',
    optionsType: 'Options36381',
  },
  {
    id: 36070,
    categoryId: 36382,
    title: 'Кадастровые районы',
    geometryType: 'Polygon',
    optionsType: 'Options36382',
  },
  {
    id: 37236,
    categoryId: 36368,
    title: 'Кадастровая стоимость объекта',
    geometryType: 'Polygon',
    optionsType: 'Options36368',
  },
  {
    id: 37758,
    categoryId: 36368,
    title: 'Удельный показатель кадастровой стоимости',
    geometryType: 'Polygon',
    optionsType: 'Options36368',
  },
  {
    id: 36473,
    categoryId: 37158,
    title: 'Земельные участки, образуемые по проекту межевания территории',
    geometryType: 'Polygon',
    optionsType: 'Options37158',
  },
  {
    id: 36945,
    categoryId: 38030,
    title: 'Кадастровые округа',
    geometryType: 'Polygon',
    optionsType: 'Options38030',
  },
  {
    id: 879243,
    categoryId: 38942,
    title: 'Красные линии',
    geometryType: 'Polygon',
    optionsType: 'Options38942',
  },
  {
    id: 37294,
    categoryId: 38943,
    title:
      'Земельные участки, образуемые по схеме расположения земельного участка',
    geometryType: 'Polygon',
    optionsType: 'Options38943',
  },
  {
    id: 37295,
    categoryId: 38944,
    title:
      'Территория проведения мероприятий по ликвидации накопленного вреда окружающей среде',
    geometryType: 'Polygon',
    optionsType: 'Options38944',
  },
  {
    id: 872153,
    categoryId: 38967,
    title: 'Водная эрозия',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872155,
    categoryId: 38967,
    title: 'Линейная эрозия',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872164,
    categoryId: 38967,
    title: 'Ветровая эрозия',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872182,
    categoryId: 38967,
    title: 'Опустынивание',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872183,
    categoryId: 38967,
    title: 'Переувлажнение',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872202,
    categoryId: 38967,
    title: 'Подтопление',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872203,
    categoryId: 38967,
    title: 'Заболачивание',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872205,
    categoryId: 38967,
    title: 'Затопление',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872206,
    categoryId: 38967,
    title: 'Захламление',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872210,
    categoryId: 38967,
    title: 'Обвально-осыпные и оползневые процессы',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872211,
    categoryId: 38967,
    title: 'Абразия',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872212,
    categoryId: 38967,
    title: 'Иные нарушенные земли',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872213,
    categoryId: 38967,
    title: 'Нарушенные земли при наземном строительстве',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872216,
    categoryId: 38967,
    title: 'Нарушенные земли при гидротехническом строительстве',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872217,
    categoryId: 38967,
    title: 'Нарушенные земли при недропользовании',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872218,
    categoryId: 38967,
    title: 'Нарушенные земли при промышленном лесопользовании',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872219,
    categoryId: 38967,
    title: 'Нарушенные земли при сельскохозяйственном освоении',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872220,
    categoryId: 38967,
    title: 'Нарушенные земли при проведении геологоразведочных работ',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872221,
    categoryId: 38967,
    title:
      'Нарушенные земли при складировании и захоронении промышленных отходов',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872222,
    categoryId: 38967,
    title: 'Гари',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872224,
    categoryId: 38967,
    title: 'Негативный процесс отсутствует',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 872262,
    categoryId: 38967,
    title: 'Засоление',
    geometryType: 'Polygon',
    optionsType: 'Options38967',
  },
  {
    id: 37298,
    categoryId: 38979,
    title: 'Земельные участки, свободные от прав третьих лиц',
    geometryType: 'Polygon',
    optionsType: 'Options38979',
  },
  {
    id: 37299,
    categoryId: 38981,
    title: 'Земельные участки, выставленные на аукцион',
    geometryType: 'Polygon',
    optionsType: 'Options38981',
  },
  {
    id: 37313,
    categoryId: 38998,
    title: 'Государственная граница Российской Федерации',
    geometryType: 'LineString',
    optionsType: 'Options38998',
  },
  {
    id: 37430,
    categoryId: 39228,
    title: 'Территории выполнения комплексных кадастровых работ',
    geometryType: 'Polygon',
    optionsType: 'Options39228',
  },
  {
    id: 37433,
    categoryId: 39663,
    title: 'Единые недвижимые комплексы',
    geometryType: 'Point',
    optionsType: 'Options39663',
  },
  {
    id: 37434,
    categoryId: 39664,
    title: 'Предприятие как имущественный комплекс',
    geometryType: 'Point',
    optionsType: 'Options39664',
  },
  {
    id: 37577,
    categoryId: 36940,
    title: 'ЗОУИТ объектов культурного наследия',
    geometryType: 'Polygon',
    optionsType: 'Options36940',
  },
  {
    id: 37578,
    categoryId: 36940,
    title: 'ЗОУИТ объектов энергетики, связи, транспорта',
    geometryType: 'Polygon',
    optionsType: 'Options36940',
  },
  {
    id: 37580,
    categoryId: 36940,
    title: 'ЗОУИТ природных территорий',
    geometryType: 'Polygon',
    optionsType: 'Options36940',
  },
  {
    id: 37579,
    categoryId: 36940,
    title: 'ЗОУИТ охраняемых объектов и безопасности',
    geometryType: 'Polygon',
    optionsType: 'Options36940',
  },
  {
    id: 37581,
    categoryId: 36940,
    title: 'Иные ЗОУИТ',
    geometryType: 'Polygon',
    optionsType: 'Options36940',
  },
  {
    id: 855413,
    categoryId: 472819,
    title: 'Кадастровые кварталы',
    geometryType: 'Polygon',
    optionsType: 'Options472819',
  },
  {
    id: 875815,
    categoryId: 472796,
    title: 'Субъекты Российской Федерации (линии)',
    geometryType: 'Polygon',
    optionsType: 'Options472796',
  },
  {
    id: 875817,
    categoryId: 472798,
    title: 'Субъекты Российской Федерации (полигоны)',
    geometryType: 'Polygon',
    optionsType: 'Options472798',
  },
  {
    id: 875819,
    categoryId: 472800,
    title: 'Муниципальные образования (полигональный)',
    geometryType: 'Polygon',
    optionsType: 'Options472800',
  },
  {
    id: 875824,
    categoryId: 472805,
    title: 'Муниципальные образования (линейный)',
    geometryType: 'Polygon',
    optionsType: 'Options472805',
  },
  {
    id: 875831,
    categoryId: 472812,
    title: 'Населённые пункты (полигоны)',
    geometryType: 'Polygon',
    optionsType: 'Options472812',
  },
  {
    id: 875832,
    categoryId: 472813,
    title: 'Береговые линии (границы водных объектов) (полигональный)',
    geometryType: 'Polygon',
    optionsType: 'Options472813',
  },
  {
    id: 875835,
    categoryId: 472816,
    title: 'Береговые линии (границы водных объектов)(линейный)',
    geometryType: 'Polygon',
    optionsType: 'Options472816',
  },
  {
    id: 875838,
    categoryId: 472819,
    title: 'Территориальные зоны',
    geometryType: 'Polygon',
    optionsType: 'Options472819',
  },
  {
    id: 875840,
    categoryId: 472820,
    title: 'Территории объектов культурного наследия',
    geometryType: 'Polygon',
    optionsType: 'Options472820',
  },
  {
    id: 875845,
    categoryId: 472825,
    title: 'Особо охраняемые природные территории',
    geometryType: 'Polygon',
    optionsType: 'Options472825',
  },
  {
    id: 875846,
    categoryId: 472826,
    title: 'Особые экономические зоны',
    geometryType: 'Polygon',
    optionsType: 'Options472826',
  },
  {
    id: 875847,
    categoryId: 472827,
    title: 'Охотничьи угодья',
    geometryType: 'Polygon',
    optionsType: 'Options472827',
  },
  {
    id: 875848,
    categoryId: 472828,
    title: 'Территории опережающего развития',
    geometryType: 'Polygon',
    optionsType: 'Options472828',
  },
  {
    id: 875865,
    categoryId: 472846,
    title: 'Игорные зоны',
    geometryType: 'Polygon',
    optionsType: 'Options472846',
  },
  {
    id: 875866,
    categoryId: 472847,
    title: 'Лесничества',
    geometryType: 'Polygon',
    optionsType: 'Options472847',
  },
  {
    id: 875874,
    categoryId: 472853,
    title: 'Граница лесопарка',
    geometryType: 'Polygon',
    optionsType: 'Options472853',
  },
  {
    id: 875882,
    categoryId: 472860,
    title: 'Населённые пункты (линии)',
    geometryType: 'Polygon',
    optionsType: 'Options472860',
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

/**
 * Get option properties type by category ID
 */
export type OptionByCategoryId<T extends number> = T extends 36368
  ? Options36368
  : T extends 36369
    ? Options36369
    : T extends 36381
      ? Options36381
      : T extends 36382
        ? Options36382
        : T extends 36383
          ? Options36383
          : T extends 36384
            ? Options36384
            : T extends 36940
              ? Options36940
              : T extends 37158
                ? Options37158
                : T extends 38030
                  ? Options38030
                  : T extends 38942
                    ? Options38942
                    : T extends 38943
                      ? Options38943
                      : T extends 38944
                        ? Options38944
                        : T extends 38967
                          ? Options38967
                          : T extends 38979
                            ? Options38979
                            : T extends 38981
                              ? Options38981
                              : T extends 38998
                                ? Options38998
                                : T extends 39228
                                  ? Options39228
                                  : T extends 39663
                                    ? Options39663
                                    : T extends 39664
                                      ? Options39664
                                      : T extends 472796
                                        ? Options472796
                                        : T extends 472798
                                          ? Options472798
                                          : T extends 472800
                                            ? Options472800
                                            : T extends 472805
                                              ? Options472805
                                              : T extends 472812
                                                ? Options472812
                                                : T extends 472813
                                                  ? Options472813
                                                  : T extends 472816
                                                    ? Options472816
                                                    : T extends 472819
                                                      ? Options472819
                                                      : T extends 472820
                                                        ? Options472820
                                                        : T extends 472825
                                                          ? Options472825
                                                          : T extends 472826
                                                            ? Options472826
                                                            : T extends 472827
                                                              ? Options472827
                                                              : T extends 472828
                                                                ? Options472828
                                                                : T extends 472846
                                                                  ? Options472846
                                                                  : T extends 472847
                                                                    ? Options472847
                                                                    : T extends 472853
                                                                      ? Options472853
                                                                      : T extends 472860
                                                                        ? Options472860
                                                                        : OptionProperties;

/**
 * Get option properties interface by category ID
 */
export function getOptionPropertiesByCategoryId(
  categoryId: number,
): OptionByCategoryId<typeof categoryId> {
  return {} as OptionByCategoryId<typeof categoryId>;
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
