"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ThemeConfig, themes, applyTheme, getThemeById } from '@/lib/themes'

interface ThemeStyleContextType {
  currentTheme: ThemeConfig
  setTheme: (themeId: string) => void
  availableThemes: ThemeConfig[]
}

const ThemeStyleContext = createContext<ThemeStyleContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'AI TestMind-theme-style'

export function ThemeStyleProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(themes[0])
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedThemeId) {
      const theme = getThemeById(savedThemeId)
      if (theme) {
        setCurrentTheme(theme)
        applyTheme(theme)
      }
    } else {
      // Apply default theme
      applyTheme(themes[0])
    }
    setMounted(true)
  }, [])

  const setTheme = (themeId: string) => {
    const theme = getThemeById(themeId)
    if (theme) {
      setCurrentTheme(theme)
      applyTheme(theme)
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
    }
  }

  // Prevent flash of unstyled content
  if (!mounted) {
    return null
  }

  return (
    <ThemeStyleContext.Provider
      value={{
        currentTheme,
        setTheme,
        availableThemes: themes,
      }}
    >
      {children}
    </ThemeStyleContext.Provider>
  )
}

export function useThemeStyle() {
  const context = useContext(ThemeStyleContext)
  if (context === undefined) {
    throw new Error('useThemeStyle must be used within a ThemeStyleProvider')
  }
  return context
}

