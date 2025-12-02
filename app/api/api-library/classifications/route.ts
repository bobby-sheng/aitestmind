import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 获取所有分类结构
 * GET /api/api-library/classifications
 */
export async function GET() {
  try {
    const classifications = await prisma.classification.findMany({
      orderBy: [
        { platform: 'asc' },
        { component: 'asc' },
        { feature: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: classifications,
    });
  } catch (error) {
    console.error('Error fetching classifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch classifications',
      },
      { status: 500 }
    );
  }
}

