/**
 * Safe conversion to number.
 * Returns the fallback (default 0) if the value is NaN, infinite, or cannot be converted.
 */
export function safeNumber(value: any, fallback: number = 0): number {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
        return fallback;
    }
    return num;
}

/**
 * Safe division.
 * Returns the fallback (default 0) if the denominator is 0 (or falsy effectively) to avoid Infinity/NaN.
 * Note: checks if denominator is exactly 0.
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
    const num = safeNumber(numerator);
    const den = safeNumber(denominator);
    if (den === 0) {
        return fallback;
    }
    return num / den;
}

/**
 * Safe percentage calculation.
 * Returns (part / total) * 100.
 * Handles division by zero.
 */
export function safePercentage(part: number, total: number, fallback: number = 0): number {
    return safeDivide(part * 100, total, fallback);
}
