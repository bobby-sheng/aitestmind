import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 添加消息到对话
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role, content, metadata } = body;

    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: 'role 和 content 为必填项' },
        { status: 400 }
      );
    }

    // 创建消息
    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: id,
        role,
        content,
        ...(metadata && { metadata }),
      },
    });

    // 更新对话的 updatedAt
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('添加消息失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '添加消息失败' },
      { status: 500 }
    );
  }
}

// 获取对话的所有消息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('获取消息列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取消息列表失败' },
      { status: 500 }
    );
  }
}

