export interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
    is_active: 0 | 1;             
    created_at: string;
    updated_at: string;
}

export interface CreateCustomerDTO {
    cluster: string;
    meter_number: string;
    customer_name: string;
    is_active: number;
}

export interface UpdateCustomerDTO {
    cluster?: string;
    meter_number?: string;
    customer_name?: string;
    is_active?: 0 | 1;
}

// For frontend display (converted boolean)
export interface CustomerDisplay {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
    is_active: boolean;          
    created_at: string;
    updated_at: string;
}