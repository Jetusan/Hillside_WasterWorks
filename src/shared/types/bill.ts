export interface Bill {
    id: number;
    customer_id: number;
    invoice_number: string;
    previous_reading: number;
    current_reading: number;
    usage_cubic_meter: number;
    gross_amount: number;
    discount: number;
    net_amount: number;
    penalty: number;
    arrears: number;
    total_amount_due: number;
    amount_paid: number;
    billing_date: string;
    billing_period: string;
    due_date: string;
    status: 'Unpaid' | 'Partial' | 'Paid';
    created_at: string;
}

export interface CreateBillDTO {
    customer_id: number;
    previous_reading: number;
    current_reading: number;
    discount?: number;
    penalty?: number;
    billing_date: string;
    billing_period: string;
    due_date: string;
}

export interface UpdateBillDTO {
    amount_paid?: number;
    status?: 'Unpaid' | 'Partial' | 'Paid';
}

export interface BillWithCustomer extends Bill {
    cluster: string;
    meter_number: string;
    customer_name: string;
}

export interface BillCalculation {
    usage: number;
    grossAmount: number;
    netAmount: number;
    totalDue: number;
}