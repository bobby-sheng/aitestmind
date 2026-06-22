/**
 * 清理数据库数据，但保留用户认证/用户管理相关表，其他数据全部清除。
 * 运行方式: node scripts/clear-data-except-users.js
 *
 * 保留的表（不清除）：
 *   - User    用户表（登录名、密码、角色等）
 *   - Session 登录会话（token、过期时间等）
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 用户认证相关表：User, Session —— 不参与清理
// 以下按外键依赖顺序清空

async function clearDataExceptUsers() {
  try {
    console.log('🧹 开始清理数据（保留用户认证表：User、Session）...');
    console.log('');

    await prisma.$transaction(async (tx) => {
      // 执行相关（最深层子表先删）
      const r1 = await tx.executionLog.deleteMany({});
      console.log('   ✓ ExecutionLog:', r1.count);

      const r2 = await tx.testStepExecution.deleteMany({});
      console.log('   ✓ TestStepExecution:', r2.count);

      const r3 = await tx.testCaseExecution.deleteMany({});
      console.log('   ✓ TestCaseExecution:', r3.count);

      const r4 = await tx.testSuiteExecution.deleteMany({});
      console.log('   ✓ TestSuiteExecution:', r4.count);

      const r5 = await tx.testSuiteCase.deleteMany({});
      console.log('   ✓ TestSuiteCase:', r5.count);

      const r6 = await tx.testStep.deleteMany({});
      console.log('   ✓ TestStep:', r6.count);

      const r7 = await tx.apiTag.deleteMany({});
      console.log('   ✓ ApiTag:', r7.count);

      const r8 = await tx.conversationMessage.deleteMany({});
      console.log('   ✓ ConversationMessage:', r8.count);

      // API、用例、套件、对话（有 createdBy/updatedBy 指向 User，onDelete: SetNull，直接删即可）
      const r9 = await tx.api.deleteMany({});
      console.log('   ✓ Api:', r9.count);

      const r10 = await tx.testCase.deleteMany({});
      console.log('   ✓ TestCase:', r10.count);

      const r11 = await tx.testSuite.deleteMany({});
      console.log('   ✓ TestSuite:', r11.count);

      const r12 = await tx.conversation.deleteMany({});
      console.log('   ✓ Conversation:', r12.count);

      const r13 = await tx.category.deleteMany({});
      console.log('   ✓ Category:', r13.count);

      const r14 = await tx.tag.deleteMany({});
      console.log('   ✓ Tag:', r14.count);

      const r15 = await tx.classification.deleteMany({});
      console.log('   ✓ Classification:', r15.count);

      const r16 = await tx.platformSettings.deleteMany({});
      console.log('   ✓ PlatformSettings:', r16.count);
    });

    console.log('');
    console.log('✅ 业务数据已清理完成。');
    console.log('   已保留（未清除）: User、Session（用户认证相关表）');
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDataExceptUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
