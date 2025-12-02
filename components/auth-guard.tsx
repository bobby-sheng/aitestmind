"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

// 不需要登录的公开路由
const PUBLIC_ROUTES = ['/login', '/register']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // 检查是否在公开路由
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
    
    if (isPublicRoute) {
      setIsChecking(false)
      setIsAuthenticated(true)
      return
    }

    // 检查是否有 token
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      // 未登录，跳转到登录页
      setIsChecking(false)
      setIsAuthenticated(false)
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userStr)
      
      // 如果访问用户管理页面，检查是否为管理员
      if (pathname === '/users' && user.role !== 'admin') {
        setIsChecking(false)
        setIsAuthenticated(false)
        router.push('/api-capture')
        return
      }

      setIsAuthenticated(true)
      setIsChecking(false)
    } catch (e) {
      console.error('Failed to parse user:', e)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setIsChecking(false)
      setIsAuthenticated(false)
      router.push('/login')
      return
    }
  }, [pathname, router])

  // 显示加载状态
  if (isChecking) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 未认证，显示加载状态（在跳转过程中）
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 已认证，显示内容
  return <>{children}</>
}

