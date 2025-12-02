import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 查询API列表
 * GET /api/api-library/list?page=1&pageSize=20&method=GET&categoryId=xxx&search=keyword
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const method = searchParams.get('method');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const isStarred = searchParams.get('isStarred') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    // 四层分类筛选
    const platform = searchParams.get('platform');
    const component = searchParams.get('component');
    const feature = searchParams.get('feature');

    // 构建查询条件
    const where: any = {};
    
    // 默认不显示归档的，除非明确要求包括归档的
    if (!includeArchived) {
      where.isArchived = false;
    }

    if (method) {
      where.method = method;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isStarred) {
      where.isStarred = true;
    }
    
    // 四层分类筛选
    // 特殊处理：如果是 "__NULL__" 标识，查询 null 值
    if (platform) {
      if (platform === '__NULL__') {
        where.platform = null;
      } else {
        where.platform = platform;
      }
    }
    if (component) {
      if (component === '__NULL__') {
        where.component = null;
      } else {
        where.component = component;
      }
    }
    if (feature) {
      if (feature === '__NULL__') {
        where.feature = null;
      } else {
        where.feature = feature;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { url: { contains: search } },
        { path: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // 查询总数
    const total = await prisma.api.count({ where });

    // 分页查询
    const apis = await prisma.api.findMany({
      where,
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 列表接口不需要详细的请求/响应数据，移除这些大字段以提高性能和避免内存问题
    const lightweightApis = apis.map(api => ({
      id: api.id,
      createdAt: api.createdAt,
      updatedAt: api.updatedAt,
      name: api.name,
      description: api.description,
      method: api.method,
      url: api.url,
      path: api.path,
      domain: api.domain,
      // 四层分类
      platform: api.platform,
      component: api.component,
      feature: api.feature,
      // 旧的分类（向后兼容）
      categoryId: api.categoryId,
      category: api.category,
      tags: api.tags,
      responseStatus: api.responseStatus,
      requestMimeType: api.requestMimeType,
      responseMimeType: api.responseMimeType,
      responseTime: api.responseTime,
      responseSize: api.responseSize,
      isStarred: api.isStarred,
      isArchived: api.isArchived,
      importSource: api.importSource,
      // 不返回大字段：requestHeaders, requestQuery, requestBody, responseHeaders, responseBody, rawHarEntry, schema, generatedParams
    }));

    return NextResponse.json({
      success: true,
      data: lightweightApis,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('查询API列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}

