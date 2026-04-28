import { getCustomerRepository } from '../database';
import { CreateCustomerDTO, UpdateCustomerDTO } from '../../shared/types/customer';

export class CustomerService {
    
    async getAllCustomers() {
        try {
            const repo = getCustomerRepository();
            const customers = repo.findAll();
            return customers;
        } catch (error) {
            console.error('❌ Get customers error:', error);
            return [];
        }
    }
    
    async searchCustomers(query: string) {
        try {
            const repo = getCustomerRepository();
            return repo.searchByName(query);
        } catch (error) {
            console.error('❌ Search customers error:', error);
            return [];
        }
    }
    
    async getCustomerById(id: number) {
        try {
            const repo = getCustomerRepository();
            return repo.findById(id);
        } catch (error) {
            console.error('❌ Get customer error:', error);
            return null;
        }
    }
    
    async getCustomerByMeterNumber(meterNumber: string) {
        try {
            const repo = getCustomerRepository();
            return repo.findByMeterNumber(meterNumber);
        } catch (error) {
            console.error('❌ Get customer error:', error);
            return null;
        }
    }
    
    async createCustomer(data: CreateCustomerDTO) {
        console.log(`📝 Creating customer: ${data.customer_name}`);
        
        try {
            const repo = getCustomerRepository();
            
            // Check if meter number already exists
            if (repo.meterNumberExists(data.meter_number)) {
                return { 
                    success: false, 
                    error: 'Meter number already exists' 
                };
            }
            
            const customer = repo.create(data);
            
            if (!customer) {
                return { 
                    success: false, 
                    error: 'Failed to create customer' 
                };
            }
            
            console.log(`✅ Customer created: ${customer.customer_name}`);
            
            return { 
                success: true, 
                data: customer 
            };
            
        } catch (error) {
            console.error('❌ Create customer error:', error);
            return { 
                success: false, 
                error: 'Failed to create customer' 
            };
        }
    }
    
    async updateCustomer(id: number, data: UpdateCustomerDTO) {
        console.log(`✏️ Updating customer ID: ${id}`);
        
        try {
            const repo = getCustomerRepository();
            
            // Check if customer exists
            const existing = repo.findById(id);
            if (!existing) {
                return { 
                    success: false, 
                    error: 'Customer not found' 
                };
            }
            
            // If updating meter number, check if it already exists
            if (data.meter_number) {
                if (repo.meterNumberExists(data.meter_number, id)) {
                    return { 
                        success: false, 
                        error: 'Meter number already exists' 
                    };
                }
            }
            
            const customer = repo.update(id, data);
            
            if (!customer) {
                return { 
                    success: false, 
                    error: 'Failed to update customer' 
                };
            }
            
            console.log(`✅ Customer updated: ${customer.customer_name}`);
            
            return { 
                success: true, 
                data: customer 
            };
            
        } catch (error) {
            console.error('❌ Update customer error:', error);
            return { 
                success: false, 
                error: 'Failed to update customer' 
            };
        }
    }
    
    async deleteCustomer(id: number) {
        console.log(`🗑️ Deleting customer ID: ${id}`);
        
        try {
            const repo = getCustomerRepository();
            
            const existing = repo.findById(id);
            if (!existing) {
                return { 
                    success: false, 
                    error: 'Customer not found' 
                };
            }
            
            repo.delete(id);
            
            console.log(`✅ Customer deleted: ${existing.customer_name}`);
            
            return { 
                success: true 
            };
            
        } catch (error) {
            console.error('❌ Delete customer error:', error);
            return { 
                success: false, 
                error: 'Failed to delete customer' 
            };
        }
    }
    
    async getAllClusters() {
        try {
            const repo = getCustomerRepository();
            return repo.getAllClusters();
        } catch (error) {
            console.error('❌ Get clusters error:', error);
            return [];
        }
    }
    
    async getCustomersByCluster(cluster: string) {
        try {
            const repo = getCustomerRepository();
            return repo.findByCluster(cluster);
        } catch (error) {
            console.error('❌ Get customers by cluster error:', error);
            return [];
        }
    }
    
    async getCustomerCount() {
        try {
            const repo = getCustomerRepository();
            return repo.count();
        } catch (error) {
            console.error('❌ Get customer count error:', error);
            return 0;
        }
    }
}