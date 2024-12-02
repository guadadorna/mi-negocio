export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'payment_pending';

export type Transaction = {
  id: number;
  type: 'buy' | 'sell' | 'manual';
  item: string; // What is being sold or bought
  amount: number; // Amount of the item being traded
  payment: string; // Currency being paid
  paymentAmount: number; // Amount expected in payment
  employee: string; // Assigned employee
  client: Client | null; // Client involved
  status: 'pending' | 'completed' | 'cancelled' | 'payment_delayed'; // Transaction status
  delayedBy?: string; // Employee who delayed the payment
  pendingPayment?: { amount: number; currency: string }; // Payment still due
  notes?: string; // Notes about the delayed payment
  paymentCollector?: string; // Assigned employee to collect payment
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
  [key: string]: number; // Example: { dolares: 1000, euros: 500 }
};


interface ExchangeRateInput {
  dolarToPeso: string | number
  euroToDolar: string | number
  realToDolar: string | number
}

