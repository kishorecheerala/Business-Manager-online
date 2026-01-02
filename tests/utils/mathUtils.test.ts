import { describe, it, expect } from 'vitest';
import { safeNumber, safeDivide, safePercentage } from '../../utils/mathUtils';

describe('mathUtils', () => {
    describe('safeNumber', () => {
        it('should return number for valid numeric input', () => {
            expect(safeNumber(10)).toBe(10);
            expect(safeNumber('10')).toBe(10);
            expect(safeNumber(10.5)).toBe(10.5);
        });

        it('should return fallback (0) for NaN, null, undefined', () => {
            expect(safeNumber(NaN)).toBe(0);
            expect(safeNumber(null)).toBe(0);
            expect(safeNumber(undefined)).toBe(0);
            expect(safeNumber('abc')).toBe(0);
        });

        it('should return custom fallback', () => {
            expect(safeNumber(NaN, -1)).toBe(-1);
            expect(safeNumber('invalid', 100)).toBe(100);
        });

        it('should handle Infinity', () => {
            expect(safeNumber(Infinity)).toBe(0);
        });
    });

    describe('safeDivide', () => {
        it('should divide correctly', () => {
            expect(safeDivide(10, 2)).toBe(5);
        });

        it('should handle division by zero (return fallback/0)', () => {
            expect(safeDivide(10, 0)).toBe(0);
        });

        it('should return custom fallback on division by zero', () => {
            expect(safeDivide(10, 0, 100)).toBe(100);
        });

        it('should handle NaN inputs', () => {
            expect(safeDivide(NaN, 2)).toBe(0);
            expect(safeDivide(10, NaN)).toBe(0);
        });
    });

    describe('safePercentage', () => {
        it('should calculate percentage', () => {
            expect(safePercentage(50, 200)).toBe(25);
        });

        it('should handle total=0', () => {
            expect(safePercentage(50, 0)).toBe(0);
        });
    });
});
