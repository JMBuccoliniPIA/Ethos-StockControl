import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Glass card */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 space-y-7">
        {/* Header */}
        <div className="text-center space-y-2">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Bienvenido
          </h2>
          <p className="text-sm text-white/50">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <LoginForm />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
        </div>

        <p className="text-center text-xs text-white/30">
          Sistema protegido. Acceso solo para usuarios autorizados.
        </p>
      </div>
    </div>
  );
}
