"use client"

import { useTabs } from "@/contexts/tabs-context"
import { X, Pin, MoreHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PATH_LABEL_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/api-capture': 'apiCapture',
  '/api-repository': 'apiRepository',
  '/test-orchestration': 'testOrchestration',
  '/ai-generate': 'aiGenerate',
  '/test-suites': 'testSuites',
  '/execution': 'execution',
  '/settings': 'settings',
}

function getTabDisplayTitle(
  tab: { path: string; title: string },
  tSidebar: (key: string) => string,
  tNav: (key: string) => string
): string {
  // 精确匹配 - 用 sidebar 翻译（与菜单一致）
  if (PATH_LABEL_MAP[tab.path]) {
    return tSidebar(PATH_LABEL_MAP[tab.path])
  }
  // 动态路由 - 用 nav 命名空间
  if (tab.path.startsWith('/test-suites/')) {
    if (tab.path.includes('/edit')) return tNav('editTestSuite')
    if (tab.path.includes('/create')) return tNav('createTestSuite')
    return tNav('testSuiteDetails')
  }
  if (tab.path.startsWith('/execution/')) return tNav('executionDetails')
  return tab.title
}

export function TabBar() {
  const t = useTranslations('sidebar')
  const tNav = useTranslations('nav')
  const {
    tabs,
    activeTabId,
    setActiveTab,
    removeTab,
    closeOtherTabs,
    closeAllTabs,
    closeRightTabs,
    togglePinTab,
  } = useTabs()

  if (tabs.length === 0) return null

  const activeTab = activeTabId ? tabs.find(t => t.id === activeTabId) : null
  const activeIndex = activeTab ? tabs.findIndex(t => t.id === activeTabId) : -1

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    removeTab(tabId)
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      removeTab(tabId)
    }
  }

  return (
    <div className="h-12 bg-muted/30 border-b border-border flex items-center gap-1 px-2">
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const isLastTab = tabs.length === 1

        return (
          <div
            key={tab.id}
            className={cn(
              "group relative flex items-center h-9 pl-3 pr-2 rounded-t-lg cursor-pointer transition-all min-w-[80px] max-w-[140px] flex-shrink-0 select-none overflow-hidden",
              isActive
                ? "bg-background shadow-sm"
                : "bg-transparent hover:bg-muted/50"
            )}
            onClick={() => handleTabClick(tab.id)}
            onMouseDown={(e) => handleMiddleClick(e, tab.id)}
          >
            {/* 固定标记 */}
            {tab.pinned && (
              <Pin className="h-3 w-3 mr-2 text-primary flex-shrink-0" fill="currentColor" />
            )}

              {/* 标题 - 有 labelKey 则按当前语言翻译，否则用存储的 title */}
              <span
                className={cn(
                  "flex-1 min-w-0 truncate text-sm",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}
                title={tab.labelKey ? t(tab.labelKey as any) : getTabDisplayTitle(tab, t, tNav)}
              >
                {tab.labelKey ? t(tab.labelKey as any) : getTabDisplayTitle(tab, t, tNav)}
              </span>

            {/* 关闭按钮 */}
            {tab.closable && !isLastTab && (
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className={cn(
                  "p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                title="关闭标签"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* 活跃标签底部边框 */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </div>
        )
      })}
      </div>

      {/* 页签栏右侧 - 更多菜单 */}
      <div className="flex-shrink-0 pl-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded hover:bg-muted transition-colors"
              title="标签操作"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {activeTab && (
              <>
                <DropdownMenuItem onClick={() => togglePinTab(activeTab.id)}>
                  <Pin className="mr-2 h-4 w-4" />
                  {activeTab.pinned ? "取消固定" : "固定当前标签"}
                </DropdownMenuItem>
                {activeTab.closable && tabs.length > 1 && (
                  <DropdownMenuItem onClick={() => removeTab(activeTab.id)}>
                    <X className="mr-2 h-4 w-4" />
                    关闭当前
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => activeTab && closeOtherTabs(activeTab.id)}
              disabled={tabs.length <= 1}
            >
              关闭其他
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => activeTab && closeRightTabs(activeTab.id)}
              disabled={activeIndex < 0 || activeIndex >= tabs.length - 1}
            >
              关闭右侧
            </DropdownMenuItem>
            <DropdownMenuItem onClick={closeAllTabs}>
              关闭所有
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
