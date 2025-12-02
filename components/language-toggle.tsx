"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const [locale, setLocale] = React.useState<string>("zh")
  const [mounted, setMounted] = React.useState(false)

  // 避免服务端渲染不匹配
  React.useEffect(() => {
    setMounted(true)
    // 从 cookie 读取当前语言
    const currentLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] || 'zh'
    setLocale(currentLocale)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Globe className="h-5 w-5" />
        <span className="sr-only">切换语言</span>
      </Button>
    )
  }

  const toggleLanguage = () => {
    const newLocale = locale === "zh" ? "en" : "zh"
    // 设置 cookie
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`
    setLocale(newLocale)
    // 刷新页面以应用新语言
    window.location.reload()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      title={locale === "zh" ? "切换到英文" : "Switch to Chinese"}
    >
      <Globe className="h-5 w-5" />
      <span className="ml-1 text-xs font-medium">
        {locale === "zh" ? "中" : "EN"}
      </span>
      <span className="sr-only">
        {locale === "zh" ? "切换语言" : "Toggle Language"}
      </span>
    </Button>
  )
}


