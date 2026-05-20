"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Tab, TabsContextType } from "@/types/tabs"
import { useRouter, usePathname } from "next/navigation"

const TabsContext = createContext<TabsContextType | undefined>(undefined)

const TABS_STORAGE_KEY = 'app-tabs'
const ACTIVE_TAB_STORAGE_KEY = 'app-active-tab'
const MAX_TABS = 10

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // 从 localStorage 恢复标签页
  useEffect(() => {
    const savedTabs = localStorage.getItem(TABS_STORAGE_KEY)
    const savedActiveTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
    
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs)
        setTabs(parsedTabs)
        if (savedActiveTab) {
          setActiveTabId(savedActiveTab)
        }
      } catch (e) {
        console.error('Failed to parse tabs:', e)
      }
    }
  }, [])

  // 保存标签页到 localStorage，当标签为空时顺便清理 key，避免残留数据
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs))
    } else {
      localStorage.removeItem(TABS_STORAGE_KEY)
      localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY)
    }
  }, [tabs])

  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId)
    }
  }, [activeTabId])

  // 添加标签页
  const addTab = (newTab: Omit<Tab, 'id'>) => {
    // 检查是否已存在相同路径的标签
    const existingTab = tabs.find(tab => tab.path === newTab.path)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      router.push(existingTab.path)
      return
    }

    // 检查是否达到最大标签数
    if (tabs.length >= MAX_TABS) {
      // 移除第一个非固定且非活跃的标签
      const removableTab = tabs.find(tab => !tab.pinned && tab.id !== activeTabId)
      if (removableTab) {
        setTabs(prev => prev.filter(tab => tab.id !== removableTab.id))
      } else {
        // 如果所有标签都固定了，不添加新标签
        return
      }
    }

    const tab: Tab = {
      ...newTab,
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
    router.push(tab.path)
  }

  // 移除标签页
  const removeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return

    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)

    // 如果关闭的是当前活跃标签，切换到相邻标签
    if (activeTabId === tabId && newTabs.length > 0) {
      const nextTab = newTabs[Math.min(tabIndex, newTabs.length - 1)]
      setActiveTabId(nextTab.id)
      router.push(nextTab.path)
    } else if (newTabs.length === 0) {
      setActiveTabId(null)
    }
  }

  // 切换活跃标签
  const setActiveTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      setActiveTabId(tabId)
      router.push(tab.path)
    }
  }

  // 关闭其他标签
  const closeOtherTabs = (tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id === tabId || tab.pinned))
    setActiveTabId(tabId)
  }

  // 关闭所有标签
  const closeAllTabs = () => {
    const pinnedTabs = tabs.filter(tab => tab.pinned)
    setTabs(pinnedTabs)
    if (pinnedTabs.length > 0) {
      setActiveTabId(pinnedTabs[0].id)
      router.push(pinnedTabs[0].path)
    } else {
      setActiveTabId(null)
    }
  }

  // 关闭右侧标签
  const closeRightTabs = (tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return

    setTabs(prev => [
      ...prev.slice(0, tabIndex + 1),
      ...prev.slice(tabIndex + 1).filter(tab => tab.pinned)
    ])
  }

  // 切换固定状态
  const togglePinTab = (tabId: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab
    ))
  }

  // 完全重置标签状态（用于退出登录等场景）
  const resetTabs = () => {
    setTabs([])
    setActiveTabId(null)
    localStorage.removeItem(TABS_STORAGE_KEY)
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY)
  }

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        maxTabs: MAX_TABS,
        addTab,
        removeTab,
        setActiveTab,
        closeOtherTabs,
        closeAllTabs,
        closeRightTabs,
        togglePinTab,
        resetTabs,
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

export function useTabs() {
  const context = useContext(TabsContext)
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabsProvider')
  }
  return context
}
