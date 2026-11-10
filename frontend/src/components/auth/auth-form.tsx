'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { FieldErrors, validateLogin, validateRegister } from '@/lib/validation';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';
type Field = 'name' | 'email' | 'password';

export function AuthForm({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const isRegister = mode === 'register';

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const fieldErrors = isRegister
      ? validateRegister(values.name, values.email, values.password)
      : validateLogin(values.email, values.password);

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      if (isRegister) {
        await register(values.name.trim(), values.email.trim(), values.password);
      } else {
        await login(values.email.trim(), values.password);
      }
      router.replace('/chat');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: error.message });
      } else {
        setServerError(error instanceof Error ? error.message : 'No se pudo completar la solicitud');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass animate-fade-in-up w-full max-w-md rounded-3xl p-8">
      <div className="mb-8 text-center">
        <h1 className="text-gradient text-3xl font-bold tracking-tight">
          {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
        </h1>
        <p className="mt-2 text-slate-400">
          {isRegister ? 'Empieza a conversar en segundos' : 'Inicia sesión para continuar'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {isRegister && (
          <Input
            label="Nombre"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            disabled={submitting}
          />
        )}
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange('email')}
          error={errors.email}
          disabled={submitting}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={handleChange('password')}
          error={errors.password}
          disabled={submitting}
        />

        {serverError && (
          <div role="alert" className="animate-fade-in-up rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {serverError}
          </div>
        )}

        <Button type="submit" loading={submitting}>
          {submitting ? (isRegister ? 'Creando cuenta…' : 'Entrando…') : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          {isRegister ? 'Inicia sesión' : 'Regístrate'}
        </Link>
      </p>
    </div>
  );
}