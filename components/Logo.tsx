"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "icon" | "text"
  className?: string
  animated?: boolean
}

export function Logo({ 
  size = "md", 
  variant = "icon", 
  className = "",
  animated = false 
}: LogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('nav')

  useEffect(() => {
    setMounted(true)
  }, [])

  const sizeMap = {
    sm: { icon: 32, full: 120, height: 48 },
    md: { icon: 48, full: 180, height: 64 },
    lg: { icon: 64, full: 240, height: 80 },
    xl: { icon: 96, full: 320, height: 120 }
  }

  const dimensions = sizeMap[size]
  
  // 在服务端渲染或主题未加载时，使用默认浅色logo
  const logoSrc = mounted && (theme === "dark" || resolvedTheme === "dark")
    ? "/logo-dark.svg"
    : "/logo.svg"

  const iconSrc = "/1.jpg"
  const textSrc = "/logo-text.svg"

  if (variant === "icon") {
    return (
      <div className={`relative ${animated ? 'group' : ''} ${className}`}>
        {animated && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
        )}
        <div className={`relative ${animated ? 'group-hover:scale-110 transition-transform duration-300' : ''}`}>
          <Image
            src={iconSrc}
            alt={`${t('platformTitle')} Logo`}
            width={dimensions.icon}
            height={dimensions.icon}
            priority
            className="drop-shadow-lg"
          />
        </div>
      </div>
    )
  }

  if (variant === "text") {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={textSrc}
          alt={t('platformTitle')}
          width={dimensions.full}
          height={dimensions.height}
          priority
          className="drop-shadow-lg"
        />
      </div>
    )
  }

  // variant === "full"
  return (
    <div className={`relative ${animated ? 'group' : ''} ${className}`}>
      {animated && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
      )}
      <div className={`relative ${animated ? 'group-hover:scale-105 transition-transform duration-300' : ''}`}>
        <Image
          src={logoSrc}
          alt={`${t('platformTitle')} Logo`}
          width={dimensions.icon}
          height={dimensions.icon}
          priority
          className="drop-shadow-2xl"
        />
      </div>
    </div>
  )
}

// 简化的Logo组件用于登录页面
export function LoginLogo({ className = "" }: { className?: string }) {
  const t = useTranslations('nav')
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/3.jpg"
        alt={t('platformTitle')}
        width={64}
        height={64}
        priority
        className="drop-shadow-lg rounded-full"
      />
    </div>
  )
}

// 注册页面Logo
export function RegisterLogo({ className = "" }: { className?: string }) {
  const t = useTranslations('nav')
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/3.jpg"
        alt={t('platformTitle')}
        width={64}
        height={64}
        priority
        className="drop-shadow-lg rounded-full"
      />
    </div>
  )
}

