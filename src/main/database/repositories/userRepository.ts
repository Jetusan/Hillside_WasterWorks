import { Database } from 'sql.js';
import { User, SafeUser } from '../../../shared/types/auth';

export class UserRepository {
    constructor(private db: Database) {}

    findById(id: number): SafeUser | null {
        const stmt = this.db.prepare(`
            SELECT id, username, email, full_name, role, is_active, 
                last_login, created_at, updated_at
            FROM users WHERE id = ?
        `);
        
        const user = stmt.getAsObject([id]) as any;
        stmt.free();
        
        if (!user || !user.id) return null;
        
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active === 1,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at
        };
    }

    findByUsername(username: string): SafeUser | null {
        const stmt = this.db.prepare(`
            SELECT id, username, email, full_name, role, is_active, 
                last_login, created_at, updated_at
            FROM users WHERE username = ?
        `);
        
        const user = stmt.getAsObject([username]) as any;
        stmt.free();
        
        if (!user || !user.id) return null;
        
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active === 1,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at
        };
    }

    findByEmail(email: string): User | null {
        const stmt = this.db.prepare(`SELECT * FROM users WHERE email = ?`);
        const user = stmt.getAsObject([email]) as any;
        stmt.free();
        
        return user.id ? (user as User) : null;
    }

    findByUsernameOrEmail(identifier: string): User | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users WHERE username = ? OR email = ?
        `);
        const user = stmt.getAsObject([identifier, identifier]) as any;
        stmt.free();
        
        return user.id ? (user as User) : null;
    }

    incrementFailedAttempts(id: number): void {
        this.db.run(`
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                updated_at = datetime('now')
            WHERE id = ?
        `, [id]);
    }

    lockAccount(id: number, durationMinutes: number = 15): void {
        this.db.run(`
            UPDATE users 
            SET locked_until = datetime('now', '+' || ? || ' minutes'),
                updated_at = datetime('now')
            WHERE id = ?
        `, [durationMinutes, id]);
    }

    resetFailedAttempts(id: number): void {
        this.db.run(`
            UPDATE users 
            SET failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = datetime('now')
            WHERE id = ?
        `, [id]);
    }

    updateLastLogin(id: number): void {
        this.db.run(`
            UPDATE users 
            SET last_login = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
        `, [id]);
    }
}