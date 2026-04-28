import { getPaymentRepository } from '../database';
import { getBillRepository } from '../database';
import { getCustomerRepository } from '../database';
import { CreatePaymentDTO, PaymentResult } from '../../shared/types/payment';

export class PaymentService {
    
    async processPayment(data: CreatePaymentDTO): Promise<PaymentResult> {
        console.log(`💳 Processing payment: Customer ${data.customer_id}, Amount: ₱${data.amount}`);
        
        try {
            // Validate customer exists
            const customerRepo = getCustomerRepository();
            const customer = customerRepo.findById(data.customer_id);
            
            if (!customer) {
                return { success: false, error: 'Customer not found' };
            }
            
            // Validate payment amount
            if (data.amount <= 0) {
                return { success: false, error: 'Payment amount must be greater than zero' };
            }
            
            // Validate OR number is not empty
            if (!data.or_number || data.or_number.trim() === '') {
                return { success: false, error: 'OR Number is required' };
            }
            
            // Process payment
            const paymentRepo = getPaymentRepository();
            const result = paymentRepo.create(data);
            
            if (result.success) {
                console.log(`✅ Payment processed: OR# ${data.or_number}`);
                console.log(`   Allocated to ${result.allocations?.length || 0} bill(s)`);
                if (result.remaining && result.remaining > 0) {
                    console.log(`   Overpayment: ₱${result.remaining.toFixed(2)}`);
                }
            }
            
            return result;
            
        } catch (error: any) {
            console.error('❌ Payment error:', error);
            return { success: false, error: error.message || 'Payment processing failed' };
        }
    }
    
    async getCustomerPayments(customerId: number) {
        try {
            const paymentRepo = getPaymentRepository();
            return paymentRepo.findByCustomerId(customerId);
        } catch (error) {
            console.error('❌ Get payments error:', error);
            return [];
        }
    }
    
    async getPaymentById(id: number) {
        try {
            const paymentRepo = getPaymentRepository();
            return paymentRepo.findById(id);
        } catch (error) {
            console.error('❌ Get payment error:', error);
            return null;
        }
    }
    
    async getAllPayments(limit: number = 100) {
        try {
            const paymentRepo = getPaymentRepository();
            return paymentRepo.findAll().slice(0, limit);
        } catch (error) {
            console.error('❌ Get all payments error:', error);
            return [];
        }
    }
    
    async getPaymentAllocations(paymentId: number) {
        try {
            const paymentRepo = getPaymentRepository();
            return paymentRepo.getPaymentAllocations(paymentId);
        } catch (error) {
            console.error('❌ Get allocations error:', error);
            return [];
        }
    }
    
    async getCustomerTotalPayments(customerId: number): Promise<number> {
        try {
            const paymentRepo = getPaymentRepository();
            return paymentRepo.getTotalPayments(customerId);
        } catch (error) {
            console.error('❌ Get total payments error:', error);
            return 0;
        }
    }
    
    async getCustomerBalance(customerId: number): Promise<{ totalDue: number; totalPaid: number; balance: number }> {
        try {
            const billRepo = getBillRepository();
            const paymentRepo = getPaymentRepository();
            
            const bills = billRepo.findByCustomerId(customerId);
            const totalDue = bills.reduce((sum, bill) => sum + bill.total_amount_due, 0);
            const totalPaid = paymentRepo.getTotalPayments(customerId);
            
            return {
                totalDue,
                totalPaid,
                balance: totalDue - totalPaid
            };
        } catch (error) {
            console.error('❌ Get balance error:', error);
            return { totalDue: 0, totalPaid: 0, balance: 0 };
        }
    }
}