"use client"

import { useTabs } from "@/contexts/tabs-context"
import { TabBar } from "./TabBar"
import { usePathname } from "next/navigation"
import { useEffect, useState, ReactNode } from "react"

interface TabManagerProps {
  children: ReactNode
}

export function TabManager({ children }: TabManagerProps) {
  const { tabs, activeTabId } = useTabs()
  const pathname = usePathname()
  const [renderedTabs, setRenderedTabs] = useState<Map<string, ReactNode>>(new Map())

  // 当路由变化时，保存当前内容到对应的标签
  useEffect(() => {
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(tab => tab.id === activeTabId)
      if (activeTab && activeTab.path === pathname) {
        setRenderedTabs(prev => {
          const newMap = new Map(prev)
          newMap.set(activeTabId, children)
          return newMap
        })
      }
    }
  }, [activeTabId, pathname, children, tabs])

  // 清理已关闭标签的内容
  useEffect(() => {
    setRenderedTabs(prev => {
      const newMap = new Map()
      tabs.forEach(tab => {
        if (prev.has(tab.id)) {
          newMap.set(tab.id, prev.get(tab.id))
        }
      })
      return newMap
    })
  }, [tabs])

  // 所有页面内容区域都允许纵向滚动
  const contentOverflow = 'overflow-auto scrollbar-hide'

  return (
    <div className="flex flex-col h-full">
      <TabBar />
      <div className="flex-1 overflow-hidden relative">
        {tabs.length === 0 ? (
          <div className={`h-full ${contentOverflow}`}>
            {children}
          </div>
        ) : (
          tabs.map(tab => {
            const tabOverflow = 'overflow-auto scrollbar-hide'
            return (
              <div
                key={tab.id}
                className={`h-full ${tabOverflow}`}
                style={{
                  display: tab.id === activeTabId ? 'block' : 'none'
                }}
              >
                {renderedTabs.get(tab.id) || children}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
