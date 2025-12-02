"""
测试脚本：验证API是否真的需要认证
"""
import asyncio
import httpx

async def test_without_auth():
    """测试1：完全不带任何认证"""
    print("\n" + "="*80)
    print("测试1: 完全不带任何认证信息")
    print("="*80)
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.post(
                'http://172.21.1.156/api/sky-nap/device/ha-group',
                json={
                    'name': 'test_no_auth',
                    'deviceType': 'sky_firewall',
                    'type': 'ANALYZE_DISPATCH',
                    'dispatchOrder': 'UNLIMITED',
                    'description': 'test'
                },
                headers={
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            )
            print(f"✅ 响应状态码: {response.status_code}")
            print(f"响应内容: {response.text[:500]}")
            
            if response.status_code == 200:
                print("\n⚠️  警告：API不需要认证就能访问！")
            elif response.status_code in [401, 403]:
                print("\n✅ 正常：API需要认证")
            else:
                print(f"\n❓ 未知状态: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 请求失败: {e}")


async def test_with_invalid_cookie():
    """测试2：使用明显无效的cookie"""
    print("\n" + "="*80)
    print("测试2: 使用明显无效的Cookie (完全错误的字符串)")
    print("="*80)
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.post(
                'http://172.21.1.156/api/sky-nap/device/ha-group',
                json={
                    'name': 'test_invalid_simple',
                    'deviceType': 'sky_firewall',
                    'type': 'ANALYZE_DISPATCH',
                    'dispatchOrder': 'UNLIMITED',
                    'description': 'test'
                },
                headers={
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cookie': 'access_token=INVALID_TOKEN_12345'
                }
            )
            print(f"响应状态码: {response.status_code}")
            print(f"响应内容: {response.text[:300]}")
            
            try:
                resp_json = response.json()
                business_code = resp_json.get('code')
                print(f"业务状态码: {business_code}")
                
                if business_code == 401:
                    print("\n✅ 正常：API通过业务码401拒绝了无效token")
                elif business_code == 200:
                    print("\n⚠️  警告：无效token居然通过认证了！")
                elif business_code == 409:
                    print("\n⚠️  警告：无效token通过认证，但资源冲突")
            except:
                pass
                
        except Exception as e:
            print(f"❌ 请求失败: {e}")


async def test_with_corrupted_jwt():
    """测试2.5：使用破坏了签名的JWT token"""
    print("\n" + "="*80)
    print("测试2.5: 使用破坏了签名的JWT Token")
    print("="*80)
    
    # 从数据库读取有效token，然后破坏它
    import sqlite3
    import os
    
    db_path = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT sessionCookies FROM PlatformSettings ORDER BY updatedAt DESC LIMIT 1"
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row or not row[0]:
        print("⚠️  数据库中没有保存的sessionCookies")
        return
    
    valid_token = row[0].replace('access_token=', '')
    # 破坏JWT签名部分（第三部分）
    parts = valid_token.split('.')
    if len(parts) == 3:
        corrupted_token = f"{parts[0]}.{parts[1]}.CORRUPTED_SIGNATURE_XXX"
        print(f"原始token最后20字符: ...{valid_token[-20:]}")
        print(f"破坏后最后20字符: ...{corrupted_token[-20:]}")
    else:
        corrupted_token = valid_token + "_CORRUPTED"
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.post(
                'http://172.21.1.156/api/sky-nap/device/ha-group',
                json={
                    'name': 'test_corrupted_jwt',
                    'deviceType': 'sky_firewall',
                    'type': 'ANALYZE_DISPATCH',
                    'dispatchOrder': 'UNLIMITED',
                    'description': 'test'
                },
                headers={
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cookie': f'access_token={corrupted_token}'
                }
            )
            print(f"响应状态码: {response.status_code}")
            print(f"响应内容: {response.text[:300]}")
            
            try:
                resp_json = response.json()
                business_code = resp_json.get('code')
                print(f"业务状态码: {business_code}")
                
                if business_code == 401:
                    print("\n✅ 正常：服务器验证了JWT签名并拒绝")
                elif business_code == 200:
                    print("\n⚠️⚠️⚠️ 严重警告：JWT签名被破坏但仍然通过认证！")
                    print("这意味着服务器**不验证JWT签名**！")
                elif business_code == 409:
                    print("\n⚠️⚠️⚠️ 严重警告：JWT签名被破坏但通过认证（资源冲突）")
                    print("这意味着服务器**不验证JWT签名**！")
            except:
                pass
                
        except Exception as e:
            print(f"❌ 请求失败: {e}")


async def test_with_valid_token():
    """测试3：使用平台设置中的有效token"""
    print("\n" + "="*80)
    print("测试3: 使用平台设置中的有效Token")
    print("="*80)
    
    # 从数据库读取token
    import sqlite3
    import os
    
    db_path = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT sessionCookies FROM PlatformSettings ORDER BY updatedAt DESC LIMIT 1"
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row or not row[0]:
        print("⚠️  数据库中没有保存的sessionCookies")
        return
    
    session_cookies = row[0]
    print(f"使用的Cookie: {session_cookies[:100]}...")
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.post(
                'http://172.21.1.156/api/sky-nap/device/ha-group',
                json={
                    'name': 'test_valid_token',
                    'deviceType': 'sky_firewall',
                    'type': 'ANALYZE_DISPATCH',
                    'dispatchOrder': 'UNLIMITED',
                    'description': 'test'
                },
                headers={
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cookie': session_cookies
                }
            )
            print(f"✅ 响应状态码: {response.status_code}")
            print(f"响应内容: {response.text[:500]}")
            
            if response.status_code == 200:
                print("\n✅ 正常：使用有效token成功")
            elif response.status_code in [401, 403]:
                print("\n⚠️  奇怪：有效token也被拒绝了")
            else:
                print(f"\n❓ 未知状态: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 请求失败: {e}")


async def main():
    """运行所有测试"""
    print("\n" + "="*80)
    print("API 认证测试脚本 - JWT签名验证测试")
    print("="*80)
    
    # 测试1: 不带认证
    await test_without_auth()
    
    await asyncio.sleep(1)
    
    # 测试2: 完全无效的字符串
    await test_with_invalid_cookie()
    
    await asyncio.sleep(1)
    
    # 测试2.5: 破坏JWT签名（重要！）
    await test_with_corrupted_jwt()
    
    await asyncio.sleep(1)
    
    # 测试3: 有效token
    await test_with_valid_token()
    
    print("\n" + "="*80)
    print("测试完成")
    print("="*80)
    print("\n总结：")
    print("- 测试1：检查API是否完全开放")
    print("- 测试2：检查简单字符串是否被拒绝")
    print("- 测试2.5：检查服务器是否验证JWT签名（最重要！）")
    print("- 测试3：验证有效token能正常工作")
    print("\n如果测试2.5通过认证，说明服务器不验证JWT签名，存在安全风险！")
    print()


if __name__ == "__main__":
    asyncio.run(main())

