
import React from 'react';

// Simplified to be a basic input wrapper since Maps API is removed.
// Kept component structure to minimize changes in consuming files if reverted later.

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, placeholder = "Enter address", className }) => {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className}
            autoComplete="off"
        />
    );
};

export default AddressAutocomplete;
