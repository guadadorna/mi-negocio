import { Client, Transaction, TransactionType, CurrencyType, OrderStatus } from './types';
import { Dispatch, SetStateAction } from 'react';

export const generateTestData = (
  setClients: Dispatch<SetStateAction<Client[]>>,
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
) => {
    const testClients = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Cliente ${i + 1}`,
      address: `Dirección ${i + 1}`,
      phone: `555-${String(i + 1).padStart(4, '0')}`
    }));
  
    const transactions = [];
    const now = new Date();
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
  
    for (let d = 0; d < 365; d++) {
      const date = new Date(oneYearAgo.getTime() + (d * 24 * 60 * 60 * 1000));
      const dailyTransactions = 2 + Math.floor(Math.random() * 2);
      
      for (let t = 0; t < dailyTransactions; t++) {
        const client = testClients[Math.floor(Math.random() * testClients.length)];
        transactions.push({
          id: date.getTime() + t,
          type: (Math.random() > 0.5 ? 'buy' : 'sell') as TransactionType,
          item: ['dolares', 'euros', 'reales'][Math.floor(Math.random() * 3)] as CurrencyType,
          amount: 100 + Math.floor(Math.random() * 900),
          payment: 'pesos' as CurrencyType,
          paymentAmount: 1000 + Math.floor(Math.random() * 9000),
          employee: ['Veneno', 'Chinda', 'Juan'][Math.floor(Math.random() * 3)],
          client,
          status: 'completed' as OrderStatus
        });
      }
    }
  
    setClients(testClients);
    setTransactions(transactions);
  };