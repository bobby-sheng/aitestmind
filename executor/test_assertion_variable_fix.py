"""
测试断言中的变量解析功能
"""
import sys
import os

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from variable_manager import VariableManager
from assertion_engine import AssertionEngine, AssertionResult
from models import Assertion, AssertionOperator, ExpectedType


def test_assertion_with_variable_in_expected():
    """测试断言期望值中的变量引用"""
    
    print("\n" + "="*60)
    print("测试：断言期望值中的变量引用")
    print("="*60 + "\n")
    
    # 1. 初始化变量管理器
    variable_manager = VariableManager()
    
    # 2. 模拟步骤1的执行结果（连接凭证新增）
    step_1_result = {
        'response': {
            'status': 200,
            'headers': {},
            'body': {
                'message': '操作成功',
                'code': 200,
                'data': 'credential_12345'  # 返回的凭证ID
            }
        }
    }
    
    variable_manager.set_step_result('step_1', step_1_result)
    print(f"✓ 已保存步骤1结果")
    print(f"  步骤1返回的凭证ID: {step_1_result['response']['body']['data']}")
    
    # 3. 模拟步骤2的执行结果（连接凭证查询）
    step_2_response = {
        'status': 200,
        'headers': {},
        'body': {
            'message': '查询成功',
            'code': 200,
            'data': {
                'page': {
                    'items': [
                        {
                            'id': 'credential_12345',  # 查询到的凭证ID
                            'name': '测试凭证',
                            'type': 'database'
                        }
                    ]
                }
            }
        }
    }
    
    print(f"\n✓ 步骤2查询结果")
    print(f"  查询到的凭证ID: {step_2_response['body']['data']['page']['items'][0]['id']}")
    
    # 4. 创建断言引擎
    assertion_engine = AssertionEngine(variable_manager)
    
    # 5. 创建断言：验证步骤2查询到的ID等于步骤1返回的ID
    assertion = Assertion(
        field='data.page.items[0].id',  # 从步骤2的响应中提取
        operator=AssertionOperator.EQUALS,
        expected='${step_1.response.data}',  # 引用步骤1的返回值
        expectedType=ExpectedType.AUTO
    )
    
    print(f"\n✓ 创建断言")
    print(f"  实际值路径: {assertion.field}")
    print(f"  期望值（变量引用）: {assertion.expected}")
    print(f"  操作符: {assertion.operator.value}")
    
    # 6. 执行断言
    print(f"\n开始执行断言...")
    print("-" * 60)
    result = assertion_engine.execute_assertion(assertion, step_2_response)
    print("-" * 60)
    
    # 7. 验证结果
    print(f"\n断言执行结果:")
    print(f"  成功: {result.success}")
    print(f"  实际值: {result.actual_value}")
    print(f"  期望值: {result.expected}")
    print(f"  消息: {result.message}")
    
    if result.success:
        print(f"\n✅ 测试通过！变量引用已正确解析")
        print(f"   - 期望值 '${'{step_1.response.data}'}' 被正确解析为 '{result.expected}'")
        print(f"   - 实际值 '{result.actual_value}' 与期望值匹配")
    else:
        print(f"\n❌ 测试失败！")
        print(f"   - 实际值: {result.actual_value}")
        print(f"   - 期望值: {result.expected}")
        print(f"   - 两者不匹配")
    
    print("\n" + "="*60 + "\n")
    
    return result.success


def test_assertion_with_complex_variable():
    """测试复杂变量引用（嵌套对象）"""
    
    print("\n" + "="*60)
    print("测试：复杂变量引用（嵌套对象）")
    print("="*60 + "\n")
    
    # 1. 初始化
    variable_manager = VariableManager()
    
    # 2. 模拟步骤1返回复杂对象
    step_1_result = {
        'response': {
            'status': 200,
            'headers': {},
            'body': {
                'user': {
                    'id': 123,
                    'name': 'John Doe',
                    'email': 'john@example.com'
                }
            }
        }
    }
    
    variable_manager.set_step_result('login_step', step_1_result)
    print(f"✓ 步骤1返回的用户ID: {step_1_result['response']['body']['user']['id']}")
    
    # 3. 模拟步骤2的响应
    step_2_response = {
        'status': 200,
        'headers': {},
        'body': {
            'userId': 123
        }
    }
    
    print(f"✓ 步骤2返回的用户ID: {step_2_response['body']['userId']}")
    
    # 4. 创建断言
    assertion_engine = AssertionEngine(variable_manager)
    assertion = Assertion(
        field='userId',
        operator=AssertionOperator.EQUALS,
        expected='${login_step.response.user.id}',  # 引用嵌套属性
        expectedType=ExpectedType.NUMBER
    )
    
    print(f"\n✓ 断言配置")
    print(f"  期望值引用: ${'{login_step.response.user.id}'}")
    
    # 5. 执行断言
    print(f"\n开始执行断言...")
    print("-" * 60)
    result = assertion_engine.execute_assertion(assertion, step_2_response)
    print("-" * 60)
    
    # 6. 验证结果
    print(f"\n断言执行结果:")
    print(f"  成功: {result.success}")
    print(f"  实际值: {result.actual_value} (类型: {type(result.actual_value).__name__})")
    print(f"  期望值: {result.expected} (类型: {type(result.expected).__name__})")
    
    if result.success:
        print(f"\n✅ 测试通过！复杂变量引用已正确解析")
    else:
        print(f"\n❌ 测试失败！")
    
    print("\n" + "="*60 + "\n")
    
    return result.success


def test_assertion_with_string_template():
    """测试字符串模板中的变量引用"""
    
    print("\n" + "="*60)
    print("测试：字符串模板中的变量引用")
    print("="*60 + "\n")
    
    # 1. 初始化
    variable_manager = VariableManager()
    
    # 2. 设置步骤结果
    step_1_result = {
        'response': {
            'status': 200,
            'headers': {},
            'body': {
                'username': 'testuser'
            }
        }
    }
    
    variable_manager.set_step_result('step_1', step_1_result)
    print(f"✓ 步骤1返回的用户名: {step_1_result['response']['body']['username']}")
    
    # 3. 模拟步骤2的响应
    step_2_response = {
        'status': 200,
        'headers': {},
        'body': {
            'message': 'Welcome, testuser!'
        }
    }
    
    print(f"✓ 步骤2返回的消息: {step_2_response['body']['message']}")
    
    # 4. 创建断言（使用字符串模板）
    assertion_engine = AssertionEngine(variable_manager)
    assertion = Assertion(
        field='message',
        operator=AssertionOperator.EQUALS,
        expected='Welcome, ${step_1.response.username}!',  # 字符串模板
        expectedType=ExpectedType.STRING
    )
    
    print(f"\n✓ 断言配置")
    print(f"  期望值模板: Welcome, ${'{step_1.response.username}'}!")
    
    # 5. 执行断言
    print(f"\n开始执行断言...")
    print("-" * 60)
    result = assertion_engine.execute_assertion(assertion, step_2_response)
    print("-" * 60)
    
    # 6. 验证结果
    print(f"\n断言执行结果:")
    print(f"  成功: {result.success}")
    print(f"  实际值: {result.actual_value}")
    print(f"  期望值: {result.expected}")
    
    if result.success:
        print(f"\n✅ 测试通过！字符串模板已正确解析")
    else:
        print(f"\n❌ 测试失败！")
    
    print("\n" + "="*60 + "\n")
    
    return result.success


if __name__ == '__main__':
    print("\n" + "="*80)
    print("断言变量解析功能测试")
    print("="*80)
    
    tests = [
        ("基本变量引用", test_assertion_with_variable_in_expected),
        ("复杂变量引用", test_assertion_with_complex_variable),
        ("字符串模板", test_assertion_with_string_template)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\n❌ 测试 '{test_name}' 执行异常: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # 汇总结果
    print("\n" + "="*80)
    print("测试结果汇总")
    print("="*80 + "\n")
    
    for test_name, success in results:
        status = "✅ 通过" if success else "❌ 失败"
        print(f"  {status}  {test_name}")
    
    total = len(results)
    passed = sum(1 for _, success in results if success)
    
    print(f"\n总计: {passed}/{total} 个测试通过")
    print("="*80 + "\n")
    
    sys.exit(0 if passed == total else 1)

