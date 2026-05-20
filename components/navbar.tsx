"use client"

import { usePathname, useRouter } from "next/navigation"
import { User, LogOut, Users, PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeStyleSelector } from "@/components/theme-style-selector"
import { LanguageToggle } from "@/components/language-toggle"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
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
import { useTabs } from "@/contexts/tabs-context"

interface NavbarProps {
  onToggleSidebar?: () => void
  isCollapsed?: boolean
}

export function Navbar({ onToggleSidebar, isCollapsed = false }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const { resetTabs } = useTabs()
  
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
      
      // 清除本地存储（含页签，避免重新登录后仍显示上次的页签）
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('app-tabs')
      localStorage.removeItem('app-active-tab')
      // 重置内存中的页签状态
      resetTabs()
      
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
      localStorage.removeItem('app-tabs')
      localStorage.removeItem('app-active-tab')
      resetTabs()
      router.push('/login')
    }
  }

  const handleUserManagement = () => {
    router.push('/users')
  }

  return (
    <div className="border-b border-border">
      <div className="flex h-14 items-center px-6 gap-4">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-8 w-8 hidden md:flex flex-shrink-0"
            title={isCollapsed ? "展开侧边栏" : "收缩侧边栏"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <BreadcrumbNav />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeStyleSelector />
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser?.username || currentUser?.loginName || t('notLoggedIn')}
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

