export interface PlatformSettings {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;

  // 环境配置
  baseUrl?: string | null;

  // 认证Token模式（Headers键值对）
  authTokenEnabled: boolean;
  authTokenKey?: string | null;
  authTokenValue?: string | null;

  // Session模式
  sessionEnabled: boolean;
  loginApiUrl?: string | null;
  loginMethod?: string | null;
  loginRequestHeaders?: Record<string, string> | null;
  loginRequestBody?: Record<string, any> | null;
  sessionCookies?: string | null; // 所有Session Cookies（格式：cookie1=value1; cookie2=value2）
  sessionUpdatedAt?: Date | string | null;

  // 请求头过滤配置
  allowedHeaders?: string | null; // 允许保留的请求头白名单（逗号分隔）

  // 其他配置
  otherConfig?: Record<string, any> | null;
}

export interface PlatformSettingsFormData {
  // 环境配置
  baseUrl: string;

  // 认证Token模式
  authTokenEnabled: boolean;
  authTokenKey: string;
  authTokenValue: string;

  // Session模式
  sessionEnabled: boolean;
  loginApiUrl: string;
  loginMethod: string;
  loginRequestHeaders: Record<string, string>;
  loginRequestBody: Record<string, any>;
  sessionCookieName: string;
}

