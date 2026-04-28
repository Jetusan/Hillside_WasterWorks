// ✅ Use PascalCase for interfaces
export interface Payment {
    id: number;
    customer_id: number;
    payment_date: string;
    or_number: string;
    amount: number;
    created_at: Date;
}

export interface CreatePaymentDTO {
    customer_id: number;
    payment_date: string;
    or_number: string;
    amount: number;
}

export interface UpdatePaymentDTO {
    customer_id?: number;
    payment_date?: Date;
    or_number?: string;
    amount?: number;
}

export interface PaymentDisplay {
    id: number;
    customer_id: number;
    payment_date: Date;
    or_number: string;
    amount: number;
    created_at: Date;
}

export interface PaymentWithCustomer extends Payment {
    customer_name: string;
    meter_number: string;
    cluster: string;
}


export interface PaymentAllocation {
    id: number;
    payment_id: number;
    bill_id: number;
    amount_applied: number;
    created_at: Date;
}

export interface CreatePaymentAllocationDTO {
    payment_id: number;
    bill_id: number;
    amount_applied: number;
}

export interface PaymentResult {
    success: boolean;
    error?: string;
    message?: string;
    payment?: Payment;
    allocations?: PaymentAllocation[];
    remaining?: number;
}