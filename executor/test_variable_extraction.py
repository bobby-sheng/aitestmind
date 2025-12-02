"""
测试变量提取功能
"""
import sys
from variable_manager import VariableManager


def test_response_extraction():
    """测试从响应中提取变量"""
    
    print("\n" + "="*60)
    print("测试1: 直接字段提取（模拟登录响应）")
    print("="*60)
    
    # 模拟真实的响应数据结构（和 test_executor.py 中保存的一样）
    response_data = {
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
    
    print("\n原始响应数据:")
    print(response_data)
    
    # 初始化变量管理器
    vm = VariableManager()
    
    # 保存步骤结果（模拟 test_executor.py 的行为）
    vm.set_step_result('step_login', {
        'response': response_data
    })
    
    print("\n" + "-"*60)
    print("测试场景1: 提取 message 字段")
    print("-"*60)
    
    # 方式1: 直接从 response_data 提取（旧方式，会失败）
    print("\n方式1: 直接从 response_data 提取 'message'")
    result1 = vm.extract_from_response(response_data, 'message')
    print(f"结果: {result1}")
    print(f"✅ 成功" if result1 else "❌ 失败 - 找不到字段")
    
    # 方式2: 从 body 提取（需要明确路径）
    print("\n方式2: 从 response_data 提取 'body.message'")
    result2 = vm.extract_from_response(response_data, 'body.message')
    print(f"结果: {result2}")
    print(f"✅ 成功" if result2 else "❌ 失败")
    
    # 方式3: 构建展平的上下文（新方式）
    print("\n方式3: 使用展平的断言上下文")
    assertion_context = {
        'status': response_data['status'],
        'headers': response_data.get('headers', {})
    }
    
    # 如果响应体是字典，将其字段直接放到根层级
    if isinstance(response_data.get('body'), dict):
        assertion_context.update(response_data['body'])
        assertion_context['body'] = response_data['body']
    else:
        assertion_context['body'] = response_data.get('body')
    
    print(f"断言上下文: {assertion_context}")
    
    result3 = vm.extract_from_response(assertion_context, 'message')
    print(f"\n从展平上下文提取 'message': {result3}")
    print(f"✅ 成功" if result3 == 'system error!' else "❌ 失败")
    
    # 测试其他字段
    print("\n从展平上下文提取 'code': ", vm.extract_from_response(assertion_context, 'code'))
    print("从展平上下文提取 'status': ", vm.extract_from_response(assertion_context, 'status'))
    print("从展平上下文提取 'log.name': ", vm.extract_from_response(assertion_context, 'log.name'))
    
    print("\n" + "="*60)
    print("测试2: 变量路径解析（模拟断言中的变量引用）")
    print("="*60)
    
    # 测试变量路径解析
    print("\n解析路径: 'step_login.response.message'")
    result4 = vm.resolve_variable_path('step_login.response.message')
    print(f"结果: {result4}")
    print(f"✅ 成功" if result4 == 'system error!' else "❌ 失败")
    
    print("\n解析路径: 'step_login.response.code'")
    result5 = vm.resolve_variable_path('step_login.response.code')
    print(f"结果: {result5}")
    print(f"✅ 成功" if result5 == 500 else "❌ 失败")
    
    print("\n解析路径: 'step_login.response.status'")
    result6 = vm.resolve_variable_path('step_login.response.status')
    print(f"结果: {result6}")
    print(f"✅ 成功" if result6 == 500 else "❌ 失败")
    
    print("\n解析路径: 'step_login.response.log.name'")
    result7 = vm.resolve_variable_path('step_login.response.log.name')
    print(f"结果: {result7}")
    print(f"✅ 成功" if result7 == 'INTERNAL_SERVER_ERROR' else "❌ 失败")
    
    print("\n" + "="*60)
    print("测试3: 成功响应的情况")
    print("="*60)
    
    success_response = {
        'status': 200,
        'headers': {'content-type': 'application/json'},
        'body': {
            'code': 200,
            'message': 'OK',
            'data': {
                'userId': 123,
                'token': 'abc123xyz',
                'user': {
                    'name': 'Alice',
                    'email': 'alice@example.com'
                }
            }
        }
    }
    
    vm.set_step_result('step_success', {
        'response': success_response
    })
    
    print("\n解析路径: 'step_success.response.message'")
    result8 = vm.resolve_variable_path('step_success.response.message')
    print(f"结果: {result8}")
    print(f"✅ 成功" if result8 == 'OK' else "❌ 失败")
    
    print("\n解析路径: 'step_success.response.data.token'")
    result9 = vm.resolve_variable_path('step_success.response.data.token')
    print(f"结果: {result9}")
    print(f"✅ 成功" if result9 == 'abc123xyz' else "❌ 失败")
    
    print("\n解析路径: 'step_success.response.data.user.name'")
    result10 = vm.resolve_variable_path('step_success.response.data.user.name')
    print(f"结果: {result10}")
    print(f"✅ 成功" if result10 == 'Alice' else "❌ 失败")
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)


if __name__ == '__main__':
    test_response_extraction()
















