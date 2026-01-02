
/**
 * Security Module
 * Enforces application integrity by verifying developer signature.
 * WARNING: Removal or modification of this file may cause the application to stop working.
 */

// Encoded Developer Information (Base64)
// Content: {"name":"Kishore Cheerala","role":"Developer","contact":"cheeralakishore@gmail.com"}
const DEV_SIGNATURE = "eyJuYW1lIjoiS2lzaG9yZSBDaGVlcmFsYSIsInJvbGUiOiJEZXZlbG9wZXIiLCJjb250YWN0IjoiY2hlZXJhbGFraXNob3JlQGdtYWlsLmNvbSJ9";

export interface DeveloperInfo {
    name: string;
    role: string;
    contact: string;
}

export const getDeveloperInfo = (): DeveloperInfo | null => {
    try {
        const decoded = atob(DEV_SIGNATURE);
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
};

export const verifyIntegrity = (): boolean => {
    try {
        // 1. Check if signature exists
        if (!DEV_SIGNATURE) return false;

        // 2. Decode and verify structure
        const info = getDeveloperInfo();
        if (!info || !info.name || !info.role) return false;

        // 3. Verify specific signature match (Anti-tamper)
        // This ensures that even if someone replaces the string with valid JSON, it must match OUR signature.
        // For now, we just ensure it decodes to the expected name to prevent generic bypassing.
        if (info.name !== "Kishore Cheerala") return false;

        return true;
    } catch (e) {
        return false;
    }
};
