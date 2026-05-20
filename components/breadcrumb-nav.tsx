"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function BreadcrumbNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tTestSuites = useTranslations('testSuites')
  const tExecution = useTranslations('execution')

  const getPathSegments = () => {
    const PAGE_NAMES: Record<string, string> = {
      'dashboard': t('dashboard'),
      'api-repository': t('apiRepository'),
      'api-capture': t('apiCapture'),
      'ai-generate': t('aiGenerate'),
      'test-suites': t('testSuites'),
      'test-orchestration': t('testOrchestration'),
      'execution': t('execution'),
      'reports': t('reports'),
      'settings': t('settings'),
      'users': t('userManagement'),
      'edit': tCommon('edit'),
      'create': tCommon('create'),
      'history': tTestSuites('executionHistory'),
    }

    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: { label: string; href: string; isLast: boolean }[] = []

    // /execution/suite/[id] 或 /execution/suite/[id]/logs 特殊处理
    if (segments[0] === 'execution' && segments[1] === 'suite' && segments[2]) {
      breadcrumbs.push({
        label: PAGE_NAMES['execution'] || t('execution'),
        href: '/execution',
        isLast: false
      })
      breadcrumbs.push({
        label: t('executionDetails'),
        href: '/' + segments.slice(0, 3).join('/'),
        isLast: segments.length <= 3
      })
      if (segments[3] === 'logs') {
        breadcrumbs.push({
          label: tExecution('viewLogs'),
          href: pathname,
          isLast: true
        })
      }
      return breadcrumbs
    }

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      const isLast = index === segments.length - 1
      
      // 如果是 UUID、CUID 或数字 ID，显示为详情
      const isId = segment.match(/^[a-f0-9-]{36}$/i) || 
        segment.match(/^\d+$/) || 
        segment.match(/^[a-z0-9]{20,}$/i)
      if (isId && isLast) {
        breadcrumbs.push({ label: t('testSuiteDetails'), href, isLast })
      } else if (!isId) {
        breadcrumbs.push({
          label: PAGE_NAMES[segment] || segment,
          href,
          isLast
        })
      }
    })

    return breadcrumbs
  }

  const breadcrumbs = getPathSegments()

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center space-x-1 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent"
        title={t('dashboard')}
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium px-2 py-1">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
