import { Client, Transaction, TransactionType, CurrencyType, OrderStatus } from '@/app/types';

export const generateTestData = async (
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>,
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void
) => {
  // Add clients and collect them with their IDs
  const addedClients = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      const client = {
        name: `Cliente ${i + 1}`,
        address: `Dirección ${i + 1}`,
        phone: `555-${String(i + 1).padStart(4, '0')}`
      };
      return await addClient(client);
    })
  );

  const now = new Date();
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));

  for (let d = 0; d < 365; d++) {
    const dailyTransactions = 2 + Math.floor(Math.random() * 2);
    
    for (let t = 0; t < dailyTransactions; t++) {
      const client = addedClients[Math.floor(Math.random() * addedClients.length)];
      
      const transaction = {
        type: (Math.random() > 0.5 ? 'buy' : 'sell') as TransactionType,
        item: ['dolares', 'euros', 'reales'][Math.floor(Math.random() * 3)] as CurrencyType,
        amount: 100 + Math.floor(Math.random() * 900),
        payment: 'pesos' as CurrencyType,
        paymentAmount: 1000 + Math.floor(Math.random() * 9000),
        employee: ['Veneno', 'Chinda', 'Juan'][Math.floor(Math.random() * 3)],
        client,
        status: 'completed' as OrderStatus
      };

      await addTransaction(transaction);
    }
  }
};