"""
测试示例 - 演示如何使用执行器
"""
import asyncio
import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

from database import Database
from test_executor import TestExecutor


async def test_login_case():
    """测试登录用例"""
    
    # 初始化数据库
    db_path = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
    db = Database(db_path)
    
    print("=" * 60)
    print("🔍 查询测试用例列表...")
    print("=" * 60)
    
    # 列出所有测试用例
    test_cases = db.list_test_cases()
    
    if not test_cases:
        print("❌ 没有找到测试用例")
        return
    
    print(f"\n找到 {len(test_cases)} 个测试用例:\n")
    for idx, tc in enumerate(test_cases, 1):
        print(f"{idx}. {tc['name']}")
        print(f"   ID: {tc['id']}")
        print(f"   状态: {tc['status']}")
        print(f"   执行次数: {tc['executeCount']} (成功: {tc['successCount']}, 失败: {tc['failCount']})")
        print()
    
    # 查找登录用例
    login_case = None
    for tc in test_cases:
        if "登录" in tc['name']:
            login_case_id = tc['id']
            login_case = db.get_test_case_by_id(login_case_id)
            break
    
    if not login_case:
        print("❌ 没有找到登录用例，使用第一个测试用例")
        test_case_id = test_cases[0]['id']
        login_case = db.get_test_case_by_id(test_case_id)
    
    if not login_case:
        print("❌ 无法加载测试用例")
        return
    
    print("=" * 60)
    print(f"🚀 执行测试用例: {login_case.name}")
    print("=" * 60)
    print()
    
    # 打印用例信息
    print(f"📝 用例描述: {login_case.description or '无'}")
    print(f"📊 节点数量: {len(login_case.flowConfig.nodes)}")
    print(f"🔗 连线数量: {len(login_case.flowConfig.edges)}")
    print()
    
    # 执行测试用例
    async with TestExecutor(timeout=30, database=db) as executor:
        result = await executor.execute_test_case(login_case)
    
    # 打印结果
    print("=" * 60)
    print("📊 执行结果")
    print("=" * 60)
    print()
    
    if result.success:
        print("✅ 执行成功")
    else:
        print("❌ 执行失败")
        if result.error:
            print(f"   错误: {result.error}")
    
    print()
    print(f"⏱️  总耗时: {result.duration:.2f} 秒")
    print(f"📈 总步骤: {result.totalSteps}")
    print(f"✅ 成功步骤: {result.passedSteps}")
    print(f"❌ 失败步骤: {result.failedSteps}")
    print()
    
    # 打印步骤详情
    print("=" * 80)
    print("📋 详细执行日志")
    print("=" * 80)
    print()
    
    for idx, step in enumerate(result.steps, 1):
        print("=" * 80)
        print(f"步骤 {idx}: {step['stepName']}")
        print("=" * 80)
        print(f"节点类型: {step['nodeType']}")
        print(f"节点 ID: {step['nodeId']}")
        print(f"执行状态: {'✅ 成功' if step['success'] else '❌ 失败'}")
        print(f"执行耗时: {step['duration']:.2f} 秒")
        print()
        
        # 请求详情
        if step.get('request'):
            request = step['request']
            print("📤 请求详情:")
            print(f"  ├─ 方法: {request['method']}")
            print(f"  ├─ URL: {request['url']}")
            
            # 请求头
            if request.get('headers'):
                print("  ├─ 请求头:")
                for key, value in request['headers'].items():
                    print(f"  │   ├─ {key}: {value}")
            
            # 查询参数
            if request.get('params'):
                print("  ├─ 查询参数:")
                for key, value in request['params'].items():
                    print(f"  │   ├─ {key}: {value}")
            
            # 请求体
            if request.get('json'):
                print("  └─ 请求体:")
                import json
                body_str = json.dumps(request['json'], indent=4, ensure_ascii=False)
                for line in body_str.split('\n'):
                    print(f"      {line}")
            print()
        
        # 响应详情
        if step.get('response'):
            response = step['response']
            print("📥 响应详情:")
            print(f"  ├─ 状态码: {response['status']}")
            
            # 响应头
            if response.get('headers'):
                print("  ├─ 响应头:")
                # 只显示重要的响应头
                important_headers = ['content-type', 'content-length', 'server', 'date']
                for key, value in response['headers'].items():
                    if key.lower() in important_headers:
                        print(f"  │   ├─ {key}: {value}")
            
            # 响应体
            if response.get('body'):
                print("  └─ 响应体:")
                import json
                if isinstance(response['body'], dict):
                    body_str = json.dumps(response['body'], indent=4, ensure_ascii=False)
                    for line in body_str.split('\n'):
                        print(f"      {line}")
                else:
                    # 如果是字符串，尝试格式化
                    try:
                        body_obj = json.loads(response['body'])
                        body_str = json.dumps(body_obj, indent=4, ensure_ascii=False)
                        for line in body_str.split('\n'):
                            print(f"      {line}")
                    except:
                        print(f"      {response['body']}")
            print()
        
        # 提取的变量
        if step.get('extractedVariables'):
            print("📦 提取的变量:")
            for key, value in step['extractedVariables'].items():
                # 如果值太长，截断显示
                value_str = str(value)
                if len(value_str) > 100:
                    value_str = value_str[:100] + "..."
                print(f"  ├─ {key}: {value_str}")
            print()
        
        # 断言结果
        if step.get('assertions'):
            print("✓ 断言结果:")
            for assertion in step['assertions']:
                status = "✅ 通过" if assertion['success'] else "❌ 失败"
                print(f"  ├─ {status}")
                print(f"  │   ├─ 字段: {assertion['field']}")
                print(f"  │   ├─ 操作符: {assertion['operator']}")
                print(f"  │   ├─ 期望值: {assertion['expected']}")
                print(f"  │   ├─ 实际值: {assertion['actual']}")
                print(f"  │   └─ 消息: {assertion['message']}")
            print()
        
        # 错误信息
        if step.get('error'):
            print("❌ 错误信息:")
            print(f"  └─ {step['error']}")
            print()
        
        print()
    
    # 打印变量
    if result.variables:
        print("=" * 80)
        print("📦 全局变量")
        print("=" * 80)
        print()
        
        variables = result.variables.get('variables', {})
        if variables:
            for key, value in variables.items():
                value_str = str(value)
                if len(value_str) > 100:
                    value_str = value_str[:100] + "..."
                print(f"  ├─ {key}: {value_str}")
        else:
            print("  └─ (无全局变量)")
        print()
    
    # 更新统计
    db.update_test_case_stats(login_case.id, result.success)
    print("✅ 已更新测试用例统计信息")


if __name__ == "__main__":
    print("🧪 测试执行器示例")
    print()
    
    asyncio.run(test_login_case())

