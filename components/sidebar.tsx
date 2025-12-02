"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Database,
  GitBranch,
  Play,
  FileText,
  Settings,
  TestTube2,
  FolderKanban,
  Sparkles,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('sidebar')
  const nav = useTranslations('nav')
  
  const routes = [
    {
      labelKey: "dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      color: "text-sky-500",
    },
    {
      labelKey: "apiCapture",
      icon: TestTube2,
      href: "/api-capture",
      color: "text-green-600",
    },
    {
      labelKey: "apiRepository",
      icon: Database,
      href: "/api-repository",
      color: "text-violet-500",
    },
    {
      labelKey: "testOrchestration",
      icon: GitBranch,
      href: "/test-orchestration",
      color: "text-pink-700",
    },
    {
      labelKey: "aiGenerate",
      icon: Sparkles,
      href: "/ai-generate",
      color: "text-purple-600",
    },
    {
      labelKey: "testSuites",
      icon: FolderKanban,
      href: "/test-suites",
      color: "text-orange-700",
    },
    {
      labelKey: "execution",
      icon: Play,
      href: "/execution",
      color: "text-emerald-500",
    },
    // {
    //   labelKey: "reports",
    //   icon: FileText,
    //   href: "/reports",
    //   color: "text-blue-500",
    // },
    {
      labelKey: "settings",
      icon: Settings,
      href: "/settings",
      color: "text-gray-500",
    },
  ]

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-card border-r">
      <div className="px-3 py-2 flex-1">
        <Link href="/api-capture" className="flex items-center pl-3 mb-14 group">
          <div className="relative h-11 w-11 mr-3 flex-shrink-0">
            {/* AI TestMind Logo with hover effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-20 blur-lg transition-all duration-300" />
            <div className="relative group-hover:scale-110 transition-transform duration-300">
              <Image 
                src="/logo-icon.svg" 
                alt="AI TestMind" 
                width={44}
                height={44}
                priority
                className="drop-shadow-lg"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:from-purple-500 group-hover:via-blue-500 group-hover:to-cyan-500 transition-all">
            {nav('platformTitle')}
          </h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition-all relative",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {/* 左侧高亮条 */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}
                <div className="flex items-center flex-1">
                  <route.icon 
                    className={cn(
                      "h-5 w-5 mr-3 transition-colors",
                      isActive ? route.color : "opacity-60"
                    )} 
                  />
                  {t(route.labelKey as any)}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  )
}

