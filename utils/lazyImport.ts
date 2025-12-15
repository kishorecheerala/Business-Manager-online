import React from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page
 * if the chunk fails to load (e.g., due to a new deployment).
 * 
 * Usage:
 * const MyComponent = lazyImport(() => import('./MyComponent'));
 */
export const lazyImport = <T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
    return React.lazy(async () => {
        try {
            return await factory();
        } catch (error: any) {
            console.error("Chunk load failed:", error);

            // Check if it's a dynamic import error
            const isChunkError =
                error?.name === 'ChunkLoadError' ||
                error?.message?.includes('dynamically imported module') ||
                error?.message?.includes('Importing a module script failed');

            if (isChunkError) {
                // Check if we've already tried reloading
                const storageKey = `retry-lazy-${window.location.href}`;
                const hasRetried = sessionStorage.getItem(storageKey);

                if (!hasRetried) {
                    console.log("Reloading page to recover from stale chunk...");
                    sessionStorage.setItem(storageKey, 'true');

                    // Force a fresh reload by appending/updating a timestamp
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', Date.now().toString());
                    window.location.href = url.toString();

                    // Return a never-resolving promise to wait for reload
                    return new Promise(() => { });
                }
            }

            // If strictly not a chunk error or we already reloaded, throw it
            throw error;
        }
    });
};
