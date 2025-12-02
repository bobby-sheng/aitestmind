"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { useThemeStyle } from "@/contexts/theme-style-context"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeStyleSelector() {
  const { currentTheme, setTheme, availableThemes } = useThemeStyle()
  const t = useTranslations('nav')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3">
          <div 
            className="h-4 w-4 rounded-full border shadow-sm" 
            style={{ 
              backgroundColor: currentTheme.variables.primary,
              borderColor: currentTheme.variables.border 
            }}
          />
          <span className="text-sm font-medium">{currentTheme.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
          <span className="sr-only">{t('selectThemeStyle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t('switchTheme')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {availableThemes.length} {t('themes')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {availableThemes.map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer py-3",
                currentTheme.id === theme.id && "bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {/* Color preview circles */}
                  <div
                    className="h-4 w-4 rounded-full border shadow-sm"
                    style={{ 
                      backgroundColor: theme.variables.primary,
                      borderColor: theme.variables.border 
                    }}
                  />
                  <div
                    className="h-4 w-4 rounded-full border shadow-sm"
                    style={{ 
                      backgroundColor: theme.variables.secondary || theme.variables.muted,
                      borderColor: theme.variables.border 
                    }}
                  />
                  <div
                    className="h-4 w-4 rounded-full border shadow-sm"
                    style={{ 
                      backgroundColor: theme.variables.accent || theme.variables.primary,
                      borderColor: theme.variables.border 
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{theme.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {theme.colorScheme}
                  </span>
                </div>
              </div>
              {currentTheme.id === theme.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

