import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let withSuite: any;
  let withCases: any;
  let ormWithRelations: any;
  
  try {
    console.log('========== Prisma Debug Test ==========');
    
    // Test 1: 查询不带 Json 字段
    console.log('Test 1: 查询基本字段（不包含 Json）');
    const basicQuery = await prisma.$queryRaw`
      SELECT id, suiteName, status, totalCases 
      FROM TestSuiteExecution 
      WHERE id = 'cmhwujlij00011yvub3s3379b'
    `;
    console.log('✓ 基本查询成功:', basicQuery);
    
    // Test 2: 查询 Json 字段原始值
    console.log('\nTest 2: 查询 environmentSnapshot 原始值');
    const jsonRaw = await prisma.$queryRaw`
      SELECT id, environmentSnapshot 
      FROM TestSuiteExecution 
      WHERE id = 'cmhwujlij00011yvub3s3379b'
    `;
    console.log('✓ 原始查询成功:', jsonRaw);
    
    // Test 3: 使用 Prisma ORM 查询（不包含关联）
    console.log('\nTest 3: Prisma ORM 查询（无关联）');
    const ormSimple = await prisma.testSuiteExecution.findUnique({
      where: { id: 'cmhwujlij00011yvub3s3379b' },
    });
    console.log('✓ ORM 简单查询成功');
    
    // Test 4: 查询 suite 关联
    console.log('\nTest 4: 查询 suite 关联');
    const withSuite = await prisma.testSuiteExecution.findUnique({
      where: { id: 'cmhwujlij00011yvub3s3379b' },
      include: {
        suite: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
    console.log('✓ 包含 suite 查询成功');
    
    // Test 5: 查询 caseExecutions（不包含 stepExecutions）
    console.log('\nTest 5: 查询 caseExecutions（不包含子查询）');
    const withCases = await prisma.testSuiteExecution.findUnique({
      where: { id: 'cmhwujlij00011yvub3s3379b' },
      include: {
        caseExecutions: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    console.log('✓ 包含 caseExecutions 查询成功');
    console.log('  caseExecutions 数量:', withCases?.caseExecutions?.length);
    
    // Test 6: 完整关联查询
    console.log('\nTest 6: 完整关联查询（包含 stepExecutions）');
    const ormWithRelations = await prisma.testSuiteExecution.findUnique({
      where: { id: 'cmhwujlij00011yvub3s3379b' },
      include: {
        suite: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        caseExecutions: {
          include: {
            stepExecutions: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    console.log('✓ ORM 完整查询成功');
    
    return NextResponse.json({
      success: true,
      message: '所有测试通过！',
      data: {
        basic: basicQuery,
        withSuite: withSuite ? 'success' : 'not tested',
        withCases: withCases ? `success (${withCases.caseExecutions.length} cases)` : 'not tested',
        execution: ormWithRelations ? 'success' : 'not tested',
      },
    });
    
  } catch (error: any) {
    console.error('========== Error ==========');
    console.error('错误类型:', error.constructor.name);
    console.error('错误代码:', error.code);
    console.error('错误消息:', error.message);
    console.error('完整错误:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        name: error.constructor.name,
        code: error.code,
        message: error.message,
        stack: error.stack,
      },
    }, { status: 500 });
  }
}

