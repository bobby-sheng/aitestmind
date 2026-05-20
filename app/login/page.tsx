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
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    loginName: "",
    password: "",
  })

  // 确保登录页面默认显示中文
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const hasLocaleCookie = cookies.some(cookie => cookie.trim().startsWith('locale='))
    
    // 如果没有语言 cookie 且当前不是中文，则设置为中文并刷新
    if (!hasLocaleCookie && locale !== 'zh') {
      document.cookie = `locale=zh; path=/; max-age=31536000; SameSite=Lax`
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
        body: JSON.stringify({ loginName: formData.loginName, password: formData.password }),
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
        description: `${t('welcomeBack')}，${data.user.username || data.user.loginName}！`,
      })

      // 跳转到仪表盘页面
      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('loginFailed'),
        description: error.message || t('loginNameRequired'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 via-cyan-950 to-indigo-950">
      {/* 动态背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* 发光球体动画 - 蓝色系渐变效果 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/40 via-cyan-500/40 to-teal-500/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-indigo-500/40 via-blue-500/40 to-cyan-500/40 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500" />
      
      {/* 语言切换按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="bg-background/50 backdrop-blur-md border-blue-500/30 hover:bg-background/70 hover:border-cyan-500/40 transition-all"
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
              <Image
                src="/3.jpg"
                alt={tNav('platformTitle')}
                width={56}
                height={56}
                priority
                className="drop-shadow-2xl"
              />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                {tNav('platformTitle')}
              </h1>
              <p className="text-sm text-muted-foreground">AI-Powered API Test Platform</p>
            </div>
          </div>

          {/* 主标题 */}
          <h2 className={`${locale === 'en' ? 'text-3xl xl:text-4xl' : 'text-4xl xl:text-5xl'} font-bold text-white mb-6 leading-tight`}>
            {t('platformTitle')}
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
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
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all">
                <Sparkles className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <h3 className={`${locale === 'en' ? 'text-sm' : 'text-base'} font-semibold text-white mb-1`}>{t('feature2Title')}</h3>
                <p className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 leading-relaxed`}>
                  {t('feature2Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-all">
                <svg className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-teal-500/30 transition-all">
                <svg className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  10+
                </div>
                <div className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>{t('stat1')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  99%
                </div>
                <div className={`${locale === 'en' ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>{t('stat2')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
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
        <Card className="w-full max-w-md relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/95 via-blue-50/90 to-cyan-50/95 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-blue-500/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/5 before:via-cyan-500/5 before:to-indigo-500/5 before:pointer-events-none">
          {/* 装饰性渐变光效 */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/30 to-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-indigo-400/30 to-blue-400/20 rounded-full blur-3xl" />
          
        <CardHeader className="space-y-1 pb-6 relative z-10">
          <div className="flex items-center justify-center mb-4">
            <LoginLogo />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            {t('loginTitle')}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {t('loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="loginName" className="text-sm font-medium">
                {t('loginName')}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-400 transition-colors" />
                <Input
                  id="loginName"
                  type="text"
                  placeholder={t('loginNamePlaceholder')}
                  value={formData.loginName}
                  onChange={(e) =>
                    setFormData({ ...formData, loginName: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="pl-10 h-11 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-blue-500/40 dark:border-blue-400/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('password')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-cyan-400 transition-colors" />
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
                  className="pl-10 h-11 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-cyan-500/40 dark:border-cyan-400/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 dark:focus:ring-cyan-500/30 transition-all shadow-sm"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-700 hover:via-cyan-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-[1.02]" 
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
              className="text-blue-400 hover:text-cyan-400 font-medium transition-colors hover:underline bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text hover:text-transparent"
            >
              {t('registerNow')}
            </Link>
          </div>
          
          {/* 默认账号提示 */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/15 via-cyan-500/15 to-indigo-500/15 border border-blue-500/40 backdrop-blur-sm shadow-inner">
            <p className="text-xs text-center text-muted-foreground">
              💡 {t('defaultAccount')}: <span className="text-blue-400 font-mono">admin</span> / 
              <span className="text-cyan-400 font-mono">admin123</span>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

