'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, initialize, isInitialized } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isInitialized, isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch {
      // Error is handled in the hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/selfizee-logo.svg"
            alt="Selfizee Transfer"
            width={220}
            height={50}
            className="mx-auto h-10 w-auto mb-6"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900">Bienvenue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connectez-vous pour accéder à vos transferts
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              id="email"
              label="Adresse e-mail"
              type="email"
              placeholder="votre@email.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email', {
                required: "L'adresse e-mail est requise",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Adresse e-mail invalide',
                },
              })}
            />

            <Input
              id="password"
              label="Mot de passe"
              type="password"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              })}
            />

            <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
              Se connecter
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Selfizee Transfer - Envoi de fichiers sécurisé
        </p>
      </div>
    </div>
  );
}
