import { Database } from 'sql.js';
import { saveDatabase } from '../index'; 
import { Customer, CreateCustomerDTO, UpdateCustomerDTO, CustomerDisplay} from '../../../shared/types/customer';

export class CustomerRepository {
    constructor(private db: Database) {}

    create(data: CreateCustomerDTO): Customer | null {
        const sql = `
            INSERT INTO customers (cluster, meter_number, customer_name)
            VALUES (?, ?, ?)
        `;
        
        this.db.run(sql, [data.cluster, data.meter_number, data.customer_name]);
        saveDatabase();
        return this.findByMeterNumber(data.meter_number);
    }

    findById(id: number): Customer | null {
        const stmt = this.db.prepare(`
            SELECT
                id,
                cluster,
                meter_number,
                customer_name,
                is_active,
                created_at,
                updated_at
            FROM customers WHERE id = ?
        `);     
        const customer = stmt.getAsObject([id]) as any;
        stmt.free();

        if (!customer || !customer.id) return null;
        return {
            id: customer.id,
            cluster: customer.cluster,
            meter_number: customer.meter_number,
            customer_name: customer.customer_name,
            is_active: customer.is_active as 0 | 1,
            created_at: customer.created_at,
            updated_at: customer.updated_at
        };
    }

    findByMeterNumber(meterNumber: string): Customer | null {
        const stmt = this.db.prepare(`
            SELECT 
                id,
                cluster,
                meter_number,
                customer_name,
                is_active,
                created_at,
                updated_at
            FROM customers WHERE meter_number = ?
        `);
        
        const customer = stmt.getAsObject([meterNumber]) as any;
        stmt.free();
        
        if (!customer || !customer.id) return null;
        
        return {
            id: customer.id,
            cluster: customer.cluster,
            meter_number: customer.meter_number,
            customer_name: customer.customer_name,
            is_active: customer.is_active as 0 | 1,
            created_at: customer.created_at,
            updated_at: customer.updated_at
        };
    }  
    findAll(): Customer[] {
        const stmt = this.db.prepare(`
            SELECT 
                id,
                cluster,
                meter_number,
                customer_name,
                is_active,
                created_at,
                updated_at
            FROM customers 
            WHERE is_active = 1
            ORDER BY
                SUBSTR(cluster, 1, 1),
                CAST(SUBSTR(cluster, 2) AS INTEGER)
        `);
        
        const customers: Customer[] = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject() as any;
            customers.push({
                id: row.id,
                cluster: row.cluster,
                meter_number: row.meter_number,
                customer_name: row.customer_name,
                is_active: row.is_active as 0 | 1,
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        }
        
        stmt.free();
        return customers;
    }
    
    findAllIncludeInactive(): Customer[] {
        const stmt = this.db.prepare(`
            SELECT 
                id,
                cluster,
                meter_number,
                customer_name,
                is_active,
                created_at,
                updated_at
            FROM customers 
            ORDER BY cluster, id
        `);
        
        const customers: Customer[] = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject() as any;
            customers.push({
                id: row.id,
                cluster: row.cluster,
                meter_number: row.meter_number,
                customer_name: row.customer_name,
                is_active: row.is_active as 0 | 1,
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        }
        
        stmt.free();
        return customers;
    }

    searchByName(query: string): Customer[] {
        const stmt = this.db.prepare(`
            SELECT 
                id,
                cluster,
                meter_number,
                customer_name,
                is_active,
                created_at,
                updated_at
            FROM customers 
            WHERE customer_name LIKE ? AND is_active = 1
            ORDER BY customer_name
        `);
        
        const customers: Customer[] = [];
        const searchPattern = `%${query}%`;
        
        stmt.bind([searchPattern]);
        
        while (stmt.step()) {
            const row = stmt.getAsObject() as any;
            customers.push({
                id: row.id,
                cluster: row.cluster,
                meter_number: row.meter_number,
                customer_name: row.customer_name,
                is_active: row.is_active as 0 | 1,
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        }
        
        stmt.free();
        return customers;
    }

    findByCluster(cluster: string): Customer[] {
        const stmt = this.db.prepare(`
            SELECT 
                id,
                cluster,
                meter_number,
                customer_name,
                is_active,
                created_at,
                updated_at
            FROM customers 
            WHERE cluster = ? AND is_active = 1
            ORDER BY id
        `);
        
        const customers: Customer[] = [];
        stmt.bind([cluster]);
        
        while (stmt.step()) {
            const row = stmt.getAsObject() as any;
            customers.push({
                id: row.id,
                cluster: row.cluster,
                meter_number: row.meter_number,
                customer_name: row.customer_name,
                is_active: row.is_active as 0 | 1,
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        }
        
        stmt.free();
        return customers;
    }

    update(id: number, data: UpdateCustomerDTO): Customer | null {
        const updates: string[] = [];
        const params: any[] = [];
        
        if (data.cluster !== undefined) {
            updates.push('cluster = ?');
            params.push(data.cluster);
        }
        if (data.meter_number !== undefined) {
            updates.push('meter_number = ?');
            params.push(data.meter_number);
        }
        if (data.customer_name !== undefined) {
            updates.push('customer_name = ?');
            params.push(data.customer_name);
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(data.is_active ? 1 : 0);
        }
        
        if (updates.length === 0) return this.findById(id);
        
        updates.push('updated_at = datetime(\'now\')');
        params.push(id);
        
        const sql = `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`;
        saveDatabase();
        this.db.run(sql, params);
        
        return this.findById(id);
    }

    delete(id: number): boolean {
        this.db.run(`
            UPDATE customers 
            SET is_active = 0, updated_at = datetime('now') 
            WHERE id = ?
        `, [id]);
        return true;

        saveDatabase();
    }

    hardDelete(id: number): boolean {
        this.db.run('DELETE FROM customers WHERE id = ?', [id]);
        saveDatabase();
        return true;
    }

    count(): number {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_active = 1');
        const result = stmt.getAsObject() as any;
        stmt.free();
        return result.count;
    }

    meterNumberExists(meterNumber: string, excludeId?: number): boolean {
        let sql = 'SELECT COUNT(*) as count FROM customers WHERE meter_number = ?';
        const params: any[] = [meterNumber];
        
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const result = stmt.getAsObject() as any;
        stmt.free();
        
        return result.count > 0;
    }

    getAllClusters(): string[] {
        const stmt = this.db.prepare(`
            SELECT DISTINCT cluster 
            FROM customers 
            WHERE is_active = 1 
            ORDER BY cluster
        `);
        
        const clusters: string[] = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject() as any;
            clusters.push(row.cluster);
        }
        
        stmt.free();
        return clusters;
    }
}
