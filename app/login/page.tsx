"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Loader2, Sparkles, Lock, User, Globe } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { LoginLogo } from "@/components/Logo"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('auth')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  // 确保登录页面默认显示英文
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const hasLocaleCookie = cookies.some(cookie => cookie.trim().startsWith('locale='))
    
    // 如果没有语言 cookie 且当前不是英文，则设置为英文并刷新
    if (!hasLocaleCookie && locale !== 'en') {
      document.cookie = `locale=en; path=/; max-age=31536000; SameSite=Lax`
      window.location.reload()
    }
  }, [])

  const toggleLocale = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh'
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('loginFailed'))
      }

      // 保存 token 到 localStorage
      if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
      }

      toast({
        title: t('loginSuccess'),
        description: `${t('welcomeBack')}，${data.user.username}！`,
      })

      // 跳转到 API 采集页
      router.push("/api-capture")
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('loginFailed'),
        description: error.message || t('usernameRequired'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* 动态背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f15_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* 发光球体动画 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* 语言切换按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="bg-background/50 backdrop-blur-md border-purple-500/20 hover:bg-background/70"
        >
          <Globe className="h-4 w-4 mr-2" />
          {locale === 'zh' ? 'English' : '中文'}
        </Button>
      </div>

      {/* 左侧：平台介绍 */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center p-12 xl:p-16">
        <div className="max-w-xl">
          {/* Logo 和品牌 */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative">
                <Image
                  src="/logo-icon.svg"
                  alt="AI TestMind"
                  width={56}
                  height={56}
                  priority
                  className="drop-shadow-2xl"
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                AI TestMind
              </h1>
              <p className="text-sm text-muted-foreground">AI-Powered API Test Platform</p>
            </div>
          </div>

          {/* 主标题 */}
          <h2 className={`${locale === 'en' ? 'text-3xl xl:text-4xl' : 'text-4xl xl:text-5xl'} font-bold text-white mb-6 leading-tight`}>
            {t('platformTitle')}
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              {t('platformSubtitle')}
            </span>
          </h2>

          <p className={`${locale === 'en' ? 'text-base' : 'text-lg'} text-gray-300 mb-12`}>
            {t('platformDescription')}
          </p>

          {/* 核心特性 */}
          <div className="space-y-5">
            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-11 h-11 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-all">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div>
                <h3 className={`${locale === 'en' ? 'text-sm' : 'text-base'} font-semibold text-white mb-1`}>{t('feature1Title')}</h3>
                <p className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 leading-relaxed`}>
                  {t('feature1Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-11 h-11 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className={`${locale === 'en' ? 'text-sm' : 'text-base'} font-semibold text-white mb-1`}>{t('feature2Title')}</h3>
                <p className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 leading-relaxed`}>
                  {t('feature2Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-11 h-11 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h3 className={`${locale === 'en' ? 'text-sm' : 'text-base'} font-semibold text-white mb-1`}>{t('feature3Title')}</h3>
                <p className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 leading-relaxed`}>
                  {t('feature3Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-11 h-11 bg-pink-500/10 border border-pink-500/20 rounded-lg flex items-center justify-center group-hover:bg-pink-500/20 transition-all">
                <svg className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className={`${locale === 'en' ? 'text-sm' : 'text-base'} font-semibold text-white mb-1`}>{t('feature4Title')}</h3>
                <p className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 leading-relaxed`}>
                  {t('feature4Desc')}
                </p>
              </div>
            </div>
          </div>

          {/* 底部统计 */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  10+
                </div>
                <div className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>{t('stat1')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  99%
                </div>
                <div className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>{t('stat2')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  5x
                </div>
                <div className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>{t('stat3')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <Card className="w-full max-w-md backdrop-blur-xl bg-background/80 border-purple-500/20 shadow-2xl shadow-purple-500/20">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center justify-center mb-4">
            <LoginLogo />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t('loginTitle')}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {t('loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {t('username')}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t('usernamePlaceholder')}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="pl-10 h-11 bg-background/50 border-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('password')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="pl-10 h-11 bg-background/50 border-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loggingIn')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('loginButton')}
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('noAccount')}</span>{" "}
            <Link 
              href="/register" 
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors hover:underline"
            >
              {t('registerNow')}
            </Link>
          </div>
          
          {/* 默认账号提示 */}
          <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-center text-muted-foreground">
              💡 {t('defaultAccount')}: <span className="text-purple-400 font-mono">admin</span> / 
              <span className="text-purple-400 font-mono">admin123</span>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

