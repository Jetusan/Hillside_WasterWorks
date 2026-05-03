import initSqlJs, { Database } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { UserRepository } from './repositories/userRepository';
import { CustomerRepository } from './repositories/customerRepository';
import { BillRepository } from './repositories/billingRepository';
import { PaymentRepository } from './repositories/paymentRepository';
import { logger } from '../utils/logger';

let db: Database | null = null;
let userRepo: UserRepository | null = null;
let customerRepo: CustomerRepository | null = null;
let billRepo: BillRepository | null = null;
let paymentRepo: PaymentRepository | null = null;

// Priority: 1) env DB_PATH → 2) app.getPath('userData') → 3) process.cwd() fallback
function getDatabasePath(): string {
    if (process.env.DB_PATH) {
        logger.info('Database', 'Using DB_PATH from environment', { path: process.env.DB_PATH });
        return process.env.DB_PATH;
    }
    
    const userDataPath = app?.getPath?.('userData') || process.cwd();
    logger.debug('Database', 'User data path resolved', { path: userDataPath });
    
    const dbPath = path.join(userDataPath, 'billing.db');
    logger.debug('Database', 'Database path resolved', { path: dbPath });
    
    return dbPath;
}

export async function initDatabase(): Promise<Database> {
    if (db) {
        logger.info('Database', 'initDatabase called but already initialized, returning existing');
        return db;
    }
    
    const resolvedDbPath = getDatabasePath();
    logger.info('Database', 'Initializing database', { path: resolvedDbPath });
    
    try {
        const SQL = await initSqlJs();
        
        // Load or create database
        if (fs.existsSync(resolvedDbPath)) {
            const fileBuffer = fs.readFileSync(resolvedDbPath);
            db = new SQL.Database(fileBuffer);
            logger.info('Database', 'Database loaded from file', { 
                path: resolvedDbPath,
                size: fileBuffer.length 
            });
        } else {
            db = new SQL.Database();
            logger.info('Database', 'New database created', { path: resolvedDbPath });
        }
    
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'staff',
                is_active INTEGER DEFAULT 1,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create customers table
        db.run(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cluster VARCHAR(20) NOT NULL,
                meter_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create bills table
        db.run(`
            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                previous_reading DECIMAL(10,2) DEFAULT 0,
                current_reading DECIMAL(10,2) DEFAULT 0,
                usage_cubic_meter DECIMAL(10,2) DEFAULT 0,
                gross_amount DECIMAL(10,2) DEFAULT 0,
                discount DECIMAL(10,2) DEFAULT 0,
                net_amount DECIMAL(10,2) DEFAULT 0,
                penalty DECIMAL(10,2) DEFAULT 0,
                arrears DECIMAL(10,2) DEFAULT 0,
                total_amount_due DECIMAL(10,2) DEFAULT 0,
                amount_paid DECIMAL(10,2) DEFAULT 0,
                billing_date DATE NOT NULL,
                billing_period VARCHAR(20),
                due_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'Unpaid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        `);

        // Create payments table
        db.run(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                payment_date DATE NOT NULL,
                or_number VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        `);

        // Create payment_allocations table
        db.run(`
            CREATE TABLE IF NOT EXISTS payment_allocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id INTEGER NOT NULL,
                bill_id INTEGER NOT NULL,
                amount_applied DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payment_id) REFERENCES payments(id),
                FOREIGN KEY (bill_id) REFERENCES bills(id)
            )
        `);

        // Initialize repositories
        userRepo = new UserRepository(db);
        customerRepo = new CustomerRepository(db);
        billRepo = new BillRepository(db);
        paymentRepo = new PaymentRepository(db);
        logger.info('Database', 'All repositories initialized successfully');

        // Create default admin user
        await createDefaultAdmin(db);
        
        // Save to disk
        saveDatabase();
        logger.info('Database', 'Database initialized successfully', { path: resolvedDbPath });
        
        return db;
        
    } catch (error) {
        logger.catchError('Database:init', error, { path: resolvedDbPath });
        throw error;
    }
}

async function createDefaultAdmin(database: Database): Promise<void> {
    try {
        const stmt = database.prepare("SELECT id FROM users WHERE username = 'admin'");
        const admin = stmt.get();
        stmt.free();
        
        if (!admin) {
            const passwordHash = await bcrypt.hash('Admin@123', 10);
            
            database.run(`
                INSERT INTO users (username, email, password_hash, full_name, role)
                VALUES (?, ?, ?, ?, ?)
            `, ['admin', 'admin@waterdistrict.com', passwordHash, 'System Administrator', 'admin']);
            
            logger.info('Database', 'Default admin created');
        } else {
            logger.debug('Database', 'Admin user already exists');
        }
    } catch (error) {
        logger.catchError('Database:createDefaultAdmin', error);
    }
}

export function saveDatabase(): void {
    if (!db) {
        logger.warn('Database', 'saveDatabase called but db is null');
        return;
    }
    
    const resolvedDbPath = getDatabasePath();
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // Ensure directory exists
    const dir = path.dirname(resolvedDbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(resolvedDbPath, buffer);
        logger.debug('Database', 'Database saved to disk', { path: resolvedDbPath });
    } catch (error) {
        logger.catchError('Database:saveDatabase', error, { path: resolvedDbPath });
        throw error;
    }
}

export function getDatabase(): Database {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

export function getUserRepository(): UserRepository {
    if (!userRepo) throw new Error('Database not initialized. Call initDatabase() first.');
    return userRepo;
}

export function getCustomerRepository(): CustomerRepository {
    if (!customerRepo) throw new Error('Database not initialized. Call initDatabase() first.');
    return customerRepo;
}

export function getBillRepository(): BillRepository {
    if (!billRepo) throw new Error('Database not initialized');
    logger.debug('BillRepository', 'getBillRepository called', { 
        dbFilename: (db as any)?.filename 
    });
    return billRepo;
}

export function getPaymentRepository(): PaymentRepository {
    if (!paymentRepo) throw new Error('Database not initialized');
    return paymentRepo;
}

export function closeDatabase(): void {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
        userRepo = null;
        customerRepo = null;
        billRepo = null;
        paymentRepo = null;
        logger.info('Database', 'Database connection closed');
    }
}