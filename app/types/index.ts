export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'payment_delayed';

export type CurrencyType = 'dolares' | 'euros' | 'reales' | 'pesos';

export type Transaction = {
  id: number;
  type: 'buy' | 'sell' | 'manual';
  item: CurrencyType;
  amount: number;
  payment: CurrencyType;
  paymentAmount: number;
  employee: string;
  client: Client | null;
  status: 'pending' | 'completed' | 'cancelled' | 'payment_delayed';
  delayedBy?: string;
  pendingPayment?: { amount: number; currency: CurrencyType };
  notes?: string;
  paymentCollector?: string;
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


interface ExchangeRateInput {
  dolarToPeso: string | number
  euroToDolar: string | number
  realToDolar: string | number
}

