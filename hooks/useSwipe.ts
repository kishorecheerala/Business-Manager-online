import { useEffect, useRef } from 'react';

interface SwipeInput {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight }: SwipeInput) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  
  // Store handlers in a ref. This allows us to bind the event listeners ONLY ONCE
  // but still execute the *latest* version of the callback functions (with current state).
  const handlersRef = useRef({ onSwipeLeft, onSwipeRight });

  // Update the ref on every render so it always has the freshest closures
  useEffect(() => {
    handlersRef.current = { onSwipeLeft, onSwipeRight };
  });

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Ensure we only track single-finger swipes to avoid conflict with pinch-zoom etc.
      if (e.touches.length !== 1) return;
      
      // Use screen coordinates to avoid issues with scrolling affecting calculation
      touchStartX.current = e.touches[0].screenX;
      touchStartY.current = e.touches[0].screenY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;

      const distanceX = touchStartX.current - touchEndX;
      const distanceY = touchStartY.current - touchEndY;

      const absX = Math.abs(distanceX);
      const absY = Math.abs(distanceY);
      
      const minSwipeDistance = 50; // 50px threshold
      const slope = 1.2; // Allow slightly diagonal swipes (X must be > 1.2 * Y)

      // 1. Must be long enough
      // 2. Must be dominantly horizontal
      if (absX > minSwipeDistance && absX > absY * slope) {
        if (distanceX > 0) {
          // Swiped Left (Finger moved Right to Left)
          if (handlersRef.current.onSwipeLeft) handlersRef.current.onSwipeLeft();
        } else {
          // Swiped Right (Finger moved Left to Right)
          if (handlersRef.current.onSwipeRight) handlersRef.current.onSwipeRight();
        }
      }

      // Reset
      touchStartX.current = null;
      touchStartY.current = null;
    };

    const onTouchCancel = () => {
        touchStartX.current = null;
        touchStartY.current = null;
    };

    // Attach listeners globally to window with passive: true for performance
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, []); // Empty dependency array ensures listeners are bound only once
};