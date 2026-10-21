// src/modules/project/nspd/nspd.tab.service.ts
// Сервис получения данных вкладок объектов НСПД (в точности по pynspd)

import { Injectable, Logger } from '@nestjs/common';
import { NSPDClientService } from './nspd.client.service';
import {
  type NSPDTabResponse,
  NSPDTabGroupResponse,
  TabTitle,
} from './nspd.types';

/**
 * Маппинг названий вкладок на tabClass для API.
 * Точные названия из pynspd: landParts, landLinks, permissionType,
 * compositionLand, buildParts, objectsList
 */
const TAB_CLASS_MAP: Record<TabTitle, string> = {
  'Части ЗУ': 'landParts',
  'Связанные ЗУ': 'landLinks',
  'Виды разрешенного использования': 'permissionType',
  'Состав ЕЗП': 'compositionLand',
  'Части ОКС': 'buildParts',
  Объекты: 'objectsList',
};

/**
 * Сервис получения данных вкладок объектов НСПД.
 * Полностью соответствует pynspd:
 * - tab_land_parts → tabClass='landParts'
 * - tab_land_links → tabClass='landLinks'
 * - tab_permission_type → tabClass='permissionType'
 * - tab_composition_land → tabClass='compositionLand'
 * - tab_build_parts → tabClass='buildParts'
 * - tab_objects_list → tabClass='objectsList'
 *
 * Формат ответа: { title: string, value: string[] | null }
 * (не { data } как было раньше)
 */
@Injectable()
export class NSPDTabService {
  private readonly logger = new Logger(NSPDTabService.name);
  private readonly client: NSPDClientService;

  constructor(nspdClient: NSPDClientService) {
    this.client = nspdClient;
  }

  // ==================== Tab Data (by geomId) ====================

  /**
   * Получить данные вкладки "Части ЗУ" (land parts).
   */
  async tabLandParts(
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    return this.getTabValues('landParts', geomId, categoryId);
  }

  /**
   * Получить данные вкладки "Связанные ЗУ" (linked land plots).
   */
  async tabLandLinks(
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    return this.getTabValues('landLinks', geomId, categoryId);
  }

  /**
   * Получить данные вкладки "Виды разрешенного использования".
   */
  async tabPermissionType(
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    return this.getTabValues('permissionType', geomId, categoryId);
  }

  /**
   * Получить данные вкладки "Состав ЕЗП" (real estate complex composition).
   */
  async tabCompositionLand(
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    return this.getTabValues('compositionLand', geomId, categoryId);
  }

  /**
   * Получить данные вкладки "Части ОКС" (building parts).
   */
  async tabBuildParts(
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    return this.getTabValues('buildParts', geomId, categoryId);
  }

  // ==================== Tab Data (objects list, no coords) ====================

  /**
   * Получить данные вкладки "Объекты" для объектов без координат.
   * Возвращает словарь: { [registerName]: string[] | null }
   */
  async tabObjectsList(
    objdocId: number,
    registersId: number,
  ): Promise<Record<string, string[] | null>> {
    const result = await this.getTabGroupData(objdocId, registersId);
    const output: Record<string, string[] | null> = {};

    if (result?.tabs) {
      for (const tab of result.tabs) {
        // Убираем двоеточие в конце названия
        const title = tab.title.replace(/[\s:]+$/, '');
        const val = tab.data?.value;
        output[title] = Array.isArray(val)
          ? val.filter((v: any) => v && v !== '')
          : null;
      }
    }

    return output;
  }

  // ==================== Generic Tab Methods ====================

  /**
   * Получить данные вкладки по имени.
   * Универсальный метод-диспетчер.
   */
  async getTabData(
    tabName: TabTitle,
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    const tabClass = TAB_CLASS_MAP[tabName];
    return this.getTabValues(tabClass, geomId, categoryId);
  }

  /**
   * Получить сырые данные вкладки по tabClass и geomId.
   * Формат запроса (с координатами):
   *   GET /geoportal/v1/tab-values-data?tabClass=landParts&categoryId=36048&geomId=123
   * Формат запроса (без координат):
   *   GET /geoportal/v1/tab-values-data?tabClass=objectsList&objdocId=1&registersId=2
   *
   * Формат ответа (pynspd):
   *   { title: string, value: string[] | null }
   */
  async getTabValues(
    tabClass: string,
    geomId: number,
    categoryId: number,
  ): Promise<string[] | null> {
    try {
      const response = await this.client.get<any>(
        '/geoportal/v1/tab-values-data',
        {
          tabClass,
          categoryId: String(categoryId),
          geomId: String(geomId),
        },
      );

      // Формат ответа pynspd: { title, value: string[] | null }
      if (!response) return null;

      const parsed = (NSPDTabResponse as any).safeParse
        ? (NSPDTabResponse as any).safeParse(response)
        : response;

      return this.extractStringArray(parsed?.value);
    } catch (error) {
      this.logger.error(
        `Failed to get tab data (${tabClass}, geomId=${geomId}): ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Получить данные групп вкладок для объектов без координат.
   */
  async getTabGroupData(
    objdocId: number,
    registersId: number,
  ): Promise<NSPDTabGroupResponse | null> {
    try {
      const response = await this.client.get<NSPDTabGroupResponse>(
        '/geoportal/v1/tab-group-data',
        {
          objdocId: String(objdocId),
          registersId: String(registersId),
        },
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get tab group data (objdocId=${objdocId}, registersId=${registersId}): ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  // ==================== Helpers ====================

  /**
   * Извлечь массив строк из ответа вкладки.
   * Pynspd формат: value: string[] | null
   */
  private extractStringArray(
    value: string[] | string | null | undefined,
  ): string[] | null {
    if (value === null || value === undefined) return null;

    if (Array.isArray(value)) {
      const filtered = value.filter((v) => v !== null && v !== '');
      return filtered.length > 0 ? filtered : null;
    }

    if (typeof value === 'string') {
      return value.trim() ? [value] : null;
    }

    return null;
  }
}

// ==================== Simple Zod-like parser ====================

namespace NSPDTabResponse {
  export function safeParse(
    data: any,
  ): { title: string; value: string[] | null } | null {
    if (!data || typeof data !== 'object') return null;
    const val = data.value;
    if (Array.isArray(val) && val.length === 1 && val[0] === '') {
      return { title: data.title, value: null };
    }
    return {
      title: data.title || '',
      value: Array.isArray(val) ? val.filter((v: any) => v && v !== '') : null,
    };
  }
}
