export interface Tab {
  id: string              // 唯一标识
  path: string            // 路由路径
  title: string           // 标签标题（回退用）
  labelKey?: string       // 侧边栏翻译 key，用于多语言
  closable: boolean       // 是否可关闭
  pinned: boolean         // 是否固定
}

export interface TabsContextType {
  tabs: Tab[]
  activeTabId: string | null
  maxTabs: number
  addTab: (tab: Omit<Tab, 'id'>) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  closeRightTabs: (tabId: string) => void
  togglePinTab: (tabId: string) => void
  resetTabs: () => void
}
