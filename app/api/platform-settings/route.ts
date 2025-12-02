import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取平台设置
export async function GET() {
  try {
    // 获取最新的设置记录（只应该有一条）
    let settings = await prisma.platformSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 如果没有设置记录，创建一个默认的
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          baseUrl: '',
          authTokenEnabled: false,
          authTokenKey: '',
          authTokenValue: '',
          sessionEnabled: false,
          loginApiUrl: '',
          loginMethod: 'POST',
          loginRequestHeaders: {},
          loginRequestBody: {},
          sessionCookies: '',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch platform settings',
      },
      { status: 500 }
    );
  }
}

// 保存/更新平台设置
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // 查找现有设置
    const existingSettings = await prisma.platformSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    let settings;
    if (existingSettings) {
      // 更新现有设置（不更新sessionCookies，由测试登录接口自动管理）
      settings = await prisma.platformSettings.update({
        where: {
          id: existingSettings.id,
        },
        data: {
          baseUrl: body.baseUrl,
          authTokenEnabled: body.authTokenEnabled,
          authTokenKey: body.authTokenKey,
          authTokenValue: body.authTokenValue,
          sessionEnabled: body.sessionEnabled,
          loginApiUrl: body.loginApiUrl,
          loginMethod: body.loginMethod,
          loginRequestHeaders: body.loginRequestHeaders,
          loginRequestBody: body.loginRequestBody,
        },
      });
    } else {
      // 创建新设置
      settings = await prisma.platformSettings.create({
        data: body,
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error saving platform settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save platform settings',
      },
      { status: 500 }
    );
  }
}

