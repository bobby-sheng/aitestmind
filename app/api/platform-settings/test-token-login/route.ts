import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function extractTokenByPath(data: any, path: string): string | null {
  const keys = path.split('.');
  let current = data;
  for (const key of keys) {
    if (current == null) return null;
    current = current[key];
  }
  return typeof current === 'string' ? current : (current != null ? String(current) : null);
}

function buildFetchOptions(
  bodyData: any,
  contentType: string,
  headers: Record<string, string>
): { headers: Record<string, string>; body?: any } {
  if (!bodyData) return { headers };

  if (contentType.includes('multipart/form-data')) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(bodyData)) {
      formData.append(key, String(value));
    }
    const cleanHeaders = { ...headers };
    delete cleanHeaders['Content-Type'];
    delete cleanHeaders['content-type'];
    return { headers: cleanHeaders, body: formData };
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(bodyData)) {
      params.append(key, String(value));
    }
    return { headers, body: params.toString() };
  }

  return { headers, body: JSON.stringify(bodyData) };
}

export async function POST() {
  try {
    const settings = await prisma.platformSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings || !settings.authTokenEnabled || !settings.tokenLoginApiUrl) {
      return NextResponse.json(
        { success: false, error: '未配置Token登录接口或Token模式未启用' },
        { status: 400 }
      );
    }

    if (!settings.tokenResponsePath) {
      return NextResponse.json(
        { success: false, error: '未配置Token提取路径（tokenResponsePath）' },
        { status: 400 }
      );
    }

    let loginUrl = settings.tokenLoginApiUrl;
    if (!/^https?:\/\//i.test(loginUrl)) {
      loginUrl = `http://${loginUrl}`;
    }

    const rawHeaders: Record<string, string> = {};

    if (settings.tokenLoginRequestHeaders && typeof settings.tokenLoginRequestHeaders === 'object') {
      Object.assign(rawHeaders, settings.tokenLoginRequestHeaders);
    }

    if (!rawHeaders['Content-Type'] && !rawHeaders['content-type']) {
      rawHeaders['Content-Type'] = 'application/json';
    }

    const contentType = rawHeaders['Content-Type'] || rawHeaders['content-type'] || 'application/json';
    const fetchOptions = buildFetchOptions(settings.tokenLoginRequestBody, contentType, rawHeaders);

    console.log('[Token登录] 发送请求:', {
      url: loginUrl,
      method: settings.tokenLoginMethod,
      contentType,
      headers: fetchOptions.headers,
      bodyType: contentType.includes('multipart') ? 'FormData' : typeof fetchOptions.body,
    });

    const response = await fetch(loginUrl, {
      method: settings.tokenLoginMethod || 'POST',
      headers: fetchOptions.headers,
      body: fetchOptions.body,
    });

    console.log('[Token登录] 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[Token登录] 错误响应:', errorText);
      return NextResponse.json(
        { success: false, error: `登录失败: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    let responseData: any = null;

    try {
      responseData = JSON.parse(responseText);
      console.log('[Token登录] 响应数据:', responseData);
    } catch {
      console.log('[Token登录] 响应不是JSON格式:', responseText.substring(0, 200));
      return NextResponse.json(
        { success: false, error: '登录接口响应不是有效的JSON格式' },
        { status: 400 }
      );
    }

    const extractedToken = extractTokenByPath(responseData, settings.tokenResponsePath);

    if (!extractedToken) {
      const responseMsg = responseData?.returnMessage || responseData?.message || responseData?.msg || responseData?.error || '';
      const responseCode = responseData?.returnCode || responseData?.code || responseData?.status || '';
      const businessError = responseMsg ? `\n接口返回: [${responseCode}] ${responseMsg}` : '';

      return NextResponse.json(
        {
          success: false,
          error: `无法从响应中提取Token，路径 "${settings.tokenResponsePath}" 未找到有效值${businessError}`,
          debug: {
            responsePath: settings.tokenResponsePath,
            responseDataSample: responseText.substring(0, 500),
            hint: '请检查：1) 登录凭据是否正确 2) Token提取路径是否正确（如：data.token、result.access_token）',
          },
        },
        { status: 400 }
      );
    }

    let finalTokenValue = extractedToken;
    const authKey = (settings.authTokenKey || 'Authorization').toLowerCase();
    if (authKey === 'authorization' && !extractedToken.toLowerCase().startsWith('bearer ')) {
      finalTokenValue = `Bearer ${extractedToken}`;
    }

    await prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        authTokenValue: finalTokenValue,
        tokenUpdatedAt: new Date(),
      },
    });

    console.log('[Token登录] Token获取成功，已保存');

    return NextResponse.json({
      success: true,
      data: {
        tokenPath: settings.tokenResponsePath,
        tokenPreview: finalTokenValue.length > 20
          ? `${finalTokenValue.substring(0, 20)}...`
          : finalTokenValue,
        loginTime: new Date().toISOString(),
      },
      message: 'Token获取成功',
    });
  } catch (error) {
    console.error('Error testing token login:', error);
    return NextResponse.json(
      { success: false, error: `Token登录失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
