// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// ==================== JWT Tokens ====================

export const ACCESS_TOKEN_EXPIRY = '1h';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_EXPIRY_MS =
  REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = 'refreshtoken';

// ==================== Cookie Settings ====================

export const COOKIE_CONFIG = {
  HTTP_ONLY: true,
  SECURE_PROD: true,
  SAMESITE_PROD: 'strict' as const,
  SAMESITE_DEV: 'lax' as const,
} as const;

// ==================== Security ====================

export const BCRYPT_SALT_ROUNDS = 10;

// ==================== Geo Search ====================

export const MAX_SEARCH_RADIUS_METERS = 100_000; // 100 km
export const POSTGIS_SRID = 4326;

// ==================== Project Roles ====================

export const PROJECT_ROLES = {
  VIEWER: 'viewer',
  EDITOR: 'editor',
  ADMIN: 'admin',
} as const;

export const ROLE_READ = [
  PROJECT_ROLES.ADMIN,
  PROJECT_ROLES.EDITOR,
  PROJECT_ROLES.VIEWER,
];
export const ROLE_WRITE = [PROJECT_ROLES.ADMIN, PROJECT_ROLES.EDITOR];
export const ROLE_ADMIN_ONLY = [PROJECT_ROLES.ADMIN];

// ==================== Project Status ====================

export const PROJECT_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  RETURNED: 'returned',
} as const;

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  [PROJECT_STATUS.DRAFT]: [PROJECT_STATUS.IN_REVIEW, PROJECT_STATUS.DRAFT],
  [PROJECT_STATUS.IN_REVIEW]: [
    PROJECT_STATUS.APPROVED,
    PROJECT_STATUS.RETURNED,
    PROJECT_STATUS.IN_REVIEW,
  ],
  [PROJECT_STATUS.APPROVED]: [PROJECT_STATUS.DRAFT, PROJECT_STATUS.IN_REVIEW],
  [PROJECT_STATUS.RETURNED]: [PROJECT_STATUS.DRAFT, PROJECT_STATUS.IN_REVIEW],
};

// ==================== Database Column Names (snake_case) ====================

export const DB = {
  PROJECT: {
    ID: 'id',
    OWNER_ID: 'owner_id',
    NAME: 'name',
    DESCRIPTION: 'description',
    PICTURE: 'picture',
    STATUS: 'status',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
    DELETED_AT: 'deleted_at',
  },
  POLYGON: {
    ID: 'id',
    PROJECT_ID: 'project_id',
    NAME: 'name',
    COORDINATES: 'coordinates',
    GEOMETRY: 'geometry',
    CREATED_BY: 'created_by',
    UPDATED_BY: 'updated_by',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
    DELETED_AT: 'deleted_at',
  },
  LAND_PLOT: {
    ID: 'id',
    CADASTRAL_NUMBER: 'cadastral_number',
    AREA: 'area',
    LAND_CATEGORY: 'land_category',
    PERMITTED_USE: 'permitted_use',
    ADDRESS: 'address',
    STATUS: 'status',
    REGISTRATION_DATE: 'registration_date',
    POLYGON_ID: 'polygon_id',
  },
  MEMBERS: {
    PROJECT_ID: 'project_id',
    USER_ID: 'user_id',
    ROLE_IN_PROJECT: 'role_in_project',
    JOINED_AT: 'joined_at',
  },
  MAP_VIEW: {
    PROJECT_ID: 'project_id',
    USER_ID: 'user_id',
    LAT: 'lat',
    LON: 'lon',
    ZOOM: 'zoom',
  },
  DOCUMENT: {
    ID: 'id',
    PROJECT_ID: 'project_id',
    LAND_PLOT_ID: 'land_plot_id',
    UPLOADED_BY: 'uploaded_by',
  },
  USER: {
    ID: 'id',
    EMAIL: 'email',
    NAME: 'name',
    PASSWORD: 'password',
    IS_ACTIVE: 'is_active',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
  },
} as const;
