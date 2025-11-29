
import React, { useState, useEffect, useRef } from 'react';
import { loadMapsApi } from '../utils/mapsLoader';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, placeholder = "Enter address", className }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any | null>(null);
    const [isMapsLoaded, setIsMapsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        loadMapsApi()
            .then(() => {
                if (active) setIsMapsLoaded(true);
            })
            .catch((err) => {
                console.warn("Maps Autocomplete disabled:", err.message);
                // Fallback to standard input silently
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (isMapsLoaded && inputRef.current && !autocompleteRef.current) {
            try {
                // Access google from window object since types are not available
                const google = (window as any).google;
                
                if (google && google.maps && google.maps.places) {
                    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                        types: ['geocode'], // or 'establishment' for businesses
                        componentRestrictions: { country: 'in' }, // Default to India, can be made prop
                        fields: ['formatted_address', 'address_components']
                    });

                    autocompleteRef.current.addListener('place_changed', () => {
                        const place = autocompleteRef.current?.getPlace();
                        if (place && place.formatted_address) {
                            onChange(place.formatted_address);
                        } else if (inputRef.current) {
                            // If user hit enter without selecting suggestion, use text
                            onChange(inputRef.current.value);
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to init autocomplete", e);
            }
        }
    }, [isMapsLoaded, onChange]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={className}
                autoComplete="off" // Disable browser native autocomplete to prevent clash
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            </div>
        </div>
    );
};

export default AddressAutocomplete;
