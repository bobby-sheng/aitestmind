import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 获取所有标签
 * GET /api/api-library/tags
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: { apis: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: tags,
    });
  } catch (error: any) {
    console.error('查询标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建新标签
 * POST /api/api-library/tags
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '标签名称不能为空' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    console.error('创建标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建失败' },
      { status: 500 }
    );
  }
}

