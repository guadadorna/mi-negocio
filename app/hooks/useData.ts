// In useData.ts

import { useState, useEffect, useCallback, useRef } from 'react';
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

  const deleteClient = async (clientId: number) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
        
      if (error) throw error;
      
      // Update the local state by removing the deleted client
      setClientsState(prevClients => prevClients.filter(client => client.id !== clientId));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  };

  return { 
    clients, 
    setClients: addClient, 
    updateClient,
    deleteClient,
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
    /*
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
    */
  }, []);

  // In useData.ts, update the setTransactions function:

  const setTransactions = async (newTransactions: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    const updatedTransactions = newTransactions instanceof Function ? newTransactions(transactions) : newTransactions;
    
    // Check if transactions have actually changed
    if (JSON.stringify(updatedTransactions) === JSON.stringify(transactions)) {
      return; // Skip the update entirely if nothing changed
    }
    
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

export const useInventory = () => {
  const [inventory, setInventoryState] = useState<Inventory>({
    dolares: 0,
    euros: 0,
    reales: 0,
    pesos: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const isDatabaseSyncingRef = useRef<boolean>(false);
  
  // Function to fetch inventory (only called at initialization)
  const fetchInventory = useCallback(async () => {
    if (isDatabaseSyncingRef.current) return;
    
    try {
      setIsLoading(true);
      isDatabaseSyncingRef.current = true;
      
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(4); // 4 currency types
      
      if (error) throw error;
      
      // Create inventory object
      const inventoryObj: Inventory = {
        dolares: 0,
        euros: 0,
        reales: 0,
        pesos: 0
      };
      
      // Group by currency and take the most recent one for each
      const currencyMap = new Map();
      (data || []).forEach(record => {
        if (!currencyMap.has(record.currency) || 
            new Date(record.last_updated) > new Date(currencyMap.get(record.currency).last_updated)) {
          currencyMap.set(record.currency, record);
        }
      });
      
      // Apply the most recent value for each currency
      currencyMap.forEach(record => {
        inventoryObj[record.currency as keyof Inventory] = record.amount;
      });
      
      setInventoryState(inventoryObj);
      lastSyncTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
      isDatabaseSyncingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // This sync function will be called on a timer
  const syncToDatabase = useCallback(async (currentInventory: Inventory) => {
    if (isDatabaseSyncingRef.current) return;
    
    try {
      isDatabaseSyncingRef.current = true;
      const timestamp = new Date().toISOString();
      
      // Create a batch of inserts
      const inventoryRecords = Object.entries(currentInventory).map(([currency, amount]) => ({
        currency,
        amount,
        last_updated: timestamp
      }));
      
      // Insert to Supabase
      const { error } = await supabase
        .from('inventory')
        .insert(inventoryRecords);
        
      if (error) throw error;
      
      lastSyncTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error syncing inventory to database:', error);
    } finally {
      isDatabaseSyncingRef.current = false;
    }
  }, []);

  const setInventory = useCallback((value: Inventory | ((prev: Inventory) => Inventory)) => {
    // Update local state immediately
    setInventoryState(prevInventory => {
      const newInventory = value instanceof Function ? value(prevInventory) : value;
      
      // Check if values actually changed before updating state
      if (JSON.stringify(newInventory) === JSON.stringify(prevInventory)) {
        return prevInventory; // Return the same object reference to prevent re-render
      }
      
      // Debounce database updates to prevent rapid updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Only sync to database if it's been at least 5 seconds since the last sync
      if (Date.now() - lastSyncTimeRef.current > 5000) {
        updateTimeoutRef.current = setTimeout(() => {
          syncToDatabase(newInventory);
        }, 1000);
      }
      
      return newInventory;
    });
  }, [syncToDatabase]);

  return { inventory, setInventory, isLoading };
};