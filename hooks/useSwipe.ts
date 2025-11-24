
import { useEffect, useRef } from 'react';

interface SwipeInput {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight }: SwipeInput) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const distanceX = touchStartX.current - touchEndX;
      const distanceY = touchStartY.current - touchEndY;

      const absX = Math.abs(distanceX);
      const absY = Math.abs(distanceY);
      
      // Minimum swipe distance (px)
      const minSwipeDistance = 60;

      // 1. Must be long enough
      // 2. Must be dominantly horizontal (X > 2*Y) to avoid triggering on diagonal scrolls
      if (absX > minSwipeDistance && absX > 2 * absY) {
        if (distanceX > 0) {
          // Swiped Left (Right motion)
          if (onSwipeLeft) onSwipeLeft();
        } else {
          // Swiped Right (Left motion - Back)
          if (onSwipeRight) onSwipeRight();
        }
      }

      // Reset
      touchStartX.current = null;
      touchStartY.current = null;
    };

    // Attach globally to document to catch all swipes
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight]); // Re-bind if handlers change
};
