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

    // 兼容第四层“子功能”类型：在后端统一按 feature 字段处理
    const normalizedLevel = level === 'subFeature' ? 'feature' : level;

    if (!oldPath || !newName || !normalizedLevel) {
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
    if (normalizedLevel === 'platform') {
      where.platform = oldPath.platform;
    } else if (normalizedLevel === 'component') {
      where.platform = oldPath.platform;
      where.component = oldPath.component;
    } else if (normalizedLevel === 'feature') {
      where.platform = oldPath.platform;
      where.component = oldPath.component;
      where.feature = oldPath.feature;
    }

    // 构建更新数据
    const updateData: any = {};

    if (normalizedLevel === 'platform') {
      updateData.platform = newName;
    } else if (normalizedLevel === 'component') {
      updateData.component = newName;
    } else if (normalizedLevel === 'feature') {
      // feature 字段中存的是完整路径（例如 "父功能 > 子功能"）
      // 这里只替换最后一段名称，保持父级路径不变
      const oldFeaturePath = oldPath.feature as string | undefined;
      if (oldFeaturePath) {
        const segments = oldFeaturePath
          .split('>')
          .map((s) => s.trim())
          .filter(Boolean);

        if (segments.length <= 1) {
          // 只有一段，直接替换为新名称
          updateData.feature = newName;
        } else {
          // 多级路径：仅替换最后一段
          segments[segments.length - 1] = newName;
          updateData.feature = segments.join(' > ');
        }
      } else {
        // 兜底：没有旧路径信息时，退化为简单赋值
        updateData.feature = newName;
      }
    }

    // 批量更新所有匹配的 API
    const apiResult = await prisma.api.updateMany({
      where,
      data: updateData,
    });

    // 同时更新 Classification 表
    const classificationWhere: any = {};
    if (normalizedLevel === 'platform') {
      classificationWhere.platform = oldPath.platform;
    } else if (normalizedLevel === 'component') {
      classificationWhere.platform = oldPath.platform;
      classificationWhere.component = oldPath.component;
    } else if (normalizedLevel === 'feature') {
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

