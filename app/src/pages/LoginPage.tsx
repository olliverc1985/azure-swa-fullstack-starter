import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { appConfig } from '@/config/app.config'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, loginAsDemo, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/50 overflow-x-hidden">
      {/* Background pattern - subtle spotlight effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-slate-200/25 blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-blue-100/30 blur-3xl animate-pulse-soft" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-slate-200/20 blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center animate-slide-down">
          <img 
            src={appConfig.logo.path}
            alt={appConfig.logo.alt}
            className="mx-auto mb-4 h-32 w-auto object-contain drop-shadow-xl"
          />
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">{appConfig.name}</h1>
          <p className="mt-2 text-gray-600">{appConfig.tagline}</p>
        </div>

        <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl animate-slide-up">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Input
                type="email"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </form>

            {/* ⚠️ DEMO_MODE - REMOVE BEFORE PRODUCTION ⚠️ */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3">
                <p className="text-xs text-amber-800 font-medium">⚠️ Demo Mode</p>
                <p className="text-xs text-amber-700 mt-1">
                  Explore the template without database setup. Remove this before deploying to production.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  loginAsDemo()
                  navigate('/dashboard')
                }}
              >
                Enter Demo Mode
              </Button>
            </div>
            {/* END DEMO_MODE */}
          </CardContent>
        </Card>

        {appConfig.owner.showInFooter && (appConfig.owner.name || appConfig.owner.company) && (
          <p className="mt-6 text-center text-sm text-gray-500">
            {appConfig.owner.name}{appConfig.owner.name && appConfig.owner.company ? ' trading as ' : ''}{appConfig.owner.company}
          </p>
        )}
      </div>
    </div>
  )
}

