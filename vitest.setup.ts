import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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
    ...actual as any,
    AnimatePresence: ({ children }: any) => children,
    motion: {
      div: require('react').forwardRef(({ children, ...props }: any, ref: any) => {
        const { initial, animate, exit, transition, ...rest } = props;
        return require('react').createElement('div', { ref, ...rest }, children);
      }),
      button: require('react').forwardRef(({ children, ...props }: any, ref: any) => {
        const { initial, animate, exit, transition, ...rest } = props;
        return require('react').createElement('button', { ref, ...rest }, children);
      }),
    },
  };
});
