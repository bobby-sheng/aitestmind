-- 清理数据库中的敏感数据
-- 执行方式: sqlite3 prisma/dev.db < cleanup-db-sensitive-data.sql

-- 1. 清空 PlatformSettings 表中的敏感配置
UPDATE PlatformSettings SET
  authTokenValue = '',
  aiApiKey = '',
  sessionCookies = NULL
WHERE 1=1;

-- 2. 清空测试执行历史中的敏感数据（保留结构，清空内容）
UPDATE TestStepExecution SET
  requestSnapshot = json('{}'),
  responseSnapshot = json('{}')
WHERE 1=1;

-- 3. 清空执行日志中可能包含的敏感信息
DELETE FROM ExecutionLog WHERE 1=1;

-- 4. 清空会话数据
DELETE FROM Session WHERE 1=1;

-- 5. 清空对话记录（可能包含敏感测试数据）
DELETE FROM ConversationMessage WHERE 1=1;
DELETE FROM Conversation WHERE 1=1;

-- 显示清理结果
SELECT '数据库敏感信息清理完成！' as message;
SELECT 'PlatformSettings 已清空敏感配置' as step1;
SELECT 'TestStepExecution 快照已清空' as step2;
SELECT 'ExecutionLog 已清空' as step3;
SELECT 'Session 已清空' as step4;
SELECT 'Conversation 记录已清空' as step5;

