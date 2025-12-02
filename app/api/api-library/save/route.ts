import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CapturedApi } from '@/types/har';
import { safeJsonStringify } from '@/lib/json-utils';
import { parameterizePath } from '@/lib/path-parameterization';
import { filterHeadersByWhitelist } from '@/lib/header-filter';

export const dynamic = 'force-dynamic';

/**
 * 批量保存采集的API到数据库
 * POST /api/api-library/save
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apis } = body as { apis: Array<CapturedApi & { 
      id?: string;
      name: string;
      description?: string;
      categoryId?: string;
      tagIds?: string[];
      platform?: string;
      component?: string;
      feature?: string;
      importSource?: string;
      _overwrite?: boolean;
    }> };

    if (!apis || !Array.isArray(apis) || apis.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要保存的API列表' },
        { status: 400 }
      );
    }

    // 获取平台设置中的请求头白名单配置
    const platformSettings = await prisma.platformSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const allowedHeaders = platformSettings?.allowedHeaders || null;

    // 批量保存/更新API记录，每个独立处理
    const results = await Promise.allSettled(
      apis.map(async (api) => {
        try {
        // 提取域名
        let domain = null;
        try {
          const urlObj = new URL(api.url);
          domain = urlObj.hostname;
        } catch {}

        // 自动参数化路径（如果还没有参数化）
        const paramResult = parameterizePath(api.path);
        const finalPath = paramResult.parameterizedPath;
        
        // 如果路径被参数化，记录日志
        if (paramResult.isParameterized && api.path !== finalPath) {
          console.log(`🔧 [保存时参数化] ${api.path} → ${finalPath}`);
        }

          // 根据白名单过滤请求头
          const filteredHeaders = filterHeadersByWhitelist(api.headers || {}, allowedHeaders);
          
          // 如果白名单过滤了一些headers，记录日志
          if (allowedHeaders && Object.keys(api.headers || {}).length !== Object.keys(filteredHeaders).length) {
            console.log(`🔍 [Headers过滤] ${api.name}: ${Object.keys(api.headers || {}).length} → ${Object.keys(filteredHeaders).length} 个请求头`);
          }

          // 准备API数据
          const apiData = {
            name: api.name,
            description: api.description || null,
            method: api.method,
            url: api.url,
            path: finalPath,  // 使用参数化后的路径
            domain,
            
            // 旧的分类字段（兼容性）
            categoryId: api.categoryId || null,
            
            // 四层分类
            platform: (api as any).platform || null,
            component: (api as any).component || null,
            feature: (api as any).feature || null,
            
            // 导入来源
            importSource: (api as any).importSource || 'har',
            
            // 请求信息（转换为JSON字符串存储）
            requestHeaders: safeJsonStringify(filteredHeaders),
            requestQuery: safeJsonStringify(api.queryParams),
            requestBody: safeJsonStringify(api.requestBody),
            requestMimeType: api.mimeType || null,
            
            // 响应信息
            responseStatus: api.status || null,
            responseHeaders: safeJsonStringify((api as any).responseHeaders),
            responseBody: safeJsonStringify(api.responseBody),
            responseMimeType: api.mimeType || null,
            
            // 性能指标
            responseTime: Math.round(api.time) || null,
            responseSize: api.size || null,
            
            // 元数据
            resourceType: api.resourceType || null,
            startedDateTime: api.startedDateTime || null,
            
            // 保留原始数据（也序列化为 JSON 字符串）
            rawHarEntry: safeJsonStringify(api) || undefined,
          };

          // 根据是否覆盖来决定是创建还是更新
          let savedApi;
          if ((api as any)._overwrite && api.id) {
            // 覆盖模式：更新现有API
            console.log(`🔄 [覆盖模式] 更新API: ${api.id} - ${api.name} | 分类: ${apiData.platform}/${apiData.component}/${apiData.feature}`);
            
            try {
              savedApi = await prisma.api.update({
                where: { id: api.id },
                data: apiData,
        });
              console.log(`✅ [覆盖成功] API已更新: ${savedApi.id} - ${savedApi.name}`);
            } catch (updateError: any) {
              console.error(`❌ [覆盖失败] API: ${api.id} - ${api.name}`, updateError.message);
              throw new Error(`更新API失败 (${api.name}): ${updateError.message}`);
            }
          } else {
            // 创建新API
            console.log(`➕ [创建模式] 创建新API: ${api.name}`);
            savedApi = await prisma.api.create({
              data: apiData,
            });
            console.log(`✅ [创建成功] API已创建: ${savedApi.id} - ${savedApi.name}`);
          }

        // 关联标签（SQLite不支持skipDuplicates，改用循环创建）
        if (api.tagIds && api.tagIds.length > 0) {
          for (const tagId of api.tagIds) {
            try {
              await prisma.apiTag.create({
                data: {
                  apiId: savedApi.id,
                  tagId,
                },
              });
            } catch (error) {
              // 忽略重复错误
              console.log('标签关联已存在，跳过');
            }
          }
        }

        return savedApi;
        } catch (error: any) {
          console.error(`❌ [保存失败] API: ${api.name}`, error);
          throw error;
        }
      })
    );

    // 统计成功和失败的数量
    const savedApis = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedApis = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result, index) => ({
        api: apis[index].name,
        error: result.reason?.message || '未知错误',
      }));

    console.log(`📊 [保存结果] 成功: ${savedApis.length}, 失败: ${failedApis.length}`);
    
    if (failedApis.length > 0) {
      console.error('❌ [失败详情]', failedApis);
    }

    return NextResponse.json({
      success: savedApis.length > 0,
      count: savedApis.length,
      total: apis.length,
      failed: failedApis.length,
      failedDetails: failedApis,
      apis: savedApis,
      message: failedApis.length > 0 
        ? `成功保存 ${savedApis.length} 个API，${failedApis.length} 个失败`
        : `成功保存 ${savedApis.length} 个API`,
    });
  } catch (error: any) {
    console.error('批量保存API失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '保存失败' },
      { status: 500 }
    );
  }
}

