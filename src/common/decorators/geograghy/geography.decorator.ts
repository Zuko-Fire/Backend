import { ColumnOptions, Column } from 'typeorm';

// src/common/decorators/geography.decorator.ts
export function GeographyColumn(options?: ColumnOptions) {
  return Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    ...options,
  });
}
