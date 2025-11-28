
export const generateWhatsAppLink = (phone: string, message: string) => {
    // Remove non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Assume India (91) if no country code, but check length
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
};

export const generateSMSLink = (phone: string, message: string) => {
    // Detect OS for separator
    const separator = navigator.userAgent.match(/iPhone|iPad|iPod/i) ? '&' : '?';
    return `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
};

export const generateEmailLink = (email: string, subject: string, body: string) => {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const sendLocalNotification = (title: string, body: string, icon?: string) => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return;
    }

    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: icon || '/vite.svg' });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
                new Notification(title, { body, icon: icon || '/vite.svg' });
            }
        });
    }
};
