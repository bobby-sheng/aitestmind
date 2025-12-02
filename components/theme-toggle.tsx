"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const t = useTranslations('nav')

  // 避免服务端渲染不匹配
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Sun className="h-5 w-5" />
        <span className="sr-only">{t('toggleTheme')}</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    // 如果当前是 system 或者实际显示的是 light，则切换到 dark
    // 否则切换到 light
    if (theme === "system") {
      setTheme(resolvedTheme === "light" ? "dark" : "light")
    } else {
      setTheme(theme === "light" ? "dark" : "light")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('toggleTheme')}</span>
    </Button>
  )
}

