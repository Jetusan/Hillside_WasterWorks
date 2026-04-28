import bcrypt from 'bcryptjs';
import { getUserRepository } from '../database';
import type { LoginCredentials, AuthResponse } from '../../shared/types/auth';
import { loginRateLimiter } from '../utils/rateLimiter';
import { UserRepository } from '../database/repositories/userRepository';

export class AuthService {
    
    private currentUser: AuthResponse['user'] | null = null;

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        console.log(`🔐 Login attempt: ${credentials.username}`);
        
        try {
            // ✅ STEP 1: Check rate limiter first (before anything else)
            const rateLimitKey = `login:${credentials.username.toLowerCase()}`;
            console.log(`🛡️ [DEBUG] Checking rate limit for key: ${rateLimitKey}`);
            const rateLimitCheck = loginRateLimiter.checkRateLimit(rateLimitKey);
            
            console.log(`📊 [DEBUG] Rate limit result:`, JSON.stringify({
                allowed: rateLimitCheck.allowed,
                remainingAttempts: rateLimitCheck.remainingAttempts,
                resetTime: rateLimitCheck.resetTime,
                message: rateLimitCheck.message
            }, null, 2));

            if (!rateLimitCheck.allowed) {
                console.log(`⛔ Rate limited: ${credentials.username}`);
                return { 
                    success: false, 
                    error: rateLimitCheck.message || 'Too many attempts. Please try again later.',
                    rateLimited: true,
                    remainingAttempts: 0
                };
            }

            console.log(`✅ [DEBUG] Rate limit check passed`);
            
            const userRepo = getUserRepository();
            const user = userRepo.findByUsernameOrEmail(credentials.username);
            
            if (!user) {
                // ✅ Don't reveal if username exists or not for security
                console.log(`❌ User not found: ${credentials.username}`);
                return { 
                    success: false, 
                    error: 'Invalid credentials',
                    remainingAttempts: rateLimitCheck.remainingAttempts,
                    warning: rateLimitCheck.message
                };
            }
            
            if (!user.is_active) {
                return { 
                    success: false, 
                    error: 'Account is deactivated',
                    remainingAttempts: rateLimitCheck.remainingAttempts
                };
            }
            
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
                return { 
                    success: false, 
                    error: `Account locked. Try again in ${minutesLeft} minute(s) or contact administrator.`,
                    locked_until: user.locked_until,
                    remainingAttempts: 0
                };
            }
            
            // Check password with bcrypt
            const validPassword = await bcrypt.compare(credentials.password, user.password_hash);
            
            if (!validPassword) {
                // ✅ Track failed attempts in database
                userRepo.incrementFailedAttempts(user.id);
                const updatedUser = userRepo.findByUsernameOrEmail(credentials.username);
                
                // ✅ Auto-lock account after 5 failed attempts (database level)
                if (updatedUser && updatedUser.failed_login_attempts >= 5) {
                    userRepo.lockAccount(user.id, 0.5); // Lock for 15 minutes
                    console.log(`🔒 Account locked: ${credentials.username} (too many failed attempts)`);
                    
                    return { 
                        success: false, 
                        error: 'Account locked due to too many failed attempts. Try again in 30 seconds.',
                        remainingAttempts: 0
                    };
                }
                
                console.log(`❌ Invalid password: ${credentials.username} (${rateLimitCheck.remainingAttempts} attempts remaining)`);
                return { 
                    success: false, 
                    error: 'Invalid credentials',
                    remainingAttempts: rateLimitCheck.remainingAttempts,
                    warning: rateLimitCheck.message
                };
            }
            
            // ✅ Successful login - reset everything
            loginRateLimiter.resetAttempts(rateLimitKey); // Reset rate limiter
            userRepo.resetFailedAttempts(user.id); // Reset failed attempts in DB
            userRepo.updateLastLogin(user.id); // Update last login timestamp
            
            const safeUser = userRepo.findById(user.id);
            
            if (!safeUser) {
                return { success: false, error: 'User data not found' };
            }
            
            // ✅ Store the current user in session
            this.currentUser = {
                id: safeUser.id,
                username: safeUser.username,
                email: safeUser.email,
                full_name: safeUser.full_name,
                role: safeUser.role as any,
                is_active: safeUser.is_active,
                last_login: safeUser.last_login || undefined,
                created_at: safeUser.created_at,
                updated_at: safeUser.updated_at
            };
            
            console.log(`✅ Login successful: ${credentials.username}`);
            return { 
                success: true, 
                user: this.currentUser,
                remainingAttempts: rateLimitCheck.remainingAttempts
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: 'Authentication error. Please try again.' };
        }
    }

    // ✅ Get current logged-in user
    getCurrentUser() {
        return this.currentUser;
    }
    
    // ✅ Check if user is authenticated
    isAuthenticated(): boolean {
        return this.currentUser !== null;
    }
    
    // ✅ Logout - just clear the session
    logout(): void {
        this.currentUser = null;
        console.log('👋 User logged out');
    }
    
    // ✅ Check user role
    hasRole(role: string | string[]): boolean {
        if (!this.currentUser) return false;
        
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(this.currentUser.role);
    }
}