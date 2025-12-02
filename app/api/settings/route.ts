/**
 * 平台设置 API
 * GET: 获取设置
 * PUT: 更新设置
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取平台设置
 */
export async function GET() {
  try {
    // 获取第一条设置记录（只有一条）
    let settings = await prisma.platformSettings.findFirst();

    // 如果不存在，创建默认设置
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {},
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('获取设置失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取设置失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新平台设置
 */
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    // 获取第一条设置记录
    let settings = await prisma.platformSettings.findFirst();

    if (settings) {
      // 更新现有设置
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
          // 环境配置
          baseUrl: data.baseUrl !== undefined ? data.baseUrl : settings.baseUrl,
          authTokenEnabled: data.authTokenEnabled !== undefined ? data.authTokenEnabled : settings.authTokenEnabled,
          authTokenKey: data.authTokenKey !== undefined ? data.authTokenKey : settings.authTokenKey,
          authTokenValue: data.authTokenValue !== undefined ? data.authTokenValue : settings.authTokenValue,
          sessionEnabled: data.sessionEnabled !== undefined ? data.sessionEnabled : settings.sessionEnabled,
          loginApiUrl: data.loginApiUrl !== undefined ? data.loginApiUrl : settings.loginApiUrl,
          loginMethod: data.loginMethod !== undefined ? data.loginMethod : settings.loginMethod,
          loginRequestHeaders: data.loginRequestHeaders !== undefined ? data.loginRequestHeaders : settings.loginRequestHeaders,
          loginRequestBody: data.loginRequestBody !== undefined ? data.loginRequestBody : settings.loginRequestBody,
          sessionCookies: data.sessionCookies !== undefined ? data.sessionCookies : settings.sessionCookies,
          sessionUpdatedAt: data.sessionUpdatedAt !== undefined ? data.sessionUpdatedAt : settings.sessionUpdatedAt,

          // AI 配置
          aiEnabled: data.aiEnabled !== undefined ? data.aiEnabled : settings.aiEnabled,
          aiProvider: data.aiProvider !== undefined ? data.aiProvider : settings.aiProvider,
          aiModel: data.aiModel !== undefined ? data.aiModel : settings.aiModel,
          aiApiKey: data.aiApiKey !== undefined ? data.aiApiKey : settings.aiApiKey,
          aiBaseUrl: data.aiBaseUrl !== undefined ? data.aiBaseUrl : settings.aiBaseUrl,
          aiTemperature: data.aiTemperature !== undefined ? data.aiTemperature : settings.aiTemperature,
          aiMaxTokens: data.aiMaxTokens !== undefined ? data.aiMaxTokens : settings.aiMaxTokens,
          aiTopP: data.aiTopP !== undefined ? data.aiTopP : settings.aiTopP,

          // 请求头过滤配置
          allowedHeaders: data.allowedHeaders !== undefined ? data.allowedHeaders : settings.allowedHeaders,

          // 其他配置
          otherConfig: data.otherConfig !== undefined ? data.otherConfig : settings.otherConfig,
        },
      });
    } else {
      // 创建新设置
      settings = await prisma.platformSettings.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('更新设置失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '更新设置失败',
      },
      { status: 500 }
    );
  }
}

