"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ParamValue } from '@/types/test-case';
import { Code, AlertCircle, CheckCircle2, Variable, FunctionSquare } from 'lucide-react';
import { Node } from '@xyflow/react';
import VariableSelector from './VariableSelector';
import FunctionSelector from './FunctionSelector';

interface JsonEditorWithVariablesProps {
  initialJson: string; // 初始 JSON 字符串（带 ${变量} 格式）
  values: Record<string, ParamValue>; // 现有的变量配置（扁平化的路径格式）
  onChange: (jsonText: string, variables: Record<string, ParamValue>) => void;
  nodes: Node[];
  currentNodeId: string;
}

export default function JsonEditorWithVariables({
  initialJson,
  values,
  onChange,
  nodes,
  currentNodeId,
}: JsonEditorWithVariablesProps) {
  const [jsonText, setJsonText] = useState(initialJson);
  const [error, setError] = useState<string | null>(null);
  const [showVarSelector, setShowVarSelector] = useState(false);
  const [showFuncSelector, setShowFuncSelector] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    // 当 initialJson 改变时（例如从表单切换到 JSON 模式），更新本地状态
    setJsonText(initialJson);
    setError(null);
  }, [initialJson]);

  // 解析 JSON 并提取变量
  const parseJsonAndExtractVariables = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      const extractedVariables: Record<string, ParamValue> = {};

      // 递归遍历 JSON 对象，提取所有字段
      const traverse = (obj: any, path: string = '') => {
        if (Array.isArray(obj)) {
          // 🔧 处理空数组：保留空数组结构
          if (obj.length === 0) {
            extractedVariables[path || 'root'] = {
              valueType: 'fixed',
              value: [] as any[],
            };
            return;
          }
          // 处理数组：递归处理每个元素
          obj.forEach((item, index) => {
            const currentPath = path ? `${path}.${index}` : `${index}`;
            
            // 检查数组元素是否是 ${变量} 格式
            if (typeof item === 'string' && item.startsWith('${') && item.endsWith('}')) {
              const varName = item.substring(2, item.length - 1);
              extractedVariables[currentPath] = {
                valueType: 'variable',
                value: varName,
                variable: varName,
              };
            } else if (typeof item === 'object' && item !== null) {
              // 递归处理数组中的对象或嵌套数组
              traverse(item, currentPath);
            } else {
              // 基本类型作为固定值
              extractedVariables[currentPath] = {
                valueType: 'fixed',
                value: item,
              };
            }
          });
        } else if (typeof obj === 'object' && obj !== null) {
          // 🔧 处理空对象：保留空对象结构
          if (Object.keys(obj).length === 0) {
            extractedVariables[path || 'root'] = {
              valueType: 'fixed',
              value: {} as object,
            };
            return;
          }
          // 处理对象
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const currentPath = path ? `${path}.${key}` : key;
              const value = obj[key];

              // 检查是否是 ${变量} 格式
              if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
                const varName = value.substring(2, value.length - 1);
                extractedVariables[currentPath] = {
                  valueType: 'variable',
                  value: varName,
                  variable: varName,
                };
              } else if (typeof value === 'object' && value !== null) {
                // 递归处理嵌套对象或数组
                traverse(value, currentPath);
              } else {
                // 其他类型作为固定值
                // 保持原始数据类型（不要转为字符串）
                extractedVariables[currentPath] = {
                  valueType: 'fixed',
                  value: value, // 保持原始类型：数字、布尔等
                };
              }
            }
          }
        } else {
          // 如果顶层不是对象或数组，直接保存（保持原始类型）
          extractedVariables['root'] = {
            valueType: 'fixed',
            value: obj, // 保持原始类型
          };
        }
      };

      traverse(parsed);
      setError(null);
      onChange(text, extractedVariables);
    } catch (e: any) {
      setError('无效 JSON 格式: ' + e.message);
      // 即使 JSON 无效，也通知父组件（传递空变量）
      onChange(text, {});
    }
  }, [onChange]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setJsonText(newText);
    parseJsonAndExtractVariables(newText);
  };

  const handleInsertVariable = (variablePath: string) => {
    if (!variablePath) return;
    
    const varPlaceholder = `"\${${variablePath}}"`;
    const before = jsonText.substring(0, cursorPosition);
    const after = jsonText.substring(cursorPosition);
    const newText = before + varPlaceholder + after;
    
    setJsonText(newText);
    setCursorPosition(cursorPosition + varPlaceholder.length);
    setShowVarSelector(false);
    parseJsonAndExtractVariables(newText);
  };

  const handleInsertFunction = (functionSyntax: string) => {
    if (!functionSyntax) return;
    
    const before = jsonText.substring(0, cursorPosition);
    const after = jsonText.substring(cursorPosition);
    const newText = before + functionSyntax + after;
    
    setJsonText(newText);
    setCursorPosition(cursorPosition + functionSyntax.length);
    setShowFuncSelector(false);
    parseJsonAndExtractVariables(newText);
  };

  const formatJson = () => {
    try {
      const obj = JSON.parse(jsonText);
      const formatted = JSON.stringify(obj, null, 2);
      setJsonText(formatted);
      parseJsonAndExtractVariables(formatted);
    } catch (e) {
      // 忽略错误
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="json-editor" className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          JSON 编辑器
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVarSelector(true)}
            className="gap-1"
          >
            <Variable className="h-3.5 w-3.5" />
            插入变量
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFuncSelector(true)}
            className="gap-1"
          >
            <FunctionSquare className="h-3.5 w-3.5" />
            插入函数
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatJson}
          >
            格式化
          </Button>
        </div>
      </div>

      <Textarea
        id="json-editor"
        value={jsonText}
        onChange={handleJsonChange}
        onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
        rows={12}
        className={`font-mono text-sm ${error ? 'border-destructive' : ''}`}
        placeholder={`{\n  "key": "value",\n  "dynamic": "\${step_xxx.response.userId}"\n}`}
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!error && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
          <span>JSON 格式正确。使用 <code className="px-1 py-0.5 bg-muted rounded text-xs">$&#123;变量&#125;</code> 或 <code className="px-1 py-0.5 bg-muted rounded text-xs">$&#123;&#123;函数()&#125;&#125;</code></span>
        </div>
      )}

      {/* 变量选择器 */}
      {showVarSelector && (
        <div className="border rounded-lg p-4 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">选择变量插入到光标位置</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVarSelector(false)}
            >
              取消
            </Button>
          </div>
          <VariableSelector
            nodes={nodes}
            currentNodeId={currentNodeId}
            value=""
            onChange={handleInsertVariable}
          />
        </div>
      )}

      {/* 函数选择器 */}
      {showFuncSelector && (
        <div className="border rounded-lg p-4 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">选择函数插入到光标位置</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFuncSelector(false)}
            >
              取消
            </Button>
          </div>
          <FunctionSelector onSelect={handleInsertFunction} />
        </div>
      )}

      {/* 使用说明 */}
      <div className="text-xs space-y-1.5 text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium text-foreground flex items-center gap-1">
          <Code className="h-3.5 w-3.5" />
          使用说明：
        </p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>直接编辑 JSON，支持任意复杂的嵌套结构</li>
          <li>使用 <code className="bg-background px-1 rounded">$&#123;变量路径&#125;</code> 引用其他节点的数据</li>
          <li>使用 <code className="bg-background px-1 rounded">$&#123;&#123;函数()&#125;&#125;</code> 插入动态函数（如随机值、时间戳等）</li>
          <li>支持拼接：<code className="bg-background px-1 rounded">"名称$&#123;&#123;random()&#125;&#125;"</code> 运行时解析为 "名称87188172"</li>
          <li>点击"插入变量"或"插入函数"按钮可快速选择</li>
        </ul>
      </div>
    </div>
  );
}
