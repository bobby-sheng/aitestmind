import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 创建新的分类结构
 * POST /api/api-library/create-classification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, platform, component, feature } = body;

    // 验证必填字段
    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Platform is required' },
        { status: 400 }
      );
    }

    // 检查是否已存在相同的分类
    const existingClassification = await prisma.classification.findFirst({
      where: {
        platform,
        component: component || null,
        feature: feature || null,
      },
    });

    if (existingClassification) {
      return NextResponse.json(
        { success: false, error: '该分类已存在' },
        { status: 400 }
      );
    }

    // 创建分类记录
    const classification = await prisma.classification.create({
      data: {
        platform,
        component: component || null,
        feature: feature || null,
        description: `${platform}${component ? ` > ${component}` : ''}${feature ? ` > ${feature}` : ''}`,
      },
    });

    console.log(`✅ [创建分类] ${platform}${component ? `/${component}` : ''}${feature ? `/${feature}` : ''}`);

    return NextResponse.json({
      success: true,
      data: {
        id: classification.id,
        platform: classification.platform,
        component: classification.component,
        feature: classification.feature,
      },
    });
  } catch (error) {
    console.error('Error creating classification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create classification',
      },
      { status: 500 }
    );
  }
}




