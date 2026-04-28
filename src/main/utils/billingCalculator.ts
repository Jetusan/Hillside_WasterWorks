import { BillCalculation } from "../../shared/types";

export function calculateBill(
    previousReading: number,
    currentReading: number,
    discount: number = 0,
    penalty: number = 0,
    arrears: number = 0
):BillCalculation  {
    // Calculate usage
    const usage = currentReading - previousReading;
    
    if (usage < 0) {
        throw new Error('Current reading cannot be lower than previous reading');
    }
    
    // Calculate gross amount
    let grossAmount: number;
    if (usage <= 10) {
        grossAmount = 200;
    } else if (usage <= 30) {
        grossAmount = 200 + ((usage - 10) * 21);
    } else {
        grossAmount = 200 + ((usage - 10) * 22);
    }
    
    // Calculate net amount (with discount applied to usage)
    const billableUsage = usage + discount;
    let netAmount: number;
    
    if (billableUsage <= 10) {
        netAmount = 200;
    } else if (billableUsage <= 30) {
        netAmount = 200 + ((billableUsage - 10) * 21);
    } else {
        netAmount = 200 + ((billableUsage - 10) * 22);
    }
    
    const totalDue = netAmount + penalty + arrears;
    
    return {
        usage,
        grossAmount,
        netAmount,
        totalDue
    };
}

export function generateInvoiceNumber(): string {
    const now = new Date();
    const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `INV-${yearMonth}-${random}`;
}

export function calculateDueDate(billingDate: string): string {
    const date = new Date(billingDate);
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
}

export function getBillingPeriod(date: string): string {
    const d = new Date(date);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]}-${d.getFullYear().toString().slice(-2)}`;
}