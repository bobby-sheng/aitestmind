import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parameterizePath } from '@/lib/path-parameterization';

export const dynamic = 'force-dynamic';

/**
 * 检查API是否重复
 * POST /api/api-library/check-duplicates
 * 
 * 请求体：
 * {
 *   apis: Array<{
 *     id?: string;  // 临时ID用于前端关联
 *     method: string;
 *     url: string;
 *     path?: string;
 *     name?: string;
 *   }>
 * }
 * 
 * 响应：
 * {
 *   success: true,
 *   data: Array<{
 *     inputApi: {...},        // 输入的API
 *     isDuplicate: boolean,   // 是否重复
 *     existingApi?: {...}     // 已存在的API（如果重复）
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apis } = body as {
      apis: Array<{
        id?: string;
        method: string;
        url: string;
        path?: string;
        name?: string;
      }>;
    };

    if (!apis || !Array.isArray(apis) || apis.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要检查的API列表' },
        { status: 400 }
      );
    }

    // 检查每个API是否重复
    const checkResults = await Promise.all(
      apis.map(async (api) => {
        // 提取或生成路径
        let apiPath = api.path;
        if (!apiPath) {
          try {
            const urlObj = new URL(api.url);
            apiPath = urlObj.pathname;
          } catch (error) {
            apiPath = api.url;
          }
        }

        // GET 请求：忽略 query，只按 pathname 判重
        if (api.method?.toUpperCase() === 'GET' && apiPath) {
          apiPath = apiPath.split('?')[0];
        }

        // 参数化路径（统一格式）
        const paramResult = parameterizePath(apiPath);
        const normalizedPath = paramResult.parameterizedPath;
        const normalizedMethod = api.method.toUpperCase();

        // 在数据库中查找是否存在相同 method + path 的API
        // 方案A：对于 GET，历史数据中可能保存了带 query 的 path，这里同时匹配
        const whereForMethodAndPath: any = {
          method: normalizedMethod,
          name: {
            not: '_CLASSIFICATION_PLACEHOLDER_', // 排除占位API
          },
        };

        if (normalizedMethod === 'GET') {
          whereForMethodAndPath.OR = [
            { path: normalizedPath },
            { path: { startsWith: normalizedPath + '?' } },
          ];
        } else {
          whereForMethodAndPath.path = normalizedPath;
        }

        const existingApi = await prisma.api.findFirst({
          where: whereForMethodAndPath,
          include: {
            category: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        return {
          inputApi: api,
          isDuplicate: !!existingApi,
          existingApi: existingApi || undefined,
          normalizedPath,
          normalizedMethod,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: checkResults,
    });
  } catch (error: any) {
    console.error('检查API重复失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '检查失败' },
      { status: 500 }
    );
  }
}

