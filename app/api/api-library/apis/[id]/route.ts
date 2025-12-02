import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parameterizePath } from '@/lib/path-parameterization';

export const dynamic = 'force-dynamic';

/**
 * 获取API详情
 * GET /api/api-library/apis/[id]
 * 查询参数:
 *   - includeRawHar=true: 包含完整的 rawHarEntry 数据（默认为 false，因为数据量大）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeRawHar = searchParams.get('includeRawHar') === 'true';
    
    const api = await prisma.api.findUnique({
      where: { id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!api) {
      return NextResponse.json(
        { success: false, error: 'API不存在' },
        { status: 404 }
      );
    }

    // 安全地解析 JSON 字段（从字符串转为对象）
    const safeJsonParse = (jsonString: string | null) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.error('JSON parse error:', e);
        return null;
      }
    };

    const parsedApi = {
      ...api,
      requestHeaders: safeJsonParse(api.requestHeaders),
      requestQuery: safeJsonParse(api.requestQuery),
      requestBody: safeJsonParse(api.requestBody),
      responseHeaders: safeJsonParse(api.responseHeaders),
      responseBody: safeJsonParse(api.responseBody),
      // 只在明确请求时才返回 rawHarEntry（数据量大）
      rawHarEntry: includeRawHar ? safeJsonParse(api.rawHarEntry as string) : undefined,
    };

    return NextResponse.json({
      success: true,
      data: parsedApi,
    });
  } catch (error: any) {
    console.error('查询API详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新API
 * PUT /api/api-library/apis/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const {
      name,
      description,
      path,
      categoryId,
      platform,
      component,
      feature,
      tags,
      isStarred,
      isArchived,
      requestHeaders,
      requestQuery,
      requestBody,
      responseHeaders,
      responseBody,
      rawHarEntry,
    } = body;

    // 如果提供了四层分类，自动创建 classification 记录（如果不存在）
    if (platform !== undefined && platform) {
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
      if (component !== undefined && component) {
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
        if (feature !== undefined && feature) {
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

    // 更新API基本信息
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (path !== undefined) {
      // 自动参数化路径
      const paramResult = parameterizePath(path);
      updateData.path = paramResult.parameterizedPath;
      
      if (paramResult.isParameterized && path !== paramResult.parameterizedPath) {
        console.log(`🔧 [更新时参数化] ${path} → ${paramResult.parameterizedPath}`);
      }
    }
    // 处理外键字段：空字符串转换为 null（避免外键约束错误）
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (platform !== undefined) updateData.platform = platform || null;
    if (component !== undefined) updateData.component = component || null;
    if (feature !== undefined) updateData.feature = feature || null;
    if (isStarred !== undefined) updateData.isStarred = isStarred;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    
    // 更新请求和响应数据（需要序列化为 JSON 字符串）
    if (requestHeaders !== undefined) {
      updateData.requestHeaders = typeof requestHeaders === 'string' 
        ? requestHeaders 
        : JSON.stringify(requestHeaders);
    }
    if (requestQuery !== undefined) {
      updateData.requestQuery = typeof requestQuery === 'string' 
        ? requestQuery 
        : JSON.stringify(requestQuery);
    }
    if (requestBody !== undefined) {
      updateData.requestBody = typeof requestBody === 'string' 
        ? requestBody 
        : JSON.stringify(requestBody);
    }
    if (responseHeaders !== undefined) {
      updateData.responseHeaders = typeof responseHeaders === 'string' 
        ? responseHeaders 
        : JSON.stringify(responseHeaders);
    }
    if (responseBody !== undefined) {
      updateData.responseBody = typeof responseBody === 'string' 
        ? responseBody 
        : JSON.stringify(responseBody);
    }
    if (rawHarEntry !== undefined) {
      updateData.rawHarEntry = typeof rawHarEntry === 'string' 
        ? rawHarEntry 
        : JSON.stringify(rawHarEntry);
    }
    
    // 安全检查：确保 updateData 中只包含 Prisma schema 定义的字段
    const allowedFields = new Set([
      'name', 'description', 'path', 'categoryId', 'isStarred', 'isArchived',
      'platform', 'component', 'feature', // 🆕 四层分类字段
      'requestHeaders', 'requestQuery', 'requestBody', 'requestMimeType',
      'responseStatus', 'responseHeaders', 'responseBody', 'responseMimeType',
      'rawHarEntry'
    ]);
    
    // 过滤掉不在 schema 中的字段
    const filteredUpdateData: any = {};
    for (const key of Object.keys(updateData)) {
      if (allowedFields.has(key)) {
        filteredUpdateData[key] = updateData[key];
      } else {
        console.warn(`Filtered out unknown field: ${key}`);
      }
    }

    const api = await prisma.api.update({
      where: { id },
      data: filteredUpdateData,
    });

    // 如果提供了标签，更新标签关联
    if (tags && Array.isArray(tags)) {
      // 删除旧的标签关联
      await prisma.apiTag.deleteMany({
        where: { apiId: id },
      });

      // 创建新的标签关联
      if (tags.length > 0) {
        await prisma.apiTag.createMany({
          data: tags.map((tagId: string) => ({
            apiId: id,
            tagId,
          })),
        });
      }
    }

    // 重新查询以包含关联数据
    const updatedApi = await prisma.api.findUnique({
      where: { id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // 安全地解析 JSON 字段（从字符串转为对象）
    const safeJsonParse = (jsonString: string | null) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.error('JSON parse error:', e);
        return null;
      }
    };

    // PUT 响应默认不返回 rawHarEntry（减少响应大小，提高性能）
    // 只有在更新数据中包含了 rawHarEntry 时才返回
    const parsedUpdatedApi = updatedApi ? {
      ...updatedApi,
      requestHeaders: safeJsonParse(updatedApi.requestHeaders),
      requestQuery: safeJsonParse(updatedApi.requestQuery),
      requestBody: safeJsonParse(updatedApi.requestBody),
      responseHeaders: safeJsonParse(updatedApi.responseHeaders),
      responseBody: safeJsonParse(updatedApi.responseBody),
      // 只有在更新数据中包含了 rawHarEntry 时才返回，否则为 undefined
      rawHarEntry: updateData.rawHarEntry ? safeJsonParse(updatedApi.rawHarEntry as string) : undefined,
    } : null;

    return NextResponse.json({
      success: true,
      data: parsedUpdatedApi,
    });
  } catch (error: any) {
    console.error('更新API失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除API
 * DELETE /api/api-library/apis/[id]
 * 查询参数:
 *   - force=true: 强制删除（即使有测试用例引用）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    // 检查是否有测试用例引用了这个API
    const referencingSteps = await prisma.testStep.findMany({
      where: { apiId: id },
      include: {
        testCase: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });
    
    if (referencingSteps.length > 0 && !force) {
      // 有引用且不是强制删除，返回警告
      const testCasesInfo = referencingSteps.map(step => ({
        id: step.testCase.id,
        name: step.testCase.name,
        status: step.testCase.status,
        stepName: step.name,
      }));
      
      // 去重（同一个测试用例可能有多个步骤引用这个API）
      const uniqueTestCases = Array.from(
        new Map(testCasesInfo.map(tc => [tc.id, tc])).values()
      );
      
      return NextResponse.json({
        success: false,
        error: 'API_IN_USE',
        message: `该API被 ${uniqueTestCases.length} 个测试用例引用，无法删除`,
        data: {
          referencingTestCases: uniqueTestCases,
          totalReferences: referencingSteps.length,
        },
      }, { status: 400 });
    }
    
    // 强制删除或没有引用，清理引用并删除
    if (referencingSteps.length > 0 && force) {
      // 清理所有引用的步骤中的apiId
      await prisma.testStep.updateMany({
        where: { apiId: id },
        data: { apiId: null },
      });
      
      console.log(`⚠️ [强制删除API] 已清理 ${referencingSteps.length} 个步骤中的API引用`);
    }
    
    await prisma.api.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
      clearedReferences: force ? referencingSteps.length : 0,
    });
  } catch (error: any) {
    console.error('删除API失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除失败' },
      { status: 500 }
    );
  }
}

