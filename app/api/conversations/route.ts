import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取所有对话列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isArchived = searchParams.get('archived') === 'true';
    const isStarred = searchParams.get('starred') === 'true';

    const conversations = await prisma.conversation.findMany({
      where: {
        ...(searchParams.has('archived') && { isArchived }),
        ...(searchParams.has('starred') && { isStarred }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // 只取第一条消息用于预览
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('获取对话列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取对话列表失败' },
      { status: 500 }
    );
  }
}

// 创建新对话
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message } = body;

    // 创建对话
    const conversation = await prisma.conversation.create({
      data: {
        title: title || '新对话',
        messages: {
          create: message
            ? [
                {
                  role: message.role || 'user',
                  content: message.content,
                },
              ]
            : [],
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('创建对话失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建对话失败' },
      { status: 500 }
    );
  }
}

