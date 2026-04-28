
import initSqlJs, { Database } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { UserRepository } from './repositories/userRepository';
import { CustomerRepository } from './repositories/customerRepository';
import { BillRepository } from './repositories/billingRepository';
import { PaymentRepository } from './repositories/paymentRepository';

let db: Database | null = null;
let userRepo: UserRepository | null = null;
let customerRepo: CustomerRepository | null = null;
let billRepo: BillRepository | null = null;
let paymentRepo: PaymentRepository | null = null;
const dbPath = path.join(app.getPath('userData'), 'billing.db');

export async function initDatabase(): Promise<Database> {
    if (db) return db;
    
    console.log('📁 Database path:', dbPath);
    
    const SQL = await initSqlJs();
    
    // Load or create database
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('✅ Database loaded from file');
    } else {
        db = new SQL.Database();
        console.log('✅ New database created');
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

    // ✅ Create default admin user
    await createDefaultAdmin(db);
    
    // Save to disk
    saveDatabase();
    
    console.log('✅ Database initialized successfully!');
    return db;
}

    // ✅ Add this function after initDatabase
    async function createDefaultAdmin(database: Database): Promise<void> {
        const stmt = database.prepare("SELECT id FROM users WHERE username = 'admin'");
        const admin = stmt.get();
        stmt.free();
        
        if (!admin) {
            const passwordHash = await bcrypt.hash('Admin@123', 10);
            
            database.run(`
                INSERT INTO users (username, email, password_hash, full_name, role)
                VALUES (?, ?, ?, ?, ?)
            `, ['admin', 'admin@waterdistrict.com', passwordHash, 'System Administrator', 'admin']);
            
            console.log('✅ Default admin created: admin / Admin@123');
        } else {
            console.log('ℹ️ Admin user already exists');
        }
    }

    export function saveDatabase(): void {
        if (!db) return;
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log('💾 Database saved to disk');
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
            console.log('✅ Database connection closed');
        }
    }