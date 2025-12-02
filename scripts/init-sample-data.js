/**
 * 初始化示例测试数据脚本
 * 为新用户提供预置的API和测试用例，方便快速体验功能
 * 运行方式: node scripts/init-sample-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initSampleData() {
  try {
    console.log('🚀 开始初始化示例测试数据...');
    console.log('');

    // 1. 检查是否已经有示例数据
    const existingApis = await prisma.api.count({
      where: {
        id: {
          startsWith: 'sample_api_',
        },
      },
    });

    if (existingApis > 0) {
      console.log('✅ 示例数据已存在，跳过API创建');
    } else {
      // 2. 创建三层分类
      console.log('📁 创建分类结构...');
      
      await prisma.classification.upsert({
        where: {
          platform_component_feature: {
            platform: 'JSONPlaceholder',
            component: 'Posts',
            feature: 'Post Management',
          },
        },
        create: {
          platform: 'JSONPlaceholder',
          component: 'Posts',
          feature: 'Post Management',
          description: 'JSONPlaceholder 公开测试API - 文章管理',
        },
        update: {},
      });

      await prisma.classification.upsert({
        where: {
          platform_component_feature: {
            platform: 'JSONPlaceholder',
            component: 'Todos',
            feature: 'Todo Management',
          },
        },
        create: {
          platform: 'JSONPlaceholder',
          component: 'Todos',
          feature: 'Todo Management',
          description: 'JSONPlaceholder 公开测试API - 待办事项管理',
        },
        update: {},
      });

      console.log('   ✓ 分类结构创建完成');
      console.log('');

      // 3. 创建示例 API
      console.log('🔌 创建示例 API...');
      
      const api1 = await prisma.api.create({
        data: {
          id: 'sample_api_get_all_posts',
          name: 'get_all_post_data',
          description: '获取所有文章列表',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts',
          path: '/posts',
          domain: 'jsonplaceholder.typicode.com',
          platform: 'JSONPlaceholder',
          component: 'Posts',
          feature: 'Post Management',
          requestHeaders: JSON.stringify({ 'Content-Type': 'application/json' }),
          requestQuery: JSON.stringify({}),
          requestBody: null,
          responseBody: JSON.stringify([
            {
              userId: 1,
              id: 1,
              title: 'sunt aut facere repellat provident',
              body: 'quia et suscipit...',
            },
          ]),
          responseStatus: 200,
          importSource: 'sample',
        },
      });
      console.log(`   ✓ ${api1.name} (${api1.method} ${api1.path})`);

      const api2 = await prisma.api.create({
        data: {
          id: 'sample_api_get_post_by_id',
          name: 'get_post_info',
          description: '根据ID获取文章详情',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/{postsId}',
          path: '/posts/{postsId}',
          domain: 'jsonplaceholder.typicode.com',
          platform: 'JSONPlaceholder',
          component: 'Posts',
          feature: 'Post Management',
          requestHeaders: JSON.stringify({ 'Content-Type': 'application/json' }),
          requestQuery: JSON.stringify({}),
          requestBody: null,
          responseBody: JSON.stringify({
            userId: 1,
            id: 1,
            title: 'sunt aut facere repellat provident',
            body: 'quia et suscipit...',
          }),
          responseStatus: 200,
          importSource: 'sample',
        },
      });
      console.log(`   ✓ ${api2.name} (${api2.method} ${api2.path})`);

      const api3 = await prisma.api.create({
        data: {
          id: 'sample_api_get_comments',
          name: 'get_post_comments',
          description: '获取文章的所有评论',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/{postsId}/comments',
          path: '/posts/{postsId}/comments',
          domain: 'jsonplaceholder.typicode.com',
          platform: 'JSONPlaceholder',
          component: 'Posts',
          feature: 'Post Management',
          requestHeaders: JSON.stringify({ 'Content-Type': 'application/json' }),
          requestQuery: JSON.stringify({}),
          requestBody: null,
          responseBody: JSON.stringify([
            {
              postId: 1,
              id: 1,
              name: 'id labore ex et quam laborum',
              email: 'Eliseo@gardner.biz',
              body: 'laudantium enim quasi est quidem magnam...',
            },
          ]),
          responseStatus: 200,
          importSource: 'sample',
        },
      });
      console.log(`   ✓ ${api3.name} (${api3.method} ${api3.path})`);

      const api4 = await prisma.api.create({
        data: {
          id: 'sample_api_get_todo',
          name: 'get_tools',
          description: '获取待办事项',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/todos/{todosId}',
          path: '/todos/{todosId}',
          domain: 'jsonplaceholder.typicode.com',
          platform: 'JSONPlaceholder',
          component: 'Todos',
          feature: 'Todo Management',
          requestHeaders: JSON.stringify({ 'Content-Type': 'application/json' }),
          requestQuery: JSON.stringify({}),
          requestBody: null,
          responseBody: JSON.stringify({
            userId: 1,
            id: 1,
            title: 'delectus aut autem',
            completed: false,
          }),
          responseStatus: 200,
          importSource: 'sample',
        },
      });
      console.log(`   ✓ ${api4.name} (${api4.method} ${api4.path})`);
      
      console.log('');
    }

    // 4. 检查测试用例是否存在，如果存在则更新，否则创建
    const existingTestCase = await prisma.testCase.findUnique({
      where: { id: 'sample_testcase_e2e_comments' },
    });

    console.log(existingTestCase ? '🔄 更新现有测试用例...' : '📝 创建示例测试用例...');
    
    // 使用与 dev.db 完全相同的数据结构
    const flowConfig = {
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 100, y: 50 },
          data: {},
          measured: { width: 96, height: 52 },
        },
        {
          id: 'step_1',
          type: 'api',
          position: { x: 100, y: 150 },
          data: {
            apiId: 'sample_api_get_all_posts',
            name: 'get_all_post_data',
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts',
            requestConfig: {
              pathParams: {},
              queryParams: {},
              headers: {
                'Content-Type': {
                  valueType: 'fixed',
                  value: 'application/json'
                }
              },
              body: {}
            },
            responseExtract: [
              {
                id: 'extract_1',
                path: '0.userId',
                variable: 'userId',
                description: '提取第一篇文章的userId'
              }
            ],
            assertions: [
              {
                id: 'assertion_1',
                field: 'status',
                operator: 'equals',
                expected: '200',
                expectedType: 'number'
              }
            ],
            wait: {
              type: 'time',
              value: 0
            }
          },
          measured: { width: 221, height: 94 },
        },
        {
          id: 'step_2',
          type: 'api',
          position: { x: 400, y: 150 },
          data: {
            apiId: 'sample_api_get_post_by_id',
            name: 'get_post_info',
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts/{postsId}',
            requestConfig: {
              pathParams: {
                postsId: {
                  valueType: 'variable',
                  value: '',
                  variable: 'step_1.response.0.userId'
                }
              },
              queryParams: {},
              headers: {},
              body: {}
            },
            responseExtract: [],
            assertions: [
              {
                id: 'assertion_2',
                field: 'status',
                operator: 'equals',
                expected: '200',
                expectedType: 'number'
              },
              {
                id: 'assertion_3',
                field: 'title',
                operator: 'contains',
                expected: 'sunt',
                expectedType: 'string'
              }
            ],
            wait: {
              type: 'time',
              value: 0
            }
          },
          measured: { width: 221, height: 94 },
        },
        {
          id: 'step_3',
          type: 'api',
          position: { x: 700, y: 150 },
          data: {
            apiId: 'sample_api_get_comments',
            name: 'get_post_comments',
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts/{postsId}/comments',
            requestConfig: {
              pathParams: {
                postsId: {
                  valueType: 'variable',
                  value: '',
                  variable: 'step_1.response.0.userId'
                }
              },
              queryParams: {},
              headers: {},
              body: {}
            },
            responseExtract: [],
            assertions: [
              {
                id: 'assertion_4',
                field: 'status',
                operator: 'equals',
                expected: '200',
                expectedType: 'number'
              },
              {
                id: 'assertion_5',
                field: '3.email',
                operator: 'contains',
                expected: '@',
                expectedType: 'string'
              }
            ],
            wait: {
              type: 'time',
              value: 0
            }
          },
          measured: { width: 237, height: 94 },
        },
        {
          id: 'end',
          type: 'end',
          position: { x: 1000, y: 150 },
          data: {},
          measured: { width: 96, height: 52 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'step_1', sourceHandle: 'right', targetHandle: 'left' },
        { id: 'e2', source: 'step_1', target: 'step_2', sourceHandle: 'right', targetHandle: 'left' },
        { id: 'e3', source: 'step_2', target: 'step_3', sourceHandle: 'right', targetHandle: 'left' },
        { id: 'e4', source: 'step_3', target: 'end', sourceHandle: 'right', targetHandle: 'left' },
      ],
    };

    if (existingTestCase) {
      await prisma.testCase.update({
        where: { id: 'sample_testcase_e2e_comments' },
        data: {
          flowConfig: JSON.stringify(flowConfig),
          description: '端到端测试：获取文章列表 → 提取userId → 获取文章详情 → 获取评论。演示了变量提取、引用和数组数据访问（如 0.userId、3.email）。',
        },
      });
    } else {
      await prisma.testCase.create({
        data: {
          id: 'sample_testcase_e2e_comments',
          name: 'E2E-get_post_comments',
          description:
            '端到端测试：获取文章列表 → 提取userId → 获取文章详情 → 获取评论。演示了变量提取、引用和数组数据访问（如 0.userId、3.email）。',
          flowConfig: JSON.stringify(flowConfig),
          status: 'active',
          category: 'Sample',
          tags: JSON.stringify(['E2E', 'Demo', 'JSONPlaceholder']),
        },
      });
    }
    
    console.log('   ✓ E2E-get_post_comments');
    console.log('');

    console.log('✅ 示例数据初始化完成！');
    console.log('');
    console.log('📋 已创建内容：');
    console.log('   • 4 个 API 接口 (JSONPlaceholder公开API)');
    console.log('   • 1 个完整的E2E测试用例');
    console.log('   • 2 个三层分类结构');
    console.log('');
    console.log('🎮 快速体验：');
    console.log('   1. 访问 http://localhost:3000/api-repository 查看API仓库');
    console.log('   2. 访问 http://localhost:3000/test-orchestration 查看测试用例');
    console.log('   3. 点击 "E2E-get_post_comments" 进入可视化编排器');
    console.log('   4. 点击右上角 "运行测试" 按钮立即执行');
    console.log('');
  } catch (error) {
    console.error('❌ 初始化示例数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行初始化
initSampleData()
  .then(() => {
    console.log('🎉 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exit(1);
  });
