
import { useEffect } from 'react';

type Options = {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    preventDefault?: boolean;
};

export const useHotkeys = (key: string, callback: () => void, options: Options = {}) => {
  const { ctrl = false, shift = false, alt = false, preventDefault = true } = options;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Check modifiers
      if (ctrl && !event.ctrlKey && !event.metaKey) return;
      if (shift && !event.shiftKey) return;
      if (alt && !event.altKey) return;

      if (event.key.toLowerCase() === key.toLowerCase()) {
        if (preventDefault) {
            event.preventDefault();
        }
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ctrl, shift, alt, preventDefault]);
};
