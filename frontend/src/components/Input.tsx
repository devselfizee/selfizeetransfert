'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'block w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary',
            error
              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 bg-white hover:border-gray-400',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        ) : helpText ? (
          <p className="mt-1.5 text-xs text-gray-500">{helpText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
