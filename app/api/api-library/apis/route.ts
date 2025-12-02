import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parameterizePath } from '@/lib/path-parameterization';

export const dynamic = 'force-dynamic';

/**
 * 创建新API
 * POST /api/api-library/apis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      method,
      url,
      path,
      categoryId,
      tags,
      requestHeaders,
      requestQuery,
      requestBody,
      requestMimeType,
      responseStatus,
      responseHeaders,
      responseBody,
      responseMimeType,
      // 四层分类
      platform,
      component,
      feature,
    } = body;

    // 验证必填字段
    if (!name || !method || !url) {
      return NextResponse.json(
        { success: false, error: '名称、方法和URL为必填项' },
        { status: 400 }
      );
    }

    // 提取域名和路径
    let domain = null;
    let apiPath = path;
    let originalPath = path;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
      if (!apiPath) {
        // 只保存pathname，不包含查询参数（查询参数是可变的）
        apiPath = urlObj.pathname;
        originalPath = urlObj.pathname;
      }
    } catch (error) {
      // 如果URL解析失败，使用原始值
      if (!apiPath) {
        apiPath = url;
        originalPath = url;
      }
    }

    // 参数化路径（统一格式，便于冲突检测）
    const paramResult = parameterizePath(apiPath);
    apiPath = paramResult.parameterizedPath;
    
    if (paramResult.isParameterized) {
      console.log(`🔧 [创建时参数化] ${originalPath} → ${paramResult.parameterizedPath}`);
    }

    // JSON序列化辅助函数
    const safeJsonStringify = (data: any) => {
      if (!data) return null;
      if (typeof data === 'string') {
        try {
          JSON.parse(data);
          return data;
        } catch {
          return JSON.stringify(data);
        }
      }
      return JSON.stringify(data);
    };

    // 如果提供了四层分类，自动创建 classification 记录（如果不存在）
    if (platform) {
      // 创建平台级分类
      const existingPlatform = await prisma.classification.findFirst({
        where: {
          platform,
          component: null,
          feature: null,
        },
      });

      if (!existingPlatform) {
        await prisma.classification.create({
          data: {
            platform,
            component: null,
            feature: null,
            description: platform,
          },
        });
        console.log(`✅ [自动创建分类] 平台: ${platform}`);
      }

      // 如果有组件，创建组件级分类
      if (component) {
        const existingComponent = await prisma.classification.findFirst({
          where: {
            platform,
            component,
            feature: null,
          },
        });

        if (!existingComponent) {
          await prisma.classification.create({
            data: {
              platform,
              component,
              feature: null,
              description: `${platform} > ${component}`,
            },
          });
          console.log(`✅ [自动创建分类] 组件: ${platform} > ${component}`);
        }

        // 如果有功能，创建功能级分类
        if (feature) {
          const existingFeature = await prisma.classification.findFirst({
            where: {
              platform,
              component,
              feature,
            },
          });

          if (!existingFeature) {
            await prisma.classification.create({
              data: {
                platform,
                component,
                feature,
                description: `${platform} > ${component} > ${feature}`,
              },
            });
            console.log(`✅ [自动创建分类] 功能: ${platform} > ${component} > ${feature}`);
          }
        }
      }
    }

    // 创建API记录
    const api = await prisma.api.create({
      data: {
        name,
        description: description || null,
        method: method.toUpperCase(),
        url,
        path: apiPath,
        domain,
        categoryId: categoryId || null,
        // 四层分类
        platform: platform || null,
        component: component || null,
        feature: feature || null,
        requestHeaders: safeJsonStringify(requestHeaders),
        requestQuery: safeJsonStringify(requestQuery),
        requestBody: safeJsonStringify(requestBody),
        requestMimeType: requestMimeType || null,
        responseStatus: responseStatus || null,
        responseHeaders: safeJsonStringify(responseHeaders),
        responseBody: safeJsonStringify(responseBody),
        responseMimeType: responseMimeType || null,
      },
    });

    // 关联标签 (SQLite 不支持 createMany 的 skipDuplicates，使用循环创建)
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        try {
          await prisma.apiTag.create({
            data: {
              apiId: api.id,
              tagId,
            },
          });
        } catch (error: any) {
          // 忽略重复记录错误 (唯一键冲突)
          if (!error.message?.includes('Unique constraint')) {
            throw error;
          }
        }
      }
    }

    // 重新查询以包含关联数据
    const createdApi = await prisma.api.findUnique({
      where: { id: api.id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: createdApi,
    });
  } catch (error: any) {
    console.error('创建API失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建失败' },
      { status: 500 }
    );
  }
}

