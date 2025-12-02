/**
 * 运行时函数插件配置
 * 
 * 这个文件定义了可以在请求体中使用的动态函数
 * 语法：${{函数名(参数)}}
 * 示例：${{random()}} 或 ${{timestamp()}}
 */

export interface FunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
  default?: any;
}

export interface RuntimeFunction {
  id: string;
  name: string;
  description: string;
  category: '随机值' | '时间日期' | '编码解码' | '数据生成' | '其他';
  parameters: FunctionParameter[];
  example: string;
  syntax: string; // 用于插入的语法
}

/**
 * 所有可用的运行时函数
 */
export const RUNTIME_FUNCTIONS: RuntimeFunction[] = [
  // ========== 随机值类 ==========
  {
    id: 'random',
    name: '随机数字',
    description: '生成指定长度的随机数字字符串',
    category: '随机值',
    parameters: [
      {
        name: 'length',
        type: 'number',
        description: '数字长度',
        required: false,
        default: 8,
      },
    ],
    example: '${{random(8)}} → 87188172',
    syntax: 'random(8)',
  },
  {
    id: 'randomInt',
    name: '随机整数',
    description: '生成指定范围内的随机整数',
    category: '随机值',
    parameters: [
      {
        name: 'min',
        type: 'number',
        description: '最小值',
        required: false,
        default: 0,
      },
      {
        name: 'max',
        type: 'number',
        description: '最大值',
        required: false,
        default: 1000,
      },
    ],
    example: '${{randomInt(1, 100)}} → 42',
    syntax: 'randomInt(1, 100)',
  },
  {
    id: 'uuid',
    name: 'UUID',
    description: '生成标准的 UUID v4',
    category: '随机值',
    parameters: [],
    example: '${{uuid()}} → 550e8400-e29b-41d4-a716-446655440000',
    syntax: 'uuid()',
  },
  {
    id: 'randomString',
    name: '随机字符串',
    description: '生成指定长度的随机字符串（字母+数字）',
    category: '随机值',
    parameters: [
      {
        name: 'length',
        type: 'number',
        description: '字符串长度',
        required: false,
        default: 10,
      },
    ],
    example: '${{randomString(10)}} → aB3xY9mK2p',
    syntax: 'randomString(10)',
  },
  {
    id: 'randomEmail',
    name: '随机邮箱',
    description: '生成随机的邮箱地址',
    category: '随机值',
    parameters: [],
    example: '${{randomEmail()}} → user_8721@example.com',
    syntax: 'randomEmail()',
  },
  {
    id: 'randomPhone',
    name: '随机手机号',
    description: '生成随机的中国手机号',
    category: '随机值',
    parameters: [],
    example: '${{randomPhone()}} → 13812345678',
    syntax: 'randomPhone()',
  },

  // ========== 时间日期类 ==========
  {
    id: 'timestamp',
    name: '时间戳（秒）',
    description: '获取当前时间的时间戳（秒）',
    category: '时间日期',
    parameters: [],
    example: '${{timestamp()}} → 1700000000',
    syntax: 'timestamp()',
  },
  {
    id: 'timestampMs',
    name: '时间戳（毫秒）',
    description: '获取当前时间的时间戳（毫秒）',
    category: '时间日期',
    parameters: [],
    example: '${{timestampMs()}} → 1700000000000',
    syntax: 'timestampMs()',
  },
  {
    id: 'datetime',
    name: '当前日期时间',
    description: '获取当前日期时间，可自定义格式',
    category: '时间日期',
    parameters: [
      {
        name: 'format',
        type: 'string',
        description: '日期格式（YYYY-MM-DD HH:mm:ss）',
        required: false,
        default: 'YYYY-MM-DD HH:mm:ss',
      },
    ],
    example: '${{datetime("YYYY-MM-DD")}} → 2024-11-16',
    syntax: 'datetime("YYYY-MM-DD HH:mm:ss")',
  },
  {
    id: 'date',
    name: '当前日期',
    description: '获取当前日期（YYYY-MM-DD）',
    category: '时间日期',
    parameters: [],
    example: '${{date()}} → 2024-11-16',
    syntax: 'date()',
  },
  {
    id: 'time',
    name: '当前时间',
    description: '获取当前时间（HH:mm:ss）',
    category: '时间日期',
    parameters: [],
    example: '${{time()}} → 14:30:25',
    syntax: 'time()',
  },

  // ========== 编码解码类 ==========
  {
    id: 'base64Encode',
    name: 'Base64 编码',
    description: '对字符串进行 Base64 编码',
    category: '编码解码',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: '要编码的文本',
        required: true,
      },
    ],
    example: '${{base64Encode("hello")}} → aGVsbG8=',
    syntax: 'base64Encode("text")',
  },
  {
    id: 'base64Decode',
    name: 'Base64 解码',
    description: '对字符串进行 Base64 解码',
    category: '编码解码',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: '要解码的文本',
        required: true,
      },
    ],
    example: '${{base64Decode("aGVsbG8=")}} → hello',
    syntax: 'base64Decode("text")',
  },
  {
    id: 'urlEncode',
    name: 'URL 编码',
    description: '对字符串进行 URL 编码',
    category: '编码解码',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: '要编码的文本',
        required: true,
      },
    ],
    example: '${{urlEncode("hello world")}} → hello%20world',
    syntax: 'urlEncode("text")',
  },
  {
    id: 'md5',
    name: 'MD5 哈希',
    description: '计算字符串的 MD5 哈希值',
    category: '编码解码',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: '要计算的文本',
        required: true,
      },
    ],
    example: '${{md5("hello")}} → 5d41402abc4b2a76b9719d911017c592',
    syntax: 'md5("text")',
  },

  // ========== 数据生成类 ==========
  {
    id: 'guid',
    name: 'GUID',
    description: '生成 GUID（与 UUID 相同）',
    category: '数据生成',
    parameters: [],
    example: '${{guid()}} → 550e8400-e29b-41d4-a716-446655440000',
    syntax: 'guid()',
  },
  {
    id: 'randomBoolean',
    name: '随机布尔值',
    description: '生成随机的 true 或 false',
    category: '数据生成',
    parameters: [],
    example: '${{randomBoolean()}} → true',
    syntax: 'randomBoolean()',
  },
  {
    id: 'randomFloat',
    name: '随机浮点数',
    description: '生成指定范围内的随机浮点数',
    category: '数据生成',
    parameters: [
      {
        name: 'min',
        type: 'number',
        description: '最小值',
        required: false,
        default: 0,
      },
      {
        name: 'max',
        type: 'number',
        description: '最大值',
        required: false,
        default: 1,
      },
      {
        name: 'decimals',
        type: 'number',
        description: '小数位数',
        required: false,
        default: 2,
      },
    ],
    example: '${{randomFloat(0, 100, 2)}} → 42.73',
    syntax: 'randomFloat(0, 100, 2)',
  },
];

/**
 * 按类别分组函数
 */
export function getFunctionsByCategory(): Record<string, RuntimeFunction[]> {
  return RUNTIME_FUNCTIONS.reduce((acc, func) => {
    if (!acc[func.category]) {
      acc[func.category] = [];
    }
    acc[func.category].push(func);
    return acc;
  }, {} as Record<string, RuntimeFunction[]>);
}

/**
 * 根据 ID 获取函数
 */
export function getFunctionById(id: string): RuntimeFunction | undefined {
  return RUNTIME_FUNCTIONS.find(f => f.id === id);
}

/**
 * 搜索函数
 */
export function searchFunctions(query: string): RuntimeFunction[] {
  const lowerQuery = query.toLowerCase();
  return RUNTIME_FUNCTIONS.filter(
    func =>
      func.name.toLowerCase().includes(lowerQuery) ||
      func.description.toLowerCase().includes(lowerQuery) ||
      func.id.toLowerCase().includes(lowerQuery)
  );
}

