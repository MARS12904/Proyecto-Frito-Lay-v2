import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg shadow-lg border border-border p-8">
          <h1 className="text-3xl font-bold text-text mb-2">Dashboard Admin</h1>
          <p className="text-text-secondary mb-6">Inicia sesión para continuar</p>
          <LoginForm />
          <p className="mt-4 text-sm text-text-secondary text-center">
            ¿Necesitas crear un administrador?
            {' '}
            <Link href="/register" className="text-primary hover:text-primary-dark">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}



