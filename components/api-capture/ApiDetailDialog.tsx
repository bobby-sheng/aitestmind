"use client";

import { CapturedApi } from "@/types/har";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getMethodVariant } from "@/lib/utils/api-helpers";
import { useTranslations } from "next-intl";

interface ApiDetailDialogProps {
  api: CapturedApi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiDetailDialog({ api, open, onOpenChange }: ApiDetailDialogProps) {
  const t = useTranslations('apiCapture');
  
  if (!api) return null;

  // 格式化 JSON 显示
  const formatJson = (data: any) => {
    try {
      if (typeof data === "string") {
        return JSON.stringify(JSON.parse(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return data;
    }
  };

  // 渲染键值对列表
  const renderKeyValueList = (data: Record<string, string>) => {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">{t('noData')}</p>;
    }
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-4 gap-4 text-sm border-b pb-2">
            <div className="font-medium text-muted-foreground break-all">{key}:</div>
            <div className="col-span-3 break-all font-mono text-xs">{value}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge variant={getMethodVariant(api.method)}>{api.method}</Badge>
            <DialogTitle className="flex-1 font-mono text-sm break-all">
              {api.url}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1`}>
              <span className={`inline-block w-2 h-2 rounded-full ${
                api.status >= 200 && api.status < 300 ? 'bg-green-500' :
                api.status >= 300 && api.status < 400 ? 'bg-blue-500' :
                api.status >= 400 && api.status < 500 ? 'bg-yellow-500' :
                api.status >= 500 ? 'bg-red-500' : 'bg-gray-500'
              }`}></span>
              {t('statusCode')}: {api.status} {api.statusText}
            </span>
            <span>{t('duration')}: {api.time.toFixed(0)}ms</span>
            <span>{t('size')}: {(api.size / 1024).toFixed(2)} KB</span>
            {api.resourceType && (
              <Badge variant="outline" className="text-xs">
                {api.resourceType}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="headers" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="headers">{t('headers')}</TabsTrigger>
            <TabsTrigger value="request">{t('requestBody')}</TabsTrigger>
            <TabsTrigger value="response">{t('responseBody')}</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Headers */}
            <TabsContent value="headers" className="space-y-6 mt-0">
              <div>
                <h3 className="text-sm font-semibold mb-3">General</h3>
                <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="font-medium text-muted-foreground">Request URL:</div>
                    <div className="col-span-3 break-all font-mono text-xs">{api.url}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="font-medium text-muted-foreground">Request Method:</div>
                    <div className="col-span-3 font-mono text-xs">{api.method}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="font-medium text-muted-foreground">Status Code:</div>
                    <div className="col-span-3 font-mono text-xs">{api.status} {api.statusText}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="font-medium text-muted-foreground">Content-Type:</div>
                    <div className="col-span-3 font-mono text-xs">{api.mimeType || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Request Headers</h3>
                <div className="bg-muted/30 p-4 rounded-lg">
                  {renderKeyValueList(api.headers)}
                </div>
              </div>

              {Object.keys(api.queryParams || {}).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Query String Parameters</h3>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    {renderKeyValueList(api.queryParams)}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Request */}
            <TabsContent value="request" className="mt-0">
              <div className="space-y-4">
                {api.requestBody ? (
                  <>
                    <h3 className="text-sm font-semibold">Request Payload</h3>
                    <pre className="bg-muted/30 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                      {formatJson(api.requestBody)}
                    </pre>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">此请求没有请求体</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Response */}
            <TabsContent value="response" className="mt-0">
              <div className="space-y-4">
                {api.responseBody ? (
                  <>
                    <h3 className="text-sm font-semibold">Response Body</h3>
                    <pre className="bg-muted/30 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                      {formatJson(api.responseBody)}
                    </pre>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">此响应没有响应体</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Preview */}
            <TabsContent value="preview" className="mt-0">
              <div className="space-y-4">
                {api.responseBody ? (
                  <>
                    <h3 className="text-sm font-semibold">Preview</h3>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      {api.mimeType?.includes('json') ? (
                        <pre className="text-xs overflow-auto max-h-96 font-mono">
                          {formatJson(api.responseBody)}
                        </pre>
                      ) : api.mimeType?.includes('html') ? (
                        <iframe
                          srcDoc={typeof api.responseBody === 'string' ? api.responseBody : JSON.stringify(api.responseBody)}
                          className="w-full h-96 border rounded"
                          title="HTML Preview"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <pre className="text-xs overflow-auto max-h-96 font-mono">
                          {typeof api.responseBody === 'string' 
                            ? api.responseBody 
                            : JSON.stringify(api.responseBody)}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">无可预览内容</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

