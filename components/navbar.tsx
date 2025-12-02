"use client"

import { usePathname, useRouter } from "next/navigation"
import { User, LogOut, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeStyleSelector } from "@/components/theme-style-selector"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // 获取当前用户信息
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr))
      } catch (e) {
        console.error('Failed to parse user:', e)
      }
    }
  }, [])
  
  // 获取页面标题，支持动态路由
  const getPageTitle = () => {
    // 精确匹配
    const PAGE_TITLES: Record<string, string> = {
      '/': t('dashboard'),
      '/api-repository': t('apiRepository'),
      '/api-capture': t('apiCapture'),
      '/ai-generate': t('aiGenerate'),
      '/test-suites': t('testSuites'),
      '/test-orchestration': t('testOrchestration'),
      '/execution': t('execution'),
      '/reports': t('reports'),
      '/settings': t('settings'),
      '/users': t('userManagement'),
    }
    
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname]
    }
    
    // 匹配动态路由
    if (pathname.startsWith('/test-suites/')) {
      if (pathname.includes('/edit')) return t('editTestSuite')
      if (pathname.includes('/create')) return t('createTestSuite')
      return t('testSuiteDetails')
    }
    if (pathname.startsWith('/execution/')) {
      return t('executionDetails')
    }
    
    return t('platformTitle')
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
      
      // 清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      toast({
        title: t('logoutSuccess'),
        description: t('logoutSuccessDesc'),
      })
      
      // 跳转到登录页
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // 即使出错也清除本地数据
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  const handleUserManagement = () => {
    router.push('/users')
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-6 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{getPageTitle()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeStyleSelector />
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser?.username || t('notLoggedIn')}
                  </p>
                  {currentUser?.email && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  )}
                  {currentUser?.role === 'admin' && (
                    <p className="text-xs leading-none text-primary">
                      {t('admin')}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentUser?.role === 'admin' && (
                <DropdownMenuItem onClick={handleUserManagement}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>{t('userManagement')}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

