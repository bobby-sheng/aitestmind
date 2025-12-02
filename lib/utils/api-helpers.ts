/**
 * API相关的辅助工具函数
 */

/**
 * 格式化时间显示
 */
export function formatTime(dateString: string): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleString('zh-CN');
  } catch (error) {
    return dateString;
  }
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (!bytes || bytes < 0) return '-';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 获取HTTP方法的Badge样式
 */
export function getMethodVariant(method: string): "default" | "secondary" | "destructive" | "outline" {
  switch (method.toUpperCase()) {
    case 'GET': return 'secondary';
    case 'POST': return 'default';
    case 'PUT': return 'default';
    case 'DELETE': return 'destructive';
    case 'PATCH': return 'default';
    default: return 'outline';
  }
}

/**
 * 获取状态码的颜色类
 */
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-500';
  if (status >= 300 && status < 400) return 'bg-blue-500';
  if (status >= 400 && status < 500) return 'bg-yellow-500';
  if (status >= 500) return 'bg-red-500';
  return 'bg-gray-500';
}

/**
 * 验证URL格式
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: '请输入URL' };
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.match(/^https?:$/)) {
      return { valid: false, error: 'URL必须使用http或https协议' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'URL格式不正确' };
  }
}

/**
 * 导出HAR数据为文件
 */
export function downloadHarFile(harData: any, filename?: string): void {
  const dataStr = JSON.stringify(harData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `har-capture-${Date.now()}.har`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出API列表为JSON文件
 */
export function downloadJsonFile(data: any, filename?: string): void {
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `api-capture-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

