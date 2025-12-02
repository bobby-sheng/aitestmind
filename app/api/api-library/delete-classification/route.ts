import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 删除分类结构
 * POST /api/api-library/delete-classification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, component, feature } = body;

    // 验证必填字段
    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Platform is required' },
        { status: 400 }
      );
    }

    // 构建删除条件
    const classificationWhere: any = { platform };

    if (feature !== undefined) {
      // 删除功能层级
      classificationWhere.component = component;
      classificationWhere.feature = feature;
    } else if (component !== undefined) {
      // 删除组件层级（包括其下所有功能）
      classificationWhere.component = component;
    }
    // 如果只有 platform，则删除该平台及其下所有分类

    // 删除分类记录
    const deleteResult = await prisma.classification.deleteMany({
      where: classificationWhere,
    });

    // 将该分类下的所有 API 移动到默认分类
    const updateWhere: any = { isArchived: false };

    if (feature !== undefined) {
      updateWhere.platform = platform;
      updateWhere.component = component;
      updateWhere.feature = feature;
    } else if (component !== undefined) {
      updateWhere.platform = platform;
      updateWhere.component = component;
    } else {
      updateWhere.platform = platform;
    }

    // 将匹配的 API 移动到默认分类
    const updateResult = await prisma.api.updateMany({
      where: updateWhere,
      data: {
        platform: null,
        component: null,
        feature: null,
      },
    });

    console.log(`✅ [删除分类] 删除了 ${deleteResult.count} 个分类记录，已将 ${updateResult.count} 个 API 移动到未分类`);

    return NextResponse.json({
      success: true,
      data: {
        deletedClassifications: deleteResult.count,
        movedApis: updateResult.count,
        message: `分类已删除，${updateResult.count} 个 API 已移动到未分类`,
      },
    });
  } catch (error) {
    console.error('Error deleting classification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete classification',
      },
      { status: 500 }
    );
  }
}

