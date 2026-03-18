'use client';

import { useForm } from 'react-hook-form';
import Input from './Input';
import Button from './Button';

interface TransferFormData {
  recipient_email: string;
  message: string;
  expiration: string;
}

interface TransferFormProps {
  onSubmit: (data: TransferFormData) => void;
  isSubmitting: boolean;
  hasFiles: boolean;
}

export default function TransferForm({ onSubmit, isSubmitting, hasFiles }: TransferFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferFormData>({
    defaultValues: {
      recipient_email: '',
      message: '',
      expiration: '7d',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        id="recipient_email"
        label="E-mail du destinataire"
        type="email"
        placeholder="destinataire@exemple.com"
        error={errors.recipient_email?.message}
        {...register('recipient_email', {
          required: "L'e-mail du destinataire est requis",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Adresse e-mail invalide',
          },
        })}
      />

      <div className="w-full">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
          Message <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          id="message"
          rows={3}
          placeholder="Ajoutez un message pour le destinataire..."
          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary hover:border-gray-400 resize-none"
          {...register('message')}
        />
      </div>

      <div className="w-full">
        <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 mb-1.5">
          Expiration
        </label>
        <select
          id="expiration"
          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary hover:border-gray-400"
          {...register('expiration')}
        >
          <option value="24h">24 heures</option>
          <option value="3d">3 jours</option>
          <option value="7d">7 jours</option>
          <option value="14d">14 jours</option>
        </select>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={isSubmitting}
        disabled={!hasFiles || isSubmitting}
      >
        Envoyer
      </Button>

      {!hasFiles && (
        <p className="text-sm text-center text-gray-400">
          Ajoutez au moins un fichier pour continuer
        </p>
      )}
    </form>
  );
}
