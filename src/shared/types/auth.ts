// ============================================
// AUTH TYPES - Single Source of Truth
// ============================================

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;        // ✅ Used internally
    full_name: string;
    role: 'admin' | 'staff' | 'viewer' | 'collector';
    is_active: 0 | 1;             // ✅ Matches SQLite
    failed_login_attempts: number;
    locked_until: string | null;
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export interface SafeUser {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: 'admin' | 'staff' | 'viewer' | 'collector';
    is_active: boolean;           
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    error?: string;
    user?: SafeUser;             
    locked_until?: string;
    // ✅ Add rate limiting fields
    rateLimited?: boolean;
    remainingAttempts?: number;
    warning?: string;
}