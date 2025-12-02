import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 更新分类名称（会批量更新该分类下的所有 API）
 * POST /api/api-library/update-classification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPath, newName, level } = body;

    if (!oldPath || !newName || !level) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 构建更新条件
    const where: any = {
      isArchived: false,
    };

    // 根据层级设置查询条件
    if (level === 'platform') {
      where.platform = oldPath.platform;
    } else if (level === 'component') {
      where.platform = oldPath.platform;
      where.component = oldPath.component;
    } else if (level === 'feature') {
      where.platform = oldPath.platform;
      where.component = oldPath.component;
      where.feature = oldPath.feature;
    }

    // 构建更新数据
    const updateData: any = {};
    if (level === 'platform') {
      updateData.platform = newName;
    } else if (level === 'component') {
      updateData.component = newName;
    } else if (level === 'feature') {
      updateData.feature = newName;
    }

    // 批量更新所有匹配的 API
    const apiResult = await prisma.api.updateMany({
      where,
      data: updateData,
    });

    // 同时更新 Classification 表
    const classificationWhere: any = {};
    if (level === 'platform') {
      classificationWhere.platform = oldPath.platform;
    } else if (level === 'component') {
      classificationWhere.platform = oldPath.platform;
      classificationWhere.component = oldPath.component;
    } else if (level === 'feature') {
      classificationWhere.platform = oldPath.platform;
      classificationWhere.component = oldPath.component;
      classificationWhere.feature = oldPath.feature;
    }

    const classificationResult = await prisma.classification.updateMany({
      where: classificationWhere,
      data: updateData,
    });

    console.log(`✅ [更新分类] 更新了 ${apiResult.count} 个 API 和 ${classificationResult.count} 个分类记录`);

    return NextResponse.json({
      success: true,
      data: {
        updatedApis: apiResult.count,
        updatedClassifications: classificationResult.count,
      },
    });
  } catch (error) {
    console.error('Error updating classification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update classification',
      },
      { status: 500 }
    );
  }
}

