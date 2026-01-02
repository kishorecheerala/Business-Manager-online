import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatNumber, generateDownloadFilename } from '../../utils/formatUtils';

describe('formatUtils', () => {
    describe('formatCurrency', () => {
        it('should format numbers to INR currency', () => {
            expect(formatCurrency(1234.56)).toBe('₹1,234.56');
            expect(formatCurrency(100)).toBe('₹100'); // Implementation uses minimumFractionDigits: 0
        });

        it('should handle null/undefined/empty', () => {
            expect(formatCurrency(undefined)).toBe('₹0');
            expect(formatCurrency(null)).toBe('₹0');
            expect(formatCurrency('')).toBe('₹0');
        });
    });

    describe('formatDate', () => {
        it('should format date string correctly', () => {
            // Use a fixed date to avoid timezone issues in tests, or handle carefully
            const date = new Date('2025-12-14T00:00:00Z');
            // Assuming the util uses local time or specific locale, result might vary by system tz.
            // But the util uses 'en-GB'
            expect(formatDate('2025-12-14')).toContain('14 Dec 2025');
        });

        it('should handle invalid inputs', () => {
            expect(formatDate(null)).toBe('-');
            expect(formatDate('invalid-date')).toBe('-');
        });
    });

    describe('generateDownloadFilename', () => {
        it('should generate filename with date and prefix', () => {
            const filename = generateDownloadFilename('My Report', 'csv');
            expect(filename).toContain('My_Report_');
            expect(filename).toContain('.csv');
        });
    });
});
