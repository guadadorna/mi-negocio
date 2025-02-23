// In useData.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Transaction, ExchangeRates, Inventory } from '../types';

// In useData.ts, modify the useClients hook:

export const useClients = () => {
  const [clients, setClientsState] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClients();
    
    const channel = supabase
      .channel('clients_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        payload => {
          console.log('Clients change received:', payload);
          fetchClients();
        }
      )
      .subscribe(status => {
        console.log('Clients subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchClients() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      
      setClientsState(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const addClient = async (client: Omit<Client, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([client])
        .select()
        .single();
        
      if (error) throw error;
      
      await fetchClients(); // Refresh the list
      return data as Client;
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  const updateClient = async (client: Client) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', client.id);
        
      if (error) throw error;
      
      await fetchClients(); // Refresh the list
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  return { 
    clients, 
    setClients: addClient, 
    updateClient,
    isLoading 
  };
};

export const useTransactions = () => {
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Define fetchTransactions within the hook scope
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*, client:clients(*)')
        .order('id', { ascending: false });
      
      if (error) throw error;
      
      console.log('Fetched transactions from Supabase:', data);
      
      // Verify paymentAmount is being properly mapped
      const processedData = data?.map(t => ({
        ...t,
        paymentAmount: t.payment_amount // Make sure we map payment_amount to paymentAmount
      })) || [];
      
      console.log('Processed transactions:', processedData);
      
      setTransactionsState(processedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    
    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        payload => {
          console.log('Transactions change received:', payload);
          fetchTransactions();
        }
      )
      .subscribe(status => {
        console.log('Transactions subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // In useData.ts, update the setTransactions function:

  const setTransactions = async (newTransactions: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    const updatedTransactions = newTransactions instanceof Function ? newTransactions(transactions) : newTransactions;
    
    try {
      // Find which transactions have changed
      const changedTransactions = updatedTransactions.filter((newT) => {
        const oldT = transactions.find(t => t.id === newT.id);
        return oldT && (
          oldT.status !== newT.status ||
          oldT.notes !== newT.notes ||
          oldT.paymentAmount !== newT.paymentAmount
        );
      });
  
      // Only sync changed transactions with Supabase
      for (const transaction of changedTransactions) {
        const supabaseData = {
          status: transaction.status,
          notes: transaction.notes || null,
          payment_amount: Number(transaction.paymentAmount) || 0,
          completed_at: transaction.status === 'completed' ? new Date().toISOString() : null
        };
  
        const { error } = await supabase
          .from('transactions')
          .update(supabaseData)
          .eq('id', transaction.id);
  
        if (error) throw error;
      }
  
      // Update local state
      setTransactionsState(updatedTransactions);
    } catch (error) {
      console.error('Error syncing transactions:', error);
      await fetchTransactions();
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      console.log('Incoming transaction:', transaction);
      
      const timestamp = new Date().toISOString();
      const supabaseTransaction = {
        type: transaction.type,
        item: transaction.item,
        amount: Number(transaction.amount),
        payment: transaction.payment,
        payment_amount: Number(transaction.paymentAmount),
        employee: transaction.employee,
        client_id: transaction.client?.id,
        status: transaction.status,
        notes: transaction.notes || null,
        archived: false,
        created_at: timestamp,  // Add this line
        id: Date.now()         // Add this line to ensure a proper timestamp-based ID
      };
  
      console.log('Prepared Supabase transaction:', supabaseTransaction);
  
      const { data, error } = await supabase
        .from('transactions')
        .insert([supabaseTransaction])
        .select();
  
      if (error) throw error;
  
      console.log('Supabase response:', data);
  
      await fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };
  
  const updateTransaction = async (transaction: Transaction) => {
    try {
      // Log the incoming transaction
      console.log('Updating transaction:', transaction);
      console.log('Update payment amount:', transaction.paymentAmount);
  
      const updateData = {
        type: transaction.type,
        item: transaction.item,
        amount: Number(transaction.amount),
        payment: transaction.payment,
        payment_amount: Number(transaction.paymentAmount),
        employee: transaction.employee,
        client_id: transaction.client?.id,
        status: transaction.status,
        notes: transaction.notes || null,
        archived: false
      };
  
      // Log the update data
      console.log('Update data being sent:', updateData);
  
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transaction.id)
        .select(); // Add select to see what was actually updated
  
      if (error) throw error;
  
      // Log what was actually updated
      console.log('Supabase update response:', data);
  
      await fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  return { 
    transactions, 
    setTransactions, 
    addTransaction,
    updateTransaction,
    isLoading 
  };
};

export const useExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRates>({
    dolarToPeso: { buy: 0, sell: 0 },
    euroToDolar: { buy: 0, sell: 0 },
    realToDolar: { buy: 0, sell: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          await initializeRates();
        } else {
          throw error;
        }
      } else if (data) {
        setRates(data.rates);
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function initializeRates() {
    const initialRates: ExchangeRates = {
      dolarToPeso: { buy: 0, sell: 0 },
      euroToDolar: { buy: 0, sell: 0 },
      realToDolar: { buy: 0, sell: 0 },
    };

    try {
      const { error } = await supabase
        .from('exchange_rates')
        .insert([{ id: 1, rates: initialRates }]);
        
      if (error) throw error;
      
      setRates(initialRates);
    } catch (error) {
      console.error('Error initializing rates:', error);
    }
  }

  useEffect(() => {
    fetchRates();
    
    const channel = supabase
      .channel('exchange_rates_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'exchange_rates' },
        payload => {
          console.log('Exchange rates change received:', payload);
          fetchRates();
        }
      )
      .subscribe(status => {
        console.log('Exchange rates subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRates]);

  async function updateRates(newRates: ExchangeRates) {
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .upsert({ id: 1, rates: newRates });
        
      if (error) throw error;
      
      await fetchRates(); // Now this will work
    } catch (error) {
      console.error('Error updating rates:', error);
      throw error;
    }
  }

  return { rates, setRates: updateRates, isLoading };
};

// In useData.ts, modify the useInventory hook:

export const useInventory = () => {
  const [inventory, setInventoryState] = useState<Inventory>({
    dolares: 0,
    euros: 0,
    reales: 0,
    pesos: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState<Array<{ currency: string; amount: number }>>([]);

  // Function to sync pending updates with Supabase
 // In useInventory hook
const syncPendingUpdates = useCallback(async () => {
  while (pendingUpdates.length > 0) {
    const update = pendingUpdates[0];
    try {
      const { error } = await supabase
        .from('inventory')
        .upsert({ 
          currency: update.currency,
          amount: inventory[update.currency as keyof Inventory],
          last_updated: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setPendingUpdates(prev => prev.slice(1));
    } catch (error) {
      console.error('Error syncing inventory update:', error);
      break;
    }
  }
}, [pendingUpdates, inventory]);

  // Modified setInventory function
  const setInventory = async (value: Inventory | ((prev: Inventory) => Inventory)) => {
    const newInventory = value instanceof Function ? value(inventory) : value;
    const timestamp = new Date().toISOString();
    
    try {
      // Insert new inventory records instead of updating
      const inventoryRecords = Object.entries(newInventory).map(([currency, amount]) => ({
        currency,
        amount,
        last_updated: timestamp
      }));
  
      // Insert new records
      const { error } = await supabase
        .from('inventory')
        .insert(inventoryRecords);
        
      if (error) throw error;
      
      // Update local state
      setInventoryState(newInventory);
    } catch (error) {
      console.error('Error updating inventory:', error);
      await fetchInventory(); // Refresh from database on error
    }
  };

  // Sync pending updates whenever they change
  useEffect(() => {
    if (pendingUpdates.length > 0) {
      syncPendingUpdates();
    }
  }, [pendingUpdates, syncPendingUpdates]);

  // Initial fetch remains the same
  useEffect(() => {
    fetchInventory();
    
    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory' },
        payload => {
          console.log('Inventory change received:', payload);
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingUpdates, syncPendingUpdates]);

  async function fetchInventory() {
    try {
      setIsLoading(true);
      
      // First get the latest timestamp
      const { data: latestData, error: latestError } = await supabase
        .from('inventory')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();
  
      if (latestError) throw latestError;
  
      // Then get all records with that timestamp
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('last_updated', latestData.last_updated);
      
      if (error) throw error;
      
      const inventoryObj: Inventory = {
        dolares: 0,
        euros: 0,
        reales: 0,
        pesos: 0
      };
      
      (data || []).forEach(record => {
        inventoryObj[record.currency as keyof Inventory] = record.amount;
      });
      
      setInventoryState(inventoryObj);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }


  async function getInventoryHistory(startDate: Date, endDate: Date) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .gte('last_updated', startDate.toISOString())
        .lte('last_updated', endDate.toISOString())
        .order('last_updated', { ascending: true });
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching inventory history:', error);
      return null;
    }
  }

  return { inventory, setInventory, isLoading };
};