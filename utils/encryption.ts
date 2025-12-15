// Basic Encryption Utility using Web Crypto API
// Used for securing sensitive data in backups (like API Keys)

const STATIC_SECRET = "BusinessManager_Static_Secret_V1";

const getDerivationKey = async () => {
    const encoder = new TextEncoder();
    return window.crypto.subtle.importKey(
        "raw",
        encoder.encode(STATIC_SECRET),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
};

const getEncryptionKey = async (salt: Uint8Array) => {
    const keyMaterial = await getDerivationKey();
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

export const encryptData = async (text: string): Promise<{ ciphertext: string, salt: string, iv: string }> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Cast salt to any or ensure it matches BufferSource for deriveKey
    const key = await getEncryptionKey(salt);
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    // Convert buffers to base64 strings for storage
    return {
        ciphertext: arrayBufferToBase64(encrypted),
        salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
        iv: arrayBufferToBase64(iv.buffer as ArrayBuffer)
    };
};

export const decryptData = async (encrypted: { ciphertext: string, salt: string, iv: string }): Promise<string | null> => {
    try {
        const saltBuffer = base64ToArrayBuffer(encrypted.salt);
        const ivBuffer = base64ToArrayBuffer(encrypted.iv);
        const ciphertextBuffer = base64ToArrayBuffer(encrypted.ciphertext);

        const salt = new Uint8Array(saltBuffer);
        const iv = new Uint8Array(ivBuffer);

        const key = await getEncryptionKey(salt);
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            ciphertextBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (e) {
        console.error("Decryption failed:", e);
        return null;
    }
};

// --- Helpers ---

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};
