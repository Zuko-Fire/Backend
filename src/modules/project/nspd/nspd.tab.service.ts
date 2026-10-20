// src/modules/project/nspd/nspd.tab.service.ts
// Сервис получения данных вкладок объектов НСПД (вдохновлено pynspd)

import { Injectable, Logger } from '@nestjs/common';
import { NSPDClientService } from './nspd.client.service';
import {
  NSPDTabResponse,
  NSPDTabGroupResponse,
  TabTitle,
} from './nspd.types';

/**
 * Маппинг названий вкладок на tabClass для API
 */
const TAB_CLASS_MAP: Record<TabTitle, string> = {
  'Части ЗУ': 'landplot-parts',
  'Связанные ЗУ': 'landplot-links',
  'Виды разрешенного использования': 'permitted-use',
  'Состав ЕЗП': 'ezp-composition',
  'Части ОКС': 'building-parts',
  'Объекты': 'objects',
};

/**
 * Сервис получения данных вкладок объектов НСПД.
 * Реализует методы из pynspd:
 * - tab_land_parts
 * - tab_land_links
 * - tab_permission_type
 * - tab_composition_land
 * - tab_build_parts
 * - tab_objects_list
 * - get_tab_data
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
  async tabLandParts(geomId: number): Promise<string[] | null> {
    const result = await this.getTabValues(
      'landplot-parts',
      geomId,
    );
    return this.extractStringArray(result);
  }

  /**
   * Получить данные вкладки "Связанные ЗУ" (linked land plots).
   */
  async tabLandLinks(geomId: number): Promise<string[] | null> {
    const result = await this.getTabValues('landplot-links', geomId);
    return this.extractStringArray(result);
  }

  /**
   * Получить данные вкладки "Виды разрешенного использования".
   */
  async tabPermissionType(geomId: number): Promise<string[] | null> {
    const result = await this.getTabValues('permitted-use', geomId);
    return this.extractStringArray(result);
  }

  /**
   * Получить данные вкладки "Состав ЕЗП" (real estate complex composition).
   */
  async tabCompositionLand(geomId: number): Promise<string[] | null> {
    const result = await this.getTabValues('ezp-composition', geomId);
    return this.extractStringArray(result);
  }

  /**
   * Получить данные вкладки "Части ОКС" (building parts).
   */
  async tabBuildParts(geomId: number): Promise<string[] | null> {
    const result = await this.getTabValues('building-parts', geomId);
    return this.extractStringArray(result);
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
        output[tab.title] = this.extractStringArray(tab);
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
  ): Promise<NSPDTabResponse | null> {
    const tabClass = TAB_CLASS_MAP[tabName];
    return this.getTabValues(tabClass, geomId);
  }

  /**
   * Получить сырые данные вкладки по tabClass и geomId.
   */
  async getTabValues(
    tabClass: string,
    geomId: number,
  ): Promise<NSPDTabResponse | null> {
    try {
      const response = await this.client.get<NSPDTabResponse>(
        '/geoportal/v1/tab-values-data',
        {
          tabClass,
          geomId: String(geomId),
        },
      );

      return response;
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
   */
  private extractStringArray(
    tabResponse: NSPDTabResponse | null,
  ): string[] | null {
    if (!tabResponse?.data) return null;

    const values: string[] = [];

    for (const [key, value] of Object.entries(tabResponse.data)) {
      if (value === null || value === '') continue;

      if (Array.isArray(value)) {
        values.push(...value.filter((v): v is string => typeof v === 'string'));
      } else if (typeof value === 'string') {
        values.push(value);
      }
    }

    return values.length > 0 ? values : null;
  }
}
