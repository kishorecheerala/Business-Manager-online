import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'bottom', delay = 0.2 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;
            const gap = 8; // space between trigger and tooltip

            switch (position) {
                case 'top':
                    top = rect.top - gap;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + gap;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - gap;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + gap;
                    break;
            }
            // Add scroll offset since Portal is absolute/fixed relative to viewport usually, 
            // but if we use Fixed position on the tooltip itself, we just need viewport relative coords (rect).
            // Let's use position: fixed in CSS, so rect matches directly.
            setCoords({ top, left });
        }
    };

    const showTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        updatePosition(); // Calculate position immediately before showing
        timeoutRef.current = setTimeout(() => {
            updatePosition(); // Re-calculate in case of layout shift
            setIsVisible(true);
        }, delay * 1000);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    // Update position on scroll/resize while visible
    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    const transformOrigin = {
        top: 'bottom center',
        bottom: 'top center',
        left: 'center right',
        right: 'center left',
    };

    // Calculate translation based on alignment
    const initialTranslate = {
        top: '-50% -100%',
        bottom: '-50% 0',
        left: '-100% -50%',
        right: '0 -50%',
    };

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-flex"
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                onTouchStart={() => {
                    if (isVisible) hideTooltip();
                    else showTooltip();
                }}
            >
                {children}
            </div>
            {createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.1 }}
                            style={{
                                position: 'fixed',
                                top: coords.top,
                                left: coords.left,
                                zIndex: 99999,
                                transformOrigin: transformOrigin[position],
                                pointerEvents: 'none',
                                // We use transform to align perfectly center relative to the coordinate point
                                transform: `translate(${initialTranslate[position].split(' ')[0]}, ${initialTranslate[position].split(' ')[1]})`
                            }}
                            className="px-2 py-1.5 bg-gray-900 text-white text-[10px] sm:text-xs font-medium rounded-md shadow-xl whitespace-nowrap border border-white/10"
                        >
                            {content}
                            {/* Arrow is tricky with transforms, skipping for simplicity or implementing later if needed. 
                                A nice floating rect is standard for modern tooltips. */}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default Tooltip;
