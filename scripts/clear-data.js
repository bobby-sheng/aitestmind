/**
 * 仅清理数据库中的数据（保留表结构）
 * 运行方式: node scripts/clear-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('🧹 开始清理数据库数据...');

    await prisma.$transaction(async (tx) => {
      // 按外键依赖顺序删除（子表先删）
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

      const r9 = await tx.session.deleteMany({});
      console.log('   ✓ Session:', r9.count);

      const r10 = await tx.api.deleteMany({});
      console.log('   ✓ Api:', r10.count);

      const r11 = await tx.testCase.deleteMany({});
      console.log('   ✓ TestCase:', r11.count);

      const r12 = await tx.testSuite.deleteMany({});
      console.log('   ✓ TestSuite:', r12.count);

      const r13 = await tx.conversation.deleteMany({});
      console.log('   ✓ Conversation:', r13.count);

      const r14 = await tx.category.deleteMany({});
      console.log('   ✓ Category:', r14.count);

      const r15 = await tx.tag.deleteMany({});
      console.log('   ✓ Tag:', r15.count);

      const r16 = await tx.classification.deleteMany({});
      console.log('   ✓ Classification:', r16.count);

      const r17 = await tx.platformSettings.deleteMany({});
      console.log('   ✓ PlatformSettings:', r17.count);

      const r18 = await tx.user.deleteMany({});
      console.log('   ✓ User:', r18.count);
    });

    console.log('');
    console.log('✅ 数据已全部清理完成，表结构已保留。');
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
