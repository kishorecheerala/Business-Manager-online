import { useEffect, RefObject } from 'react';

// The event type can be simplified since 'click' covers both mouse and touch taps.
type Event = MouseEvent | TouchEvent;

export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: Event) => void,
  ignoredRef?: RefObject<HTMLElement> // Optional ref to ignore (e.g. the trigger button)
) => {
  useEffect(() => {
    const listener = (event: Event) => {
      const el = ref?.current;
      const ignoredEl = ignoredRef?.current;
      
      // Do nothing if clicking ref's element, descendent elements, or the ignored ref's element
      if (
        !el || 
        el.contains(event.target as Node) || 
        (ignoredEl && ignoredEl.contains(event.target as Node))
      ) {
        return;
      }
      handler(event);
    };

    // Using mousedown is more reliable for this hook. It fires before the click event,
    // which can prevent some race conditions with other click handlers. 'touchstart' is for mobile.
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, ignoredRef]); // Reload only if ref or handler changes
};