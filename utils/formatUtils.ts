
/**
 * Utility functions for consistent formatting across the application.
 * Standard:
 * - Currency: en-IN (Indian Rupee), Max 2 decimals.
 * - Date: DD MMM YYYY (e.g. 14 Dec 2025).
 * - Number: en-IN (Commas), Max 2 decimals.
 */

export const formatCurrency = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || amount === '') return '₹0';
    const num = Number(amount);
    if (isNaN(num)) return '₹0';

    return num.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });
};

export const formatDate = (dateInput: string | number | Date | undefined | null): string => {
    if (!dateInput) return '-';

    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '-';

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return '-';
    }
};

export const formatNumber = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null || num === '') return '0';
    const value = Number(num);
    if (isNaN(value)) return '0';

    return value.toLocaleString('en-IN', {
        maximumFractionDigits: 2
    });
};

// Helper for inputs (YYYY-MM-DD)
export const formatInputDate = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
