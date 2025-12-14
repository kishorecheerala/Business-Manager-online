import React, { useState, useEffect, forwardRef, useRef } from 'react';
import Input from './Input';

interface FormattedNumberInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
    value: number | string | undefined;
    onChange: (e: { target: { value: string } }) => void; // Mimic event structure for compatibility
}

const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(({ value, onChange, onBlur, onFocus, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    // Sync display value with props when not focused
    useEffect(() => {
        if (!isFocused) {
            if (value === undefined || value === '' || value === null) {
                setDisplayValue('');
            } else {
                setDisplayValue(formatEnIn(value));
            }
        }
    }, [value, isFocused]);

    const formatEnIn = (val: number | string): string => {
        if (!val && val !== 0) return '';
        const num = Number(val);
        if (isNaN(num)) return String(val);
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        // Show raw value on focus
        if (value === undefined || value === 0 || value === '0') {
            setDisplayValue(''); // Clearing 0 on focus for easier typing? Or keep 0? User said "4,000 showing up instead just 4000".
            // Usually keeping 0 is better if it's significant, but clearing makes it easier to type.
            // Let's stick to raw string.
            const valStr = String(value);
            setDisplayValue(valStr === '0' ? '' : valStr);
        } else {
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
            type={isFocused ? "number" : "text"} // Switch to number on focus for mobile keyboard, text otherwise for commas
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
