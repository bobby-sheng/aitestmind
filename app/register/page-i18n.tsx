"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Loader2, Sparkles, Lock, User, Mail, UserCircle, Globe } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('auth')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    realName: "",
  })

  const toggleLocale = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh'
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: t('registerFailed'),
        description: t('passwordMismatch'),
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          realName: formData.realName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('registerFailed'))
      }

      toast({
        title: t('registerSuccess'),
        description: t('pleaseLogin'),
      })

      // 跳转到登录页
      router.push("/login")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('registerFailed'),
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4">
      {/* 动态背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f15_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* 发光球体动画 */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* 语言切换按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="bg-background/50 backdrop-blur-md border-blue-500/20 hover:bg-background/70"
        >
          <Globe className="h-4 w-4 mr-2" />
          {locale === 'zh' ? 'English' : '中文'}
        </Button>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-background/80 border-blue-500/20 shadow-2xl shadow-blue-500/20">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative h-16 w-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                <UserCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t('registerTitle')}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {t('registerDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {t('username')} <span className="text-red-400">*</span>
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t('usernameHint')}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  disabled={loading}
                  minLength={3}
                  maxLength={20}
                  className="pl-10 h-11 bg-background/50 border-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('password')} <span className="text-red-400">*</span>
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordHint')}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  minLength={6}
                  className="pl-10 h-11 bg-background/50 border-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('confirmPassword')} <span className="text-red-400">*</span>
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  minLength={6}
                  className="pl-10 h-11 bg-background/50 border-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('email')} <span className="text-muted-foreground text-xs">({t('optional')})</span>
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={loading}
                  className="pl-10 h-11 bg-background/50 border-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="realName" className="text-sm font-medium">
                {t('realName')} <span className="text-muted-foreground text-xs">({t('optional')})</span>
              </Label>
              <div className="relative group">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="realName"
                  type="text"
                  placeholder={t('realNamePlaceholder')}
                  value={formData.realName}
                  onChange={(e) =>
                    setFormData({ ...formData, realName: e.target.value })
                  }
                  disabled={loading}
                  className="pl-10 h-11 bg-background/50 border-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl shadow-blue-500/40 hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('registering')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('registerButton')}
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('hasAccount')}</span>{" "}
            <Link 
              href="/login" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
            >
              {t('loginNow')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

