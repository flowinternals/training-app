'use client';

import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast, Toast } from '@/contexts/ToastContext';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
};

const iconColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { removeToast } = useToast();
  const Icon = icons[toast.type];

  return (
    <div
      className={`
        relative flex items-start p-4 rounded-lg border shadow-lg
        transform transition-all duration-300 ease-in-out
        hover:scale-105 hover:shadow-xl
        ${colors[toast.type]}
      `}
    >
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconColors[toast.type]}`} />
      </div>
      
      <div className="ml-3 flex-1">
        <h4 className="text-sm font-medium">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">
            {toast.message}
          </p>
        )}
      </div>
      
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}