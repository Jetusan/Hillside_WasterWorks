interface RateLimitEntry {
    count: number;
    resetTime: number;
    blockedUntil: number | null;
}

class RateLimiter {
    private attempts: Map<string, RateLimitEntry> = new Map();
    private readonly maxAttempts: number;
    private readonly windowMs: number;
    private readonly blockDurationMs: number;
    
    constructor(
        maxAttempts: number = 5,
        windowMs: number = 1 * 60 * 1000,        // 1 minute window
        blockDurationMs: number = 30 * 1000       // 30 SECONDS block
    ) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
        this.blockDurationMs = blockDurationMs;
        
        console.log('🛡️ RateLimiter initialized:', {
            maxAttempts,
            windowMs: `${windowMs / 1000}s`,
            blockDurationMs: `${blockDurationMs / 1000}s`
        });
        
        // Clean up old entries every 1 minute
        setInterval(() => this.cleanup(), 60 * 1000);
    }
    
    checkRateLimit(key: string): { 
        allowed: boolean; 
        remainingAttempts: number; 
        resetTime: Date; 
        message?: string 
    } {
        const now = Date.now();
        let entry = this.attempts.get(key);
        
        // If no entry exists, create one
        if (!entry) {
            entry = { count: 0, resetTime: now + this.windowMs, blockedUntil: null };
            this.attempts.set(key, entry);
        }
        
        // Check if blocked
        if (entry.blockedUntil && now < entry.blockedUntil) {
            const remainingMs = entry.blockedUntil - now;
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);
            
            // Smart time display
            let timeMessage: string;
            if (remainingSeconds <= 60) {
                timeMessage = `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
            } else {
                timeMessage = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
            }
            
            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime: new Date(entry.blockedUntil),
                message: `Too many attempts. Please try again in ${timeMessage}.`
            };
        }
        
        // Reset if window has passed
        if (now > entry.resetTime) {
            console.log(`🔄 Window expired for ${key}, resetting counter`);
            entry.count = 0;
            entry.resetTime = now + this.windowMs;
            entry.blockedUntil = null;
        }
        
        // If was blocked but block expired, reset
        if (entry.blockedUntil && now >= entry.blockedUntil) {
            console.log(`🔓 Block expired for ${key}, resetting`);
            entry.count = 0;
            entry.resetTime = now + this.windowMs;
            entry.blockedUntil = null;
        }
        
        // Check if max attempts reached
        if (entry.count >= this.maxAttempts) {
            entry.blockedUntil = now + this.blockDurationMs;
            const blockSeconds = Math.ceil(this.blockDurationMs / 1000);
            
            console.log(`🚫 Blocking ${key} for ${blockSeconds} seconds`);
            
            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime: new Date(entry.blockedUntil),
                message: `Too many attempts. Please try again in ${blockSeconds} seconds.`
            };
        }
        
        // Increment counter
        entry.count++;
        const remainingAttempts = this.maxAttempts - entry.count;
        
        console.log(`📊 ${key}: attempt ${entry.count}/${this.maxAttempts} (${remainingAttempts} remaining)`);
        
        return {
            allowed: true,
            remainingAttempts,
            resetTime: new Date(entry.resetTime),
            message: remainingAttempts <= 2 && remainingAttempts > 0
                ? `${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining` 
                : undefined
        };
    }
    
    resetAttempts(key: string): void {
        this.attempts.delete(key);
        console.log(`🔄 Rate limit reset for: ${key}`);
    }
    
    getRemainingBlockTime(key: string): number {
        const entry = this.attempts.get(key);
        if (entry?.blockedUntil) {
            return Math.max(0, entry.blockedUntil - Date.now());
        }
        return 0;
    }
    
    private cleanup(): void {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, entry] of this.attempts.entries()) {
            if (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil)) {
                this.attempts.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} rate limit entries`);
        }
    }
}

// DEVELOPMENT: Quick blocks for testing
export const loginRateLimiter = new RateLimiter(
    5,                    // 5 attempts
    1 * 60 * 1000,       // 1 minute window
    30 * 1000            // 30 SECONDS block
);

export const apiRateLimiter = new RateLimiter(
    100,                  // 100 requests
    60 * 1000,           // 1 minute window
    5 * 60 * 1000        // 5 minute block
);