import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import React from 'react';
import type { HTMLAttributes } from 'react';

afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '',
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...(actual as object),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: Object.assign(
        React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
          ({ children, ...props }, ref) => {
            const { ...rest } = props as Record<string, unknown>;
            return React.createElement('div', { ref, ...rest }, children);
          }
        ),
        { displayName: 'MotionDiv' }
      ),
      button: Object.assign(
        React.forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
          ({ children, ...props }, ref) => {
            const { ...rest } = props as Record<string, unknown>;
            return React.createElement('button', { ref, ...rest }, children);
          }
        ),
        { displayName: 'MotionButton' }
      ),
    },
  };
});
