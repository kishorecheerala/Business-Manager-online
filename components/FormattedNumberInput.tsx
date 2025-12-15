import React, { useState, useEffect, forwardRef } from 'react';
import Input from './Input';

interface FormattedNumberInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
    value: number | string | undefined;
    onChange: (e: { target: { value: string } }) => void; // Mimic event structure for compatibility
}

// Helper outside to be available during initialization
const formatEnIn = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num === 0 && val !== 0 && val !== '0') return ''; // Handle implicit empty/NaN resulting in 0
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
};

const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(({ value, onChange, onBlur, onFocus, ...props }, ref) => {
    // Initialize with formatted value so it's present on first render/autofocus
    const [displayValue, setDisplayValue] = useState<string>(() => formatEnIn(value));
    const [isFocused, setIsFocused] = useState(false);

    // Sync display value with props when not focused
    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatEnIn(value));
        }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        // Show raw value on focus, do not clear it even if it is 0 or undefined, 
        // rely on the input's native handling or just show empty string only if null/undefined/empty string.
        if (value === undefined || value === null) {
            setDisplayValue('');
        } else {
            // Simply convert to string. If it's "0", it shows "0". 
            // This prevents the "blank" issue effectively.
            setDisplayValue(String(value));
        }

        if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        // Format on blur is handled by useEffect
        if (onBlur) onBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        // Allow only legitimate number characters (digits, one decimal point)
        if (/^\d*\.?\d*$/.test(raw)) {
            setDisplayValue(raw);
            onChange({ target: { value: raw } });
        }
    };

    return (
        <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
        />
    );
});

FormattedNumberInput.displayName = 'FormattedNumberInput';

export default FormattedNumberInput;
