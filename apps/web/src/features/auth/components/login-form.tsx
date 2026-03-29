'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock } from 'lucide-react';
import { useLogin } from '../api/use-auth';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push('/dashboard');
      },
      onError: (error: any) => {
        const message =
          error.response?.data?.message || 'Error al iniciar sesión';
        setServerError(message);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
          {serverError}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-white/80">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            id="email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            className="flex h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 pl-10 text-sm text-white placeholder:text-white/30 ring-offset-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/25 focus:border-white/30 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm"
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-300 animate-in fade-in duration-150">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-white/80">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            id="password"
            type="password"
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            className="flex h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 pl-10 text-sm text-white placeholder:text-white/30 ring-offset-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/25 focus:border-white/30 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm"
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-300 animate-in fade-in duration-150">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || loginMutation.isPending}
        className="w-full h-11 rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {loginMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Ingresando...
          </>
        ) : (
          'Ingresar'
        )}
      </button>
    </form>
  );
}
