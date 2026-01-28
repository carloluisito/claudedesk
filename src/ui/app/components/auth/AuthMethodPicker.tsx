/**
 * AuthMethodPicker - Chip-style selection for token vs PIN auth
 */

import { Key, Hash, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Surface } from '../../design-system/primitives/Surface';
import { VStack, HStack } from '../../design-system/primitives/Stack';

type AuthMethod = 'token' | 'pin';

interface AuthMethodPickerProps {
  selectedMethod: AuthMethod;
  onSelectMethod: (method: AuthMethod) => void;
}

interface MethodOption {
  id: AuthMethod;
  icon: React.ReactNode;
  title: string;
  description: string;
  hint: string;
}

const methods: MethodOption[] = [
  {
    id: 'token',
    icon: <Key className="h-5 w-5" />,
    title: 'Access Token',
    description: 'Enter the token shown in your terminal',
    hint: 'Recommended for desktop browsers',
  },
  {
    id: 'pin',
    icon: <Hash className="h-5 w-5" />,
    title: 'Pairing PIN',
    description: 'Enter the 6-digit PIN from settings',
    hint: 'Quick pairing for mobile devices',
  },
];

export function AuthMethodPicker({ selectedMethod, onSelectMethod }: AuthMethodPickerProps) {
  return (
    <VStack gap={4} className="w-full">
      {/* Method cards */}
      <VStack gap={3}>
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelectMethod(method.id)}
            className={cn(
              'w-full rounded-xl border p-4 text-left transition-all',
              'hover:border-blue-300 dark:hover:border-blue-700',
              selectedMethod === method.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40'
            )}
          >
            <HStack gap={3} align="start">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  selectedMethod === method.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                )}
              >
                {method.icon}
              </div>
              <div className="flex-1 min-w-0">
                <HStack justify="between" align="center">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{method.title}</span>
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 transition-opacity',
                      selectedMethod === method.id ? 'opacity-100 text-blue-500' : 'opacity-0'
                    )}
                  />
                </HStack>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{method.description}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{method.hint}</p>
              </div>
            </HStack>
          </button>
        ))}
      </VStack>

      {/* Help text */}
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-600">
        Not sure which to use?{' '}
        <span className="text-blue-500 dark:text-blue-400">Token</span> is more secure,{' '}
        <span className="text-blue-500 dark:text-blue-400">PIN</span> is faster on mobile.
      </p>
    </VStack>
  );
}

export type { AuthMethodPickerProps, AuthMethod };
