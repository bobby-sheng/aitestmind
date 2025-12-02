"""
测试断言修复 - 验证变量引用路径的提取
"""
from variable_manager import VariableManager
from assertion_engine import AssertionEngine
from models import Assertion, AssertionOperator


def test_assertion_with_variable_reference():
    """测试断言中使用变量引用路径"""
    
    print("\n" + "="*80)
    print("测试断言引擎 - 变量引用路径")
    print("="*80)
    
    # 初始化变量管理器
    vm = VariableManager()
    assertion_engine = AssertionEngine(vm)
    
    # 模拟登录步骤的响应（失败的情况）
    login_response = {
        'status': 500,
        'headers': {'content-type': 'application/json'},
        'body': {
            'code': 500,
            'message': 'system error!',
            'log': {
                'detailCode': 500,
                'name': 'INTERNAL_SERVER_ERROR',
                'detail': 'Odd number of characters.'
            },
            'data': None
        }
    }
    
    # 保存步骤结果
    vm.set_step_result('step_1762696514361', {
        'request': {'method': 'POST', 'url': 'http://...'},
        'response': login_response
    })
    
    print("\n已保存步骤 'step_1762696514361' 的响应:")
    print(f"  status: {login_response['status']}")
    print(f"  body.message: {login_response['body']['message']}")
    print(f"  body.code: {login_response['body']['code']}")
    
    # 构建展平的断言上下文（模拟 test_executor.py 的行为）
    assertion_context = {
        'status': login_response['status'],
        'headers': login_response.get('headers', {})
    }
    if isinstance(login_response.get('body'), dict):
        assertion_context.update(login_response['body'])
        assertion_context['body'] = login_response['body']
    
    print("\n" + "-"*80)
    print("场景1: 使用变量引用路径 'step_1762696514361.response.message'")
    print("-"*80)
    
    # 创建断言 - 使用完整的变量引用路径
    assertion1 = Assertion(
        id="test1",
        field="step_1762696514361.response.message",  # 完整的变量引用路径
        operator=AssertionOperator.EQUALS,
        expected="OK"
    )
    
    print(f"\n断言配置:")
    print(f"  字段路径: {assertion1.field}")
    print(f"  操作符: {assertion1.operator.value}")
    print(f"  期望值: {assertion1.expected}")
    
    # 执行断言
    result1 = assertion_engine.execute_assertion(assertion1, assertion_context)
    
    print(f"\n断言结果:")
    print(f"  成功: {result1.success}")
    print(f"  实际值: {result1.actual_value}")
    print(f"  消息: {result1.message}")
    print(f"  {'✅ PASS' if result1.success else '❌ FAIL'}")
    
    print("\n" + "-"*80)
    print("场景2: 使用简单路径 'message' (从当前响应提取)")
    print("-"*80)
    
    # 创建断言 - 使用简单路径（从当前响应提取）
    assertion2 = Assertion(
        id="test2",
        field="message",  # 简单路径，从当前响应的展平上下文中提取
        operator=AssertionOperator.EQUALS,
        expected="system error!"
    )
    
    print(f"\n断言配置:")
    print(f"  字段路径: {assertion2.field}")
    print(f"  操作符: {assertion2.operator.value}")
    print(f"  期望值: {assertion2.expected}")
    
    # 执行断言
    result2 = assertion_engine.execute_assertion(assertion2, assertion_context)
    
    print(f"\n断言结果:")
    print(f"  成功: {result2.success}")
    print(f"  实际值: {result2.actual_value}")
    print(f"  消息: {result2.message}")
    print(f"  {'✅ PASS' if result2.success else '❌ FAIL'}")
    
    print("\n" + "-"*80)
    print("场景3: 断言状态码 'status'")
    print("-"*80)
    
    assertion3 = Assertion(
        id="test3",
        field="status",
        operator=AssertionOperator.EQUALS,
        expected=500
    )
    
    print(f"\n断言配置:")
    print(f"  字段路径: {assertion3.field}")
    print(f"  操作符: {assertion3.operator.value}")
    print(f"  期望值: {assertion3.expected}")
    
    result3 = assertion_engine.execute_assertion(assertion3, assertion_context)
    
    print(f"\n断言结果:")
    print(f"  成功: {result3.success}")
    print(f"  实际值: {result3.actual_value}")
    print(f"  消息: {result3.message}")
    print(f"  {'✅ PASS' if result3.success else '❌ FAIL'}")
    
    print("\n" + "-"*80)
    print("场景4: 使用变量引用路径访问嵌套字段")
    print("-"*80)
    
    assertion4 = Assertion(
        id="test4",
        field="step_1762696514361.response.log.name",
        operator=AssertionOperator.EQUALS,
        expected="INTERNAL_SERVER_ERROR"
    )
    
    print(f"\n断言配置:")
    print(f"  字段路径: {assertion4.field}")
    print(f"  操作符: {assertion4.operator.value}")
    print(f"  期望值: {assertion4.expected}")
    
    result4 = assertion_engine.execute_assertion(assertion4, assertion_context)
    
    print(f"\n断言结果:")
    print(f"  成功: {result4.success}")
    print(f"  实际值: {result4.actual_value}")
    print(f"  消息: {result4.message}")
    print(f"  {'✅ PASS' if result4.success else '❌ FAIL'}")
    
    print("\n" + "="*80)
    print("测试完成")
    print("="*80)
    
    # 统计结果
    total = 4
    passed = sum([result1.success, result2.success, result3.success, result4.success])
    print(f"\n总计: {passed}/{total} 个断言通过")
    
    if passed == total:
        print("✅ 所有测试通过！")
    else:
        print(f"❌ {total - passed} 个测试失败")


if __name__ == '__main__':
    test_assertion_with_variable_reference()
















