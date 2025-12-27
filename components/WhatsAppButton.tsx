import React from 'react';
import WhatsAppIcon from './WhatsAppIcon';
import Button from './Button';

interface WhatsAppButtonProps {
    mobile?: string;
    message: string;
    context?: 'invoice' | 'reminder' | 'generic';
    className?: string;
    label?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
    mobile,
    message,
    context = 'generic',
    className = '',
    label = 'Share Details',
    variant = 'secondary',
    size = 'sm'
}) => {

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Clean number: remove non-digits
        const cleanNumber = mobile ? mobile.replace(/\D/g, '') : '';

        // Default to India (91) if 10 digits
        const finalNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

        const encodedMessage = encodeURIComponent(message.trim());

        // Use wa.me link
        // If number is present -> Direct chat
        // If number is missing -> specific error or share intent (not supported by wa.me web without number usually, but api.whatsapp.com/send?text=... works on mobile to pick contact)

        let url = '';
        if (finalNumber) {
            url = `https://wa.me/${finalNumber}?text=${encodedMessage}`;
        } else {
            // "Click to Chat" without phone number only works well on mobile intents sometimes to pick a contact, 
            // but for web it's tricky.
            // Fallback: If no number, we try the generic send link which might prompt to open app
            url = `https://wa.me/?text=${encodedMessage}`;
        }

        window.open(url, '_blank');
    };

    return (
        <Button
            onClick={handleShare}
            variant={variant}
            className={`bg-[#25D366] hover:bg-[#128C7E] text-white border-none ${className}`}
            title="Share on WhatsApp"
        >
            <WhatsAppIcon size={16} className="mr-2" />
            {label}
        </Button>
    );
};

export default WhatsAppButton;
