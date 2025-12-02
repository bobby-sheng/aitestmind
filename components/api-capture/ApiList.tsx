"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Radio, Trash2, Filter, Save, Check, Search } from "lucide-react";
import { CapturedApi } from "@/types/har";
import { formatTime, formatSize, getMethodVariant } from "@/lib/utils/api-helpers";
import { useTranslations } from "next-intl";

interface ApiListProps {
  apis: CapturedApi[];
  onDelete: (index: number) => void;
  onClearAll?: () => void;
  onViewDetail?: (api: CapturedApi, index: number) => void;
  onBatchSave?: (apis: CapturedApi[]) => void;
}

type FilterType = "all" | "xhr";

export function ApiList({ apis, onDelete, onClearAll, onViewDetail, onBatchSave }: ApiListProps) {
  const t = useTranslations('apiCapture');
  const tCommon = useTranslations('common');
  const [filterType, setFilterType] = useState<FilterType>("xhr");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 过滤和排序API列表
  const filteredApis = useMemo(() => {
    let filtered = apis;
    
    // 过滤类型
    if (filterType !== "all") {
      // 只显示 fetch/XHR 类型的请求
      filtered = filtered.filter(api => {
        const type = api.resourceType?.toLowerCase();
        return type === "xhr" || type === "fetch";
      });
    }
    
    // 关键字过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(api => {
        return (
          api.path.toLowerCase().includes(keyword) ||
          api.method.toLowerCase().includes(keyword) ||
          api.status.toString().includes(keyword) ||
          api.statusText.toLowerCase().includes(keyword)
        );
      });
    }
    
    // 按时间倒序排序（最新的在最上面）
    return [...filtered].sort((a, b) => {
      return new Date(b.startedDateTime).getTime() - new Date(a.startedDateTime).getTime();
    });
  }, [apis, filterType, searchKeyword]);

  // 选中的API列表
  const selectedApis = useMemo(() => {
    return apis.filter(api => selectedIds.has(api.id));
  }, [apis, selectedIds]);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredApis.map(api => api.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 切换单个选择
  const handleToggleSelect = (apiId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(apiId)) {
      newSelected.delete(apiId);
    } else {
      newSelected.add(apiId);
    }
    setSelectedIds(newSelected);
  };

  // 批量保存
  const handleBatchSave = () => {
    if (onBatchSave && selectedApis.length > 0) {
      onBatchSave(selectedApis);
    }
  };

  // 是否全选
  const isAllSelected = filteredApis.length > 0 && filteredApis.every(api => selectedIds.has(api.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* 第一行：标题和操作按钮 */}
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{t('recordedAPIs')} ({filteredApis.length}/{apis.length})</CardTitle>
              <CardDescription>
                {t('capturedRequests')}
                {selectedIds.size > 0 && ` · ${t('selected')} ${selectedIds.size} ${t('items')}`}
              </CardDescription>
            </div>
            
            {/* 过滤器和操作按钮组 */}
            <div className="flex items-center gap-3">
              {/* 过滤器 */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterType("xhr")}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-medium transition-all
                      ${filterType === "xhr"
                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                  >
                    Fetch/XHR
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-medium transition-all
                      ${filterType === "all"
                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                  >
                    {tCommon('all')}
                  </button>
                </div>
              </div>
              
              {/* 全部清理按钮 */}
              {apis.length > 0 && onClearAll && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearAll}
                  className="h-7 px-3 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t('clearAll')}
                </Button>
              )}
            </div>
          </div>

          {/* 第二行：关键字搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={tCommon('search')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 h-9"
            />
            {searchKeyword && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchKeyword("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 px-2 text-xs"
              >
                {tCommon('clear')}
              </Button>
            )}
          </div>

          {/* 第三行：批量操作工具栏 */}
          {filteredApis.length > 0 && (
            <div className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                />
                <span className="text-sm text-muted-foreground">
                  {t('selectAll')}
                </span>
              </div>

              {selectedIds.size > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <Button
                    size="sm"
                    onClick={handleBatchSave}
                    className="h-8"
                    disabled={!onBatchSave}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {t('batchSave')} ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-8"
                  >
                    {t('deselectAll')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto">
        {filteredApis.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>
              {apis.length === 0 
                ? t('startRecordingTip') 
                : t('noFilteredApis')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApis.map((api, index) => {
              // 获取原始索引用于删除操作
              const originalIndex = apis.indexOf(api);
              const isSelected = selectedIds.has(api.id);
              
              return (
              <div 
                key={api.id || index} 
                className={`flex items-start gap-4 p-4 border rounded-lg transition-all ${
                  isSelected 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'hover:bg-accent/50'
                }`}
              >
                {/* 复选框 */}
                <div className="flex items-center pt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSelect(api.id)}
                  />
                </div>

                <div className="flex items-start justify-between flex-1 min-w-0">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Badge 
                      variant={getMethodVariant(api.method)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {api.method}
                    </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium font-mono text-sm break-all">
                      {api.path}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          api.status >= 200 && api.status < 300 ? 'bg-green-500' :
                          api.status >= 300 && api.status < 400 ? 'bg-blue-500' :
                          api.status >= 400 && api.status < 500 ? 'bg-yellow-500' :
                          api.status >= 500 ? 'bg-red-500' : 'bg-gray-500'
                        }`}></span>
                        {api.status} {api.statusText}
                      </span>
                      <span>⏱️ {api.time.toFixed(0)}ms</span>
                      <span>📦 {formatSize(api.size)}</span>
                      <span>🕒 {formatTime(api.startedDateTime)}</span>
                      {api.resourceType && api.resourceType !== 'other' && (
                        <Badge variant="outline" className="text-xs">
                          {api.resourceType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {onViewDetail && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onViewDetail(api, originalIndex)}
                      >
                        {t('viewDetails')}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onDelete(originalIndex)}
                      className="hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

