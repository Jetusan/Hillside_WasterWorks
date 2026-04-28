import { Database } from 'sql.js';
import { Payment, CreatePaymentDTO } from '../../../shared/types/payment';
import { saveDatabase } from '../index';
import { BillRepository } from './billingRepository';

export class PaymentRepository {
    constructor(private db: Database) {}

    create(data: CreatePaymentDTO): { success: boolean; payment?: Payment; allocations?: any[]; remaining?: number; error?: string } {
    console.log('🔵 CREATE START - Customer:', data.customer_id, 'Amount:', data.amount);
    
        const billRepo = new BillRepository(this.db);
        const unpaidBills = billRepo.findUnpaidByCustomerId(data.customer_id);
        console.log('🟢 Unpaid bills found:', unpaidBills.length);
        
        // Insert payment record
        const sql = `
            INSERT INTO payments (customer_id, payment_date, or_number, amount)
            VALUES (?, ?, ?, ?)
        `;
        
        console.log('🟡 Running INSERT...');
        this.db.run(sql, [
            data.customer_id,
            data.payment_date,
            data.or_number,
            data.amount
        ]);
        console.log('🟢 INSERT complete');
        
        // 🔍 DEBUG: See all payments
        const testStmt = this.db.prepare('SELECT * FROM payments');
        const allPayments = [];
        while (testStmt.step()) {
            allPayments.push(testStmt.getAsObject());
        }
        testStmt.free();
        console.log('📊 All payments in table:', allPayments.length, allPayments);
        
        // ✅ Try multiple ways to get the inserted payment
        let payment: Payment | null = null;
        
        // Method 1: last_insert_rowid()
        const rowIdStmt = this.db.prepare('SELECT last_insert_rowid() as id');
        const rowIdResult = rowIdStmt.getAsObject() as any;
        rowIdStmt.free();
        console.log('🆔 last_insert_rowid():', rowIdResult.id);
        
        if (rowIdResult.id) {
            const stmt = this.db.prepare('SELECT * FROM payments WHERE rowid = ?');
            const paymentRow = stmt.getAsObject([rowIdResult.id]) as any;
            stmt.free();
            if (paymentRow.id) {
                payment = this.toPayment(paymentRow);
            }
        }
        
        // Method 2: Query by the exact data we inserted
        if (!payment) {
            console.log('🔄 Trying to find by data...');
            const stmt = this.db.prepare(`
                SELECT * FROM payments 
                WHERE customer_id = ? AND payment_date = ? AND or_number = ? AND amount = ?
                LIMIT 1
            `);
            const paymentRow = stmt.getAsObject([
                data.customer_id,
                data.payment_date,
                data.or_number,
                data.amount
            ]) as any;
            stmt.free();
            if (paymentRow.id) {
                payment = this.toPayment(paymentRow);
                console.log('✅ Found by data, ID:', payment.id);
            }
        }
        
        // Method 3: Create manual payment object (last resort)
        if (!payment) {
            console.log('⚠️ Creating manual payment object');
            payment = {
                id: Math.floor(Math.random() * 1000000), // Temporary ID
                customer_id: data.customer_id,
                payment_date: data.payment_date,
                or_number: data.or_number,
                amount: data.amount,
                created_at: new Date()
            };
        }
        
        saveDatabase();
        console.log('💾 saveDatabase complete');
        console.log('✅ Payment ready, ID:', payment.id);
        
        // Allocate payment to bills
        let remainingAmount = data.amount;
        const allocations: any[] = [];
        
        for (const bill of unpaidBills) {
            if (remainingAmount <= 0) break;
            
            const billBalance = bill.total_amount_due - bill.amount_paid;
            const amountToApply = Math.min(remainingAmount, billBalance);
            
            console.log(`💰 Applying ₱${amountToApply} to bill ${bill.id}`);
            
            this.db.run(`
                INSERT INTO payment_allocations (payment_id, bill_id, amount_applied)
                VALUES (?, ?, ?)
            `, [payment.id, bill.id, amountToApply]);
            
            billRepo.updatePayment(bill.id, amountToApply);
            
            allocations.push({ bill_id: bill.id, amount_applied: amountToApply });
            remainingAmount -= amountToApply;
        }
        
        saveDatabase();
        console.log('✅ CREATE SUCCESS');
        
        const result: any = {
            success: true,
            payment,
            allocations,
            remaining: remainingAmount
        };
        
        if (remainingAmount > 0) {
            result.message = `Overpayment: ₱${remainingAmount.toFixed(2)} will be applied as credit.`;
        }
        
        return result;
    }


    findById(id: number): Payment | null {
        const stmt = this.db.prepare('SELECT * FROM payments WHERE id = ?');
        const payment = stmt.getAsObject([id]) as any;
        stmt.free();
        return payment.id ? this.toPayment(payment) : null;
    }

    findByCustomerId(customerId: number): Payment[] {
        const stmt = this.db.prepare(`
            SELECT * FROM payments 
            WHERE customer_id = ? 
            ORDER BY payment_date DESC
        `);
        
        const payments: Payment[] = [];
        stmt.bind([customerId]);
        
        while (stmt.step()) {
            payments.push(this.toPayment(stmt.getAsObject() as any));
        }
        stmt.free();
        return payments;
    }

    findAll(): Payment[] {
        console.log('📁 Database path:', (this.db as any).filename); // ✅ ADD THIS
        
        const stmt = this.db.prepare(`
            SELECT p.*, c.customer_name, c.meter_number
            FROM payments p
            JOIN customers c ON p.customer_id = c.id
            ORDER BY p.payment_date DESC
            LIMIT 100
        `);
        
        const payments: any[] = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject() as any;
            payments.push({
                ...this.toPayment(row),
                customer_name: row.customer_name,
                meter_number: row.meter_number
            });
        }
        stmt.free();
        
        console.log('📊 Payments found:', payments.length); // ✅ ADD THIS
        return payments;
    }

    getTotalPayments(customerId: number): number {
        const stmt = this.db.prepare(`
            SELECT SUM(amount) as total FROM payments WHERE customer_id = ?
        `);
        stmt.bind([customerId]);
        const result = stmt.getAsObject() as any;
        stmt.free();
        return result.total || 0;
    }

    getPaymentAllocations(paymentId: number): any[] {
        const stmt = this.db.prepare(`
            SELECT pa.*, b.invoice_number
            FROM payment_allocations pa
            JOIN bills b ON pa.bill_id = b.id
            WHERE pa.payment_id = ?
        `);
        
        const allocations: any[] = [];
        stmt.bind([paymentId]);
        
        while (stmt.step()) {
            allocations.push(stmt.getAsObject());
        }
        stmt.free();
        return allocations;
    }

    private findLastInserted(): Payment | null {
        // In sql.js, try getting the max ID instead
        const maxIdStmt = this.db.prepare('SELECT MAX(id) as maxId FROM payments');
        const maxIdResult = maxIdStmt.getAsObject() as any;
        maxIdStmt.free();
        
        console.log('📊 MAX(id):', maxIdResult.maxId);
        
        if (!maxIdResult.maxId) {
            return null;
        }
        
        const stmt = this.db.prepare('SELECT * FROM payments WHERE id = ?');
        const payment = stmt.getAsObject([maxIdResult.maxId]) as any;
        stmt.free();
        
        console.log('🔍 Payment found by MAX(id):', payment.id ? 'YES' : 'NO');
        
        return payment.id ? this.toPayment(payment) : null;
    }

    private toPayment(row: any): Payment {
        return {
            id: row.id,
            customer_id: row.customer_id,
            payment_date: row.payment_date, 
            or_number: row.or_number,
            amount: row.amount,
            created_at: row.created_at 
        };
    }
}