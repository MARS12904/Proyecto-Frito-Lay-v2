import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'

export default async function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg shadow-lg border border-border p-8">
          <h1 className="text-3xl font-bold text-text mb-2">Registro de Administrador</h1>
          <p className="text-text-secondary mb-6">Crea una cuenta de administrador</p>
          <RegisterForm />
          <p className="mt-4 text-sm text-text-secondary text-center">
            ¿Ya tienes una cuenta?
            {' '}
            <Link href="/login" className="text-primary hover:text-primary-dark">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}


