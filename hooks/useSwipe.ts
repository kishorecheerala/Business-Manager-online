
import { useEffect, useRef } from 'react';

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeOptions {
  /** Minimum distance in pixels to trigger a swipe */
  threshold?: number;
  /** 
   * Maximum X position (pixels from left) for the start of a right swipe. 
   * If 0, edge detection is disabled (swipes work from anywhere).
   * Default: 0
   */
  edgeThreshold?: number;
  /** Maximum duration in ms for the swipe to be valid */
  timeout?: number;
}

export const useSwipe = (
  { onSwipeLeft, onSwipeRight }: SwipeCallbacks,
  options: SwipeOptions = {}
) => {
  const {
    threshold = 100,
    edgeThreshold = 0,
    timeout = 500
  } = options;

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  
  // Maintain fresh references to callbacks to avoid re-binding event listeners
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });

  useEffect(() => {
    callbacksRef.current = { onSwipeLeft, onSwipeRight };
  }, [onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only track single-finger touches
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (
        touchStartX.current === null || 
        touchStartY.current === null || 
        touchStartTime.current === null
      ) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const duration = Date.now() - touchStartTime.current;
      const startX = touchStartX.current;

      // Cleanup references immediately
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;

      // 1. Velocity Check (Swipe must be fast enough)
      if (duration > timeout) return;

      // 2. Distance Check (Must move enough pixels)
      if (Math.abs(deltaX) < threshold) return;

      // 3. Angle Check (Must be horizontal)
      // Allow slight diagonal but ensure horizontal component is dominant
      if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) return;

      // 4. Direction & Edge Logic
      if (deltaX > 0) {
        // SWIPE RIGHT (Back / Exit)
        // If edgeThreshold is configured, ensure swipe started from the left edge
        if (edgeThreshold > 0 && startX > edgeThreshold) return;
        
        callbacksRef.current.onSwipeRight?.();
      } else {
        // SWIPE LEFT (Next)
        callbacksRef.current.onSwipeLeft?.();
      }
    };

    const onTouchCancel = () => {
        touchStartX.current = null;
        touchStartY.current = null;
        touchStartTime.current = null;
    };

    // Use passive listeners for better scrolling performance
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [threshold, edgeThreshold, timeout]);
};
