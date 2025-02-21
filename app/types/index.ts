export type TransactionType = 'buy' | 'sell' | 'manual';
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'payment_delayed';
export type CurrencyType = 'dolares' | 'euros' | 'reales' | 'pesos';

export type NewTransactionType = {
  type: TransactionType;
  item: CurrencyType;
  amount: number;
  payment: CurrencyType;
  paymentAmount: number;
  employee: string;
  client: Client | null;
};

export type Transaction = {
  id: number;
  type: TransactionType;
  item: CurrencyType;
  amount: number;
  payment: CurrencyType;
  paymentAmount: number;
  employee: string;
  client: Client | null;
  status: OrderStatus;
  delayedBy?: string;
  pendingPayment?: { amount: number; currency: CurrencyType };
  notes?: string;
  paymentCollector?: string;
  created_at?: string;        // Add this field
  completed_at?: string;      // Add this field
  archive_date?: string;      // Add this field
  archived?: boolean;         // Add this field
  archive_filename?: string;  // Add this field
};


export type Client = {
  id: number
  name: string
  address: string
  phone: string
}


export type View = 'orders' | 'clients' | 'employees' | 'inventory' | 'history';

export type ExchangeRates = {
  dolarToPeso: { buy: number; sell: number };
  euroToDolar: { buy: number; sell: number };
  realToDolar: { buy: number; sell: number };
};

export type Inventory = {
  dolares: number;
  euros: number;
  reales: number;
  pesos: number;
  [key: string]: number;  // This allows string indexing
};


