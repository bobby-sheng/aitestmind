"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"

const PUBLIC_ROUTES = ['/login', '/register']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 如果是公开路由，不显示侧边栏和导航栏
  if (PUBLIC_ROUTES.includes(pathname)) {
    return (
      <AuthGuard>
        {children}
        <Toaster />
      </AuthGuard>
    )
  }
  
  // 否则显示完整布局
  return (
    <AuthGuard>
      <div className="h-screen flex">
        <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
          <Sidebar />
        </div>
        <main className="md:pl-72 flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </AuthGuard>
  )
}

