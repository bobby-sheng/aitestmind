/**
 * 任务 11 测试：测试用例优先级（P0-P3）
 * 方案A：priority 存在于 TestCase 上，默认 P2
 */
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { GET as LIST, POST as CREATE } from '../app/api/test-cases/route';
import { PUT as UPDATE } from '../app/api/test-cases/[id]/route';

const prisma = new PrismaClient();

function buildMinimalFlowConfig() {
  return {
    nodes: [{ id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
  };
}

describe('Task 11: TestCase priority (P0-P3)', () => {
  beforeEach(async () => {
    await prisma.testStep.deleteMany({
      where: { testCase: { name: { contains: 'Priority测试' } } },
    });
    await prisma.testCase.deleteMany({
      where: { name: { contains: 'Priority测试' } },
    });
  });

  afterAll(async () => {
    await prisma.testStep.deleteMany({
      where: { testCase: { name: { contains: 'Priority测试' } } },
    });
    await prisma.testCase.deleteMany({
      where: { name: { contains: 'Priority测试' } },
    });
    await prisma.$disconnect();
  });

  test('数据库表 TestCase 应该包含 priority 字段', async () => {
    const columns = await prisma.$queryRawUnsafe<any[]>(
      "PRAGMA table_info('TestCase')"
    );
    const colNames = columns.map((c) => c.name);
    expect(colNames).toContain('priority');
  });

  test('创建 TestCase 不传 priority 时默认 P2', async () => {
    const created = await prisma.testCase.create({
      data: {
        name: 'Priority测试-默认值',
        description: null,
        status: 'draft',
        category: null,
        tags: '[]',
        flowConfig: JSON.stringify(buildMinimalFlowConfig()),
      } as any,
    });

    expect((created as any).priority).toBe('P2');
  });

  test('API 创建 TestCase 支持 priority，并在列表中返回', async () => {
    const createReq = new NextRequest('http://localhost/api/test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priority测试-API创建',
        description: '',
        status: 'draft',
        category: null,
        tags: [],
        priority: 'P0',
        flowConfig: buildMinimalFlowConfig(),
        steps: [],
      }),
    });

    const createRes = await CREATE(createReq);
    const createData = await createRes.json();
    expect(createRes.status).toBe(200);
    expect(createData.success).toBe(true);
    expect(createData.data).toBeDefined();
    expect(createData.data.priority).toBe('P0');

    const listReq = new NextRequest('http://localhost/api/test-cases?page=1&pageSize=20');
    const listRes = await LIST(listReq);
    const listData = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listData.success).toBe(true);
    expect(Array.isArray(listData.data)).toBe(true);

    const found = listData.data.find((tc: any) => tc.name === 'Priority测试-API创建');
    expect(found).toBeDefined();
    expect(found.priority).toBe('P0');
  });

  test('API 更新 TestCase priority', async () => {
    const created = await prisma.testCase.create({
      data: {
        name: 'Priority测试-更新',
        description: null,
        status: 'draft',
        category: null,
        tags: '[]',
        flowConfig: JSON.stringify(buildMinimalFlowConfig()),
      } as any,
    });

    const updateReq = new NextRequest(`http://localhost/api/test-cases/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: created.name,
        description: created.description,
        status: created.status,
        category: created.category,
        tags: [],
        priority: 'P1',
        flowConfig: buildMinimalFlowConfig(),
        steps: [],
      }),
    });

    const updateRes = await UPDATE(updateReq, { params: Promise.resolve({ id: created.id }) });
    const updateData = await updateRes.json();
    expect(updateRes.status).toBe(200);
    expect(updateData.success).toBe(true);
    expect(updateData.data.priority).toBe('P1');
  });
});

