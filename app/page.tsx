'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useClients, useTransactions, useExchangeRates , useInventory} from './hooks/useData';
import { Login, EmployeeDashboard } from './components/employee-interface';
import { supabase } from './lib/supabase';
import { useState, useMemo, useEffect } from 'react'
import { Client, Transaction, View, OrderStatus, CurrencyType, TransactionType, NewTransactionType,Inventory,ExchangeRates } from './types'
import * as XLSX from 'xlsx'
import { isAfter, subMonths } from 'date-fns'
import { useCallback } from 'react';
import SimpleExchangeRates from '@/app/exchange-rates';
import { AnalysisView } from './components/analysis-view';

const SHOW_TEST_BUTTON = process.env.NODE_ENV === 'development';
const handleTouchStart = (e: React.TouchEvent) => {
  e.preventDefault();
  const target = e.target as HTMLElement;
  target.click();
};

// OrdersView props
interface OrdersViewProps {
  rates: ExchangeRates;
  onRatesChange: (rates: ExchangeRates) => void;
  newTransaction: NewTransactionType;
  setNewTransaction: React.Dispatch<React.SetStateAction<NewTransactionType>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  clients: Client[];
  employees: string[];
}

// EmployeeView props
interface EmployeeViewProps {
  rates: ExchangeRates;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}


// TransactionHistory props
interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

// InventoryView props
interface InventoryViewProps {
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}


export default function Home() {
  const [view, setView] = useState<View>('orders')
  const { clients, setClients, updateClient } = useClients();
  const { transactions, setTransactions, addTransaction, updateTransaction } = useTransactions();
  const { rates: exchangeRates, setRates: setExchangeRates } = useExchangeRates();
  const { inventory, setInventory } = useInventory();
  const employees: string[] = ['Veneno', 'Chinda', 'Juan'];
  const [user, setUser] = useState<{ username: string; role: 'admin' | 'employee' } | null>(null);
  const [newTransaction, setNewTransaction] = useState<NewTransactionType>({
    type: 'buy',
    item: 'dolares',
    amount: 0,
    payment: 'pesos',
    paymentAmount: 0,
    employee: '',
    client: null
  });
  
  function ClientManagement() {
    const [formData, setFormData] = useState({
      name: '',
      address: '',
      phone: ''
    });
    const [editingClient, setEditingClient] = useState<Client | null>(null);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingClient) {
        // Update existing client
        await updateClient({ ...formData, id: editingClient.id });
        setEditingClient(null);
      } else {
        // Add new client
        const newClient = await setClients({ ...formData });
      }
      setFormData({ name: '', address: '', phone: '' });
    };
  
    const handleEdit = (client: Client) => {
      setEditingClient(client);
      setFormData({
        name: client.name,
        address: client.address,
        phone: client.phone
      });
    };
  
    const handleCancel = () => {
      setEditingClient(null);
      setFormData({ name: '', address: '', phone: '' });
    };
  
    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">
            {editingClient ? 'Editar Cliente' : 'Agregar Cliente'}
          </h2>
          <div className="space-y-4">
            <input
              required
              placeholder="Nombre"
              className="w-full p-2 border rounded"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <input
              required
              placeholder="Dirección"
              className="w-full p-2 border rounded"
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
            <input
              required
              placeholder="Teléfono"
              className="w-full p-2 border rounded"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
            <div className="flex gap-2">
              <button 
                type="submit"
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                {editingClient ? 'Guardar Cambios' : 'Agregar Cliente'}
              </button>
              {editingClient && (
                <button 
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
  
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Lista de Clientes</h2>
          <div className="space-y-2">
            {clients.map(client => (
              <div key={client.id} className="border p-2 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{client.name}</div>
                    <div className="text-sm text-gray-600">{client.address}</div>
                    <div className="text-sm text-gray-600">{client.phone}</div>
                  </div>
                  <button
                    onClick={() => handleEdit(client)}
                    className="bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  function ExchangeRatesInput({
    rates,
    editable = true, // Default: editable
    onRatesChange,
  }: {
    rates: ExchangeRates;
    editable?: boolean;
    onRatesChange?: (rates: ExchangeRates) => void;
  }) {
    const [rateInputs, setRateInputs] = useState(() => ({
      dolarToPeso: { buy: rates.dolarToPeso.buy.toString(), sell: rates.dolarToPeso.sell.toString() },
      euroToDolar: { buy: rates.euroToDolar.buy.toString(), sell: rates.euroToDolar.sell.toString() },
      realToDolar: { buy: rates.realToDolar.buy.toString(), sell: rates.realToDolar.sell.toString() },
    }));
  
    // Sync local state when parent rates change (only once or when rates deeply change)
    useEffect(() => {
      setRateInputs({
        dolarToPeso: { buy: rates.dolarToPeso.buy.toString(), sell: rates.dolarToPeso.sell.toString() },
        euroToDolar: { buy: rates.euroToDolar.buy.toString(), sell: rates.euroToDolar.sell.toString() },
        realToDolar: { buy: rates.realToDolar.buy.toString(), sell: rates.realToDolar.sell.toString() },
      });
    }, [rates]);
  
    const handleChange = (
      currency: keyof ExchangeRates,
      type: 'buy' | 'sell',
      value: string
    ) => {
      // Prevent updates if not editable
      if (!editable) return;
  
      // Allow only valid input (numbers with optional decimals)
      if (!/^\d*\.?\d*$/.test(value)) return;
  
      // Update local state
      setRateInputs((prev) => ({
        ...prev,
        [currency]: { ...prev[currency], [type]: value },
      }));
    };
  
    const handleBlur = (currency: keyof ExchangeRates, type: 'buy' | 'sell') => {
      if (!editable) return;
  
      const value = parseFloat(rateInputs[currency][type]) || 0;
  
      // Update local state with formatted number
      setRateInputs((prev) => ({
        ...prev,
        [currency]: { ...prev[currency], [type]: value.toString() },
      }));
  
      // Update parent state if onRatesChange is provided
      if (onRatesChange) {
        onRatesChange({
          ...rates,
          [currency]: {
            ...rates[currency],
            [type]: value,
          },
        });
      }
    };
  
    return (
      <div className="bg-white shadow rounded p-4 mb-4">
        <h3 className="font-semibold mb-3">Tasas de Cambio</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(rateInputs).map(([currency, values]) => (
            <div key={currency}>
              <label className="block text-sm text-gray-600">{currency.replace('To', ' to ')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Compra"
                    value={values.buy}
                    onChange={(e) => handleChange(currency as keyof ExchangeRates, 'buy', e.target.value)}
                    onBlur={() => handleBlur(currency as keyof ExchangeRates, 'buy')}
                    readOnly={!editable} // Make read-only if not editable
                    className={`w-full p-2 border rounded ${
                      editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-xs text-gray-500">Compra</span>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Venta"
                    value={values.sell}
                    onChange={(e) => handleChange(currency as keyof ExchangeRates, 'sell', e.target.value)}
                    onBlur={() => handleBlur(currency as keyof ExchangeRates, 'sell')}
                    readOnly={!editable} // Make read-only if not editable
                    className={`w-full p-2 border rounded ${
                      editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-xs text-gray-500">Venta</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  

  function OrdersView({
    rates,
    onRatesChange,
    newTransaction,
    setNewTransaction,
    transactions,
    setTransactions,
    clients,
    employees
  }: {
    rates: ExchangeRates;
    onRatesChange: (rates: ExchangeRates) => void;
    newTransaction: NewTransactionType;
    setNewTransaction: React.Dispatch<React.SetStateAction<NewTransactionType>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    clients: Client[];
    employees: string[];
  }) {
    const [formData, setFormData] = useState({
      searchTerm: '',
      amount: '',
      paymentAmount: '',
      notes: ''
    });
    const [showExtractionForm, setShowExtractionForm] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Transaction | null>(null);
    const [calculatedPaymentAmount, setCalculatedPaymentAmount] = useState(0);
  
    // Filter clients based on search term
    const filteredClients = useMemo(() => 
      clients.filter(client =>
        client.name.toLowerCase().includes(formData.searchTerm.toLowerCase())
      ),
      [clients, formData.searchTerm]
    );
  
    const calculatePaymentAmount = useCallback((
      amount: number,
      item: string,
      payment: string,
      type: TransactionType
    ): number => {
      // Return 0 for manual transactions as they don't need payment calculation
      if (type === 'manual') return 0;
      if (!amount || amount <= 0) return 0;
    
      try {
        let valueInUSD = amount;
    
        if (item === 'euros') {
          valueInUSD = amount * (type === 'buy' ? rates.euroToDolar.buy : rates.euroToDolar.sell);
        } else if (item === 'reales') {
          valueInUSD = amount * (type === 'buy' ? rates.realToDolar.buy : rates.realToDolar.sell);
        }
    
        if (payment === 'pesos') {
          return valueInUSD * (type === 'buy' ? rates.dolarToPeso.buy : rates.dolarToPeso.sell);
        } else if (payment === 'euros') {
          return valueInUSD / (type === 'buy' ? rates.euroToDolar.buy : rates.euroToDolar.sell);
        } else if (payment === 'reales') {
          return valueInUSD / (type === 'buy' ? rates.realToDolar.buy : rates.realToDolar.sell);
        }
    
        return valueInUSD;
      } catch (error) {
        console.error('Error calculating payment amount:', error);
        return 0;
      }
    }, [rates]);
  
    const handleCreateTransaction = async () => {
      if (!newTransaction.client || !formData.amount || !newTransaction.employee) return;
      
      try {
        const transaction = {
          type: newTransaction.type,
          item: newTransaction.item,
          amount: Number(formData.amount),
          payment: newTransaction.payment,
          payment_amount: calculatedPaymentAmount, // Change this to match Supabase
          paymentAmount: calculatedPaymentAmount,  // Keep this for local state
          employee: newTransaction.employee,
          client: newTransaction.client,
          status: 'pending' as OrderStatus,
          notes: formData.notes || undefined
        };
    
        if (editingOrder) {
          await updateTransaction({
            ...transaction,
            id: editingOrder.id
          });
          setEditingOrder(null);
        } else {
          await addTransaction(transaction);
        }
    
        // Reset form
        setFormData({
          searchTerm: '',
          amount: '',
          paymentAmount: '',
          notes: ''
        });
        
        setNewTransaction({
          type: 'buy',
          item: 'dolares',
          amount: 0,
          payment: 'pesos',
          paymentAmount: 0,
          employee: '',
          client: null
        });
    
        setCalculatedPaymentAmount(0);
      } catch (error) {
        console.error('Error creating transaction:', error);
      }
    };

    const handleCreateExtraction = async () => {
      if (!formData.amount || !newTransaction.employee) return;
      
      try {
        const transaction = {
          type: 'extraccion' as TransactionType,
          item: newTransaction.item,
          amount: Number(formData.amount),
          payment: newTransaction.item, // Same as item for extractions
          paymentAmount: Number(formData.amount), // Same as amount for extractions
          employee: newTransaction.employee,
          client: null,
          status: 'completed' as OrderStatus,
          notes: formData.notes || `Extracción por ${newTransaction.employee}`
        };
    
        await addTransaction(transaction);
    
        // Reset form
        setFormData({
          searchTerm: '',
          amount: '',
          paymentAmount: '',
          notes: ''
        });
        
        setNewTransaction({
          type: 'buy',
          item: 'dolares',
          amount: 0,
          payment: 'pesos',
          paymentAmount: 0,
          employee: '',
          client: null
        });
    
        setCalculatedPaymentAmount(0);
        setShowExtractionForm(false);
      } catch (error) {
        console.error('Error creating extraction:', error);
      }
    };
  
    const handleEdit = (transaction: Transaction) => {
      setEditingOrder(transaction);
      setFormData({
        searchTerm: '',
        amount: transaction.amount.toString(),
        paymentAmount: transaction.paymentAmount.toString(),
        notes: transaction.notes || ''
      });
      
      // Make sure to set all fields in newTransaction
      setNewTransaction({
        type: transaction.type,
        item: transaction.item,
        amount: transaction.amount,
        payment: transaction.payment,
        paymentAmount: transaction.paymentAmount,
        employee: transaction.employee,
        client: transaction.client
      });
    
      // Calculate the payment amount for the edited transaction
      const calculated = calculatePaymentAmount(
        transaction.amount,
        transaction.item,
        transaction.payment,
        transaction.type
      );
      setCalculatedPaymentAmount(calculated);
    };
    
    // Update calculated payment amount when relevant fields change
    useEffect(() => {
      const amount = Number(formData.amount);
      if (!isNaN(amount) && amount > 0 && newTransaction.type !== 'manual') {
        const calculated = calculatePaymentAmount(
          amount,
          newTransaction.item,
          newTransaction.payment,
          newTransaction.type
        );
        setCalculatedPaymentAmount(calculated);
      }
    }, [formData.amount, newTransaction.item, newTransaction.payment, newTransaction.type, calculatePaymentAmount]);
  
    return (
      <div className="w-full">
        {/* Mobile View - Shows only on mobile */}
        <div className="block md:hidden">
          <div className="mb-4 space-y-2 max-w-sm">
            <SimpleExchangeRates 
              rates={rates}
              onRatesChange={onRatesChange}
              editable={true}
            />
            <div className="mb-4 flex gap-2">

              <button
                onClick={() => setShowExtractionForm(false)}
                className={`px-4 py-2 rounded ${!showExtractionForm ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Orden Normal
              </button>
              <button
                onClick={() => setShowExtractionForm(true)}
                className={`px-4 py-2 rounded ${showExtractionForm ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Extracción
              </button>
            </div>
    
            {/* Your existing mobile layout */}
            {showExtractionForm ? (
  // Extraction Form
  <div className="bg-white shadow rounded-lg p-6">
    <h3 className="text-lg font-semibold mb-4">Nueva Extracción</h3>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Empleado</label>
        <select
        onTouchStart={handleTouchStart}
          className="w-full p-2 border rounded-lg"
          value={newTransaction.employee}
          onChange={(e) => setNewTransaction(prev => ({ ...prev, employee: e.target.value }))}
        >
          <option value="">Seleccionar empleado</option>
          {employees.map(emp => (
            <option key={emp} value={emp}>{emp}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Moneda</label>
        <select
        onTouchStart={handleTouchStart}
          className="w-full p-2 border rounded-lg"
          value={newTransaction.item}
          onChange={(e) => setNewTransaction(prev => ({
            ...prev,
            item: e.target.value as CurrencyType,
          }))}
        >
          <option value="dolares">Dólares</option>
          <option value="euros">Euros</option>
          <option value="reales">Reales</option>
          <option value="pesos">Pesos</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Cantidad</label>
        <input
          type="text"
          inputMode="decimal"
          className="w-full p-2 border rounded-lg"
          value={formData.amount}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d.]/g, '');
            setFormData(prev => ({ ...prev, amount: value }))
          }}
          placeholder="Cantidad"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          className="w-full p-2 border rounded-lg"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="Agregar notas adicionales..."
        />
      </div>

      <button
        onClick={handleCreateExtraction}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700
                 disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={!formData.amount || !newTransaction.employee}
      >
        Registrar Extracción
      </button>
    </div>
  </div>
) : (
  // Your existing regular transaction form
          <div className="bg-white shadow rounded-lg p-4">
            {/* Client and Employee Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Client Selection */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <div className="relative">
                  {newTransaction.client ? (
                    <div className="w-full p-2 border rounded bg-blue-50 flex justify-between items-center">
                      <div>
                        <span className="font-medium">{newTransaction.client.name}</span>
                        <span className="text-sm text-gray-600 ml-2">{newTransaction.client.phone}</span>
                      </div>
                      <button
                        className="text-gray-500 hover:text-red-500"
                        onClick={() => {
                          setNewTransaction(prev => ({ ...prev, client: null }));
                          setFormData(prev => ({ ...prev, searchTerm: '' }));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      className="w-full p-2 border rounded"
                      value={formData.searchTerm}
                      onChange={(e) => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
                    />
                  )}
                  
                  {/* Dropdown for search results */}
                  {!newTransaction.client && formData.searchTerm && filteredClients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                      {filteredClients.map(client => (
                        <div
                          key={client.id}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setNewTransaction(prev => ({ ...prev, client }));
                            setFormData(prev => ({ ...prev, searchTerm: '' }));
                          }}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-600">{client.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Empleado</label>
                <select
                onTouchStart={handleTouchStart}
                  className="w-full p-2 border rounded-lg"
                  value={newTransaction.employee}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, employee: e.target.value }))}
                >
                  <option value="">Seleccionar empleado</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transaction Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tipo de Operación</label>
              <select
              onTouchStart={handleTouchStart}
                className="w-full p-2 border rounded-lg"
                value={newTransaction.type}
                onChange={(e) => setNewTransaction(prev => ({
                  ...prev,
                  type: e.target.value as TransactionType,
                }))}
              >
                <option value="buy">Comprar</option>
                <option value="sell">Vender</option>
              </select>
            </div>

            {/* Currency Exchange Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Moneda</label>
                <select
                onTouchStart={handleTouchStart}
                  className="w-full p-2 border rounded-lg"
                  value={newTransaction.item}
                  onChange={(e) => setNewTransaction(prev => ({
                    ...prev,
                    item: e.target.value as CurrencyType,
                  }))}
                >
                  <option value="dolares">Dólares</option>
                  <option value="euros">Euros</option>
                  <option value="reales">Reales</option>
                  <option value="pesos">Pesos</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full mt-2 p-2 border rounded-lg"
                  value={formData.amount ? Number(formData.amount).toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    setFormData(prev => ({ ...prev, amount: value }))
                  }}
                  placeholder="Cantidad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pago</label>
                <select
                onTouchStart={handleTouchStart}
                  className="w-full p-2 border rounded-lg"
                  value={newTransaction.payment}
                  onChange={(e) => setNewTransaction(prev => ({
                    ...prev,
                    payment: e.target.value as CurrencyType,
                  }))}
                >
                  <option value="pesos">Pesos</option>
                  <option value="dolares">Dólares</option>
                  <option value="euros">Euros</option>
                  <option value="reales">Reales</option>
                </select>
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    className="w-full mt-2 p-2 border rounded-lg bg-gray-50"
                    value={calculatedPaymentAmount ? Number(calculatedPaymentAmount).toLocaleString('en-US') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[,.]/g, '');
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setCalculatedPaymentAmount(parseFloat(value) || 0);
                      }
                    }}
                    placeholder="Monto calculado/manual"
                  />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                className="w-full p-2 border rounded-lg"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Agregar notas adicionales..."
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleCreateTransaction}
                className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white py-4 px-8 
                          rounded-xl text-xl font-semibold shadow-lg
                          hover:from-blue-700 hover:to-blue-800 
                          disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                          transition-all duration-200"
                disabled={!newTransaction.client || !formData.amount || !newTransaction.employee}
              >
                {editingOrder ? 'Guardar Cambios' : 'Crear Orden'}
              </button>

              {editingOrder && (
                <button
                  onClick={() => {
                    setEditingOrder(null);
                    setFormData({
                      searchTerm: '',
                      amount: '',
                      paymentAmount: '',
                      notes: ''
                    });
                    setNewTransaction({
                      type: 'buy',
                      item: 'dolares',
                      amount: 0,
                      payment: 'pesos',
                      paymentAmount: 0,
                      employee: '',
                      client: null
                    });
                    setCalculatedPaymentAmount(0);
                  }}
                  className="flex-1 bg-gradient-to-br from-gray-500 to-gray-600 text-white py-4 px-8 
                            rounded-xl text-xl font-semibold shadow-lg
                            hover:from-gray-600 hover:to-gray-700
                            transition-all duration-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
          </div>
    
          {/* Pending Orders Section - Mobile */}
          <div className="bg-white shadow-xl rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Órdenes Pendientes</h2>
            <div className="space-y-6">
              {transactions
                .filter((t) => t.status === 'pending' && t.type !== ('extraccion' as TransactionType))
                .map((transaction) => (
                  <div key={transaction.id} 
                       className="border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-200
                                bg-gradient-to-br from-white to-gray-50">
                    {/* Your existing pending orders content */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-4">
                        <div>
                          <p className="text-2xl font-bold text-gray-800">{transaction.client!.name}</p>
                          <p className="text-lg text-gray-600">{transaction.client!.address}</p>
                          <p className="text-lg text-gray-600">{transaction.client!.phone}</p>
                        </div>
                        <div className="space-y-2">
                        <p className="text-xl">
                            <span className="font-medium">
                              {transaction.type === 'buy' ? 'Comprar' : 
                              transaction.type === 'sell' ? 'Vender' : 
                              transaction.type === 'extraccion' ? 'Extracción' : 
                              transaction.type}:
                            </span>{' '}
                            <span className="font-bold">
                              {Number(transaction.amount).toLocaleString('en-US')} {transaction.item}
                            </span>
                          </p>
                          <p className="text-xl">
                            <span className="font-medium">Pago:</span>{' '}
                            <span className="font-bold">
                              {Number(transaction.paymentAmount).toLocaleString('en-US')} {transaction.payment}
                            </span>
                          </p>
                          <p className="text-lg text-gray-600">
                            <span className="font-medium">Empleado:</span>{' '}
                            {transaction.employee}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingOrder(transaction);
                          setFormData({
                            searchTerm: '',
                            amount: transaction.amount.toString(),
                            paymentAmount: transaction.paymentAmount.toString(),
                            notes: transaction.notes || ''
                          });
                          setNewTransaction({
                            type: transaction.type,
                            item: transaction.item,
                            amount: transaction.amount,
                            payment: transaction.payment,
                            paymentAmount: transaction.paymentAmount,
                            employee: transaction.employee,
                            client: transaction.client
                          });
                        }}
                        className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 
                                 px-6 py-3 rounded-xl text-lg font-semibold
                                 hover:from-blue-200 hover:to-blue-300 
                                 transition-all duration-200 shadow-md"
                      >
                        Editar
                      </button>
                    </div>
                    {transaction.notes && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-700">{transaction.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              {transactions.filter(t => t.status === 'pending' && t.type !== 'extraccion' as TransactionType).length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-xl">
                    No hay órdenes pendientes
                  </div>
                )}
            </div>
          </div>
        </div>
    
        {/* Desktop View - Shows only on desktop */}
        <div className="hidden md:block">
          <div className="space-y-6">
            {/* Exchange Rates Row */}
            <div className="grid grid-cols-3 gap-6">
              <SimpleExchangeRates 
                rates={rates}
                onRatesChange={onRatesChange}
                editable={true}
              />
            </div>

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setShowExtractionForm(false)}
                className={`px-4 py-2 rounded ${!showExtractionForm ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Orden Normal
              </button>
              <button
                onClick={() => setShowExtractionForm(true)}
                className={`px-4 py-2 rounded ${showExtractionForm ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Extracción
              </button>
            </div>
    
            {/* Main Form Section */}
              {showExtractionForm ? (
                // Extraction Form
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Nueva Extracción</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Empleado</label>
                      <select
                      onTouchStart={handleTouchStart}
                        className="w-full p-2 border rounded-lg"
                        value={newTransaction.employee}
                        onChange={(e) => setNewTransaction(prev => ({ ...prev, employee: e.target.value }))}
                      >
                        <option value="">Seleccionar empleado</option>
                        {employees.map(emp => (
                          <option key={emp} value={emp}>{emp}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Moneda</label>
                      <select
                      onTouchStart={handleTouchStart}
                        className="w-full p-2 border rounded-lg"
                        value={newTransaction.item}
                        onChange={(e) => setNewTransaction(prev => ({
                          ...prev,
                          item: e.target.value as CurrencyType,
                        }))}
                      >
                        <option value="dolares">Dólares</option>
                        <option value="euros">Euros</option>
                        <option value="reales">Reales</option>
                        <option value="pesos">Pesos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Cantidad</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full p-2 border rounded-lg"
                        value={formData.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.]/g, '');
                          setFormData(prev => ({ ...prev, amount: value }))
                        }}
                        placeholder="Cantidad"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notas</label>
                      <textarea
                        className="w-full p-2 border rounded-lg"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        placeholder="Agregar notas adicionales..."
                      />
                    </div>

                    <button
                      onClick={handleCreateExtraction}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700
                              disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!formData.amount || !newTransaction.employee}
                    >
                      Registrar Extracción
                    </button>
                  </div>
                </div>
              ) : (
                // Your existing regular transaction form
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column - Client, Type, Currency */}
                    <div className="space-y-4">
                      {/* Client Selection */}
                      <div className="relative">
                        <label className="block text-sm font-medium mb-1">Cliente</label>
                        <div className="relative">
                          {newTransaction.client ? (
                            <div className="w-full p-2 border rounded bg-blue-50 flex justify-between items-center">
                              <div>
                                <span className="font-medium">{newTransaction.client.name}</span>
                                <span className="text-sm text-gray-600 ml-2">{newTransaction.client.phone}</span>
                              </div>
                              <button
                                className="text-gray-500 hover:text-red-500"
                                onClick={() => {
                                  setNewTransaction(prev => ({ ...prev, client: null }));
                                  setFormData(prev => ({ ...prev, searchTerm: '' }));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="Buscar cliente..."
                              className="w-full p-2 border rounded"
                              value={formData.searchTerm}
                              onChange={(e) => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
                            />
                          )}
                          
                          {/* Dropdown for search results */}
                          {!newTransaction.client && formData.searchTerm && filteredClients.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                              {filteredClients.map(client => (
                                <div
                                  key={client.id}
                                  className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => {
                                    setNewTransaction(prev => ({ ...prev, client }));
                                    setFormData(prev => ({ ...prev, searchTerm: '' }));
                                  }}
                                >
                                  <div className="font-medium">{client.name}</div>
                                  <div className="text-sm text-gray-600">{client.phone}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transaction Type */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Tipo de Operación</label>
                        <select
                        onTouchStart={handleTouchStart}
                          className="w-full p-2 border rounded-lg"
                          value={newTransaction.type}
                          onChange={(e) => setNewTransaction(prev => ({
                            ...prev,
                            type: e.target.value as TransactionType,
                          }))}
                        >
                          <option value="buy">Comprar</option>
                          <option value="sell">Vender</option>
                        </select>
                      </div>

                      {/* Currency and Amount */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Moneda</label>
                        <select
                        onTouchStart={handleTouchStart}
                          className="w-full p-2 border rounded-lg"
                          value={newTransaction.item}
                          onChange={(e) => setNewTransaction(prev => ({
                            ...prev,
                            item: e.target.value as CurrencyType,
                          }))}
                        >
                          <option value="dolares">Dólares</option>
                          <option value="euros">Euros</option>
                          <option value="reales">Reales</option>
                          <option value="pesos">Pesos</option>
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full mt-2 p-2 border rounded-lg"
                          value={formData.amount ? Number(formData.amount).toLocaleString('en-US') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            setFormData(prev => ({ ...prev, amount: value }))
                          }}
                          placeholder="Cantidad"
                        />
                      </div>
                    </div>

                    {/* Right Column - Employee, Payment, Notes */}
                    <div className="space-y-4">
                      {/* Employee Selection */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Empleado</label>
                        <select
                        onTouchStart={handleTouchStart}
                          className="w-full p-2 border rounded-lg"
                          value={newTransaction.employee}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, employee: e.target.value }))}
                        >
                          <option value="">Seleccionar empleado</option>
                          {employees.map(emp => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Type and Amount */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Pago</label>
                        <select
                        onTouchStart={handleTouchStart}
                          className="w-full p-2 border rounded-lg"
                          value={newTransaction.payment}
                          onChange={(e) => setNewTransaction(prev => ({
                            ...prev,
                            payment: e.target.value as CurrencyType,
                          }))}
                        >
                          <option value="pesos">Pesos</option>
                          <option value="dolares">Dólares</option>
                          <option value="euros">Euros</option>
                          <option value="reales">Reales</option>
                        </select>
                        <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            className="w-full mt-2 p-2 border rounded-lg bg-gray-50"
                            value={calculatedPaymentAmount ? Number(calculatedPaymentAmount).toLocaleString('en-US') : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[,.]/g, '');
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setCalculatedPaymentAmount(parseFloat(value) || 0);
                              }
                            }}
                            placeholder="Monto calculado/manual"
                          />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Notas</label>
                        <textarea
                          className="w-full p-2 border rounded-lg"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          placeholder="Agregar notas adicionales..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-4">
                    <button
                      onClick={handleCreateTransaction}
                      className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white py-4 px-8 
                                rounded-xl text-xl font-semibold shadow-lg
                                hover:from-blue-700 hover:to-blue-800 
                                disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                                transition-all duration-200"
                      disabled={!newTransaction.client || !formData.amount || !newTransaction.employee}
                    >
                      {editingOrder ? 'Guardar Cambios' : 'Crear Orden'}
                    </button>

                    {editingOrder && (
                      <button
                        onClick={() => {
                          setEditingOrder(null);
                          setFormData({
                            searchTerm: '',
                            amount: '',
                            paymentAmount: '',
                            notes: ''
                          });
                          setNewTransaction({
                            type: 'buy',
                            item: 'dolares',
                            amount: 0,
                            payment: 'pesos',
                            paymentAmount: 0,
                            employee: '',
                            client: null
                          });
                          setCalculatedPaymentAmount(0);
                        }}
                        className="flex-1 bg-gradient-to-br from-gray-500 to-gray-600 text-white py-4 px-8 
                                  rounded-xl text-xl font-semibold shadow-lg
                                  hover:from-gray-600 hover:to-gray-700
                                  transition-all duration-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
    
            {/* Pending Orders Section - Desktop */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Órdenes Pendientes</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {transactions
                  .filter((t) => t.status === 'pending' && t.type !== 'extraccion' as TransactionType)
                  .map((transaction) => (
                    <div key={transaction.id} 
                         className="border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-200
                                  bg-gradient-to-br from-white to-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4">
                          <div>
                            <p className="text-2xl font-bold text-gray-800">{transaction.client!.name}</p>
                            <p className="text-lg text-gray-600">{transaction.client!.address}</p>
                            <p className="text-lg text-gray-600">{transaction.client!.phone}</p>
                          </div>
                          <div className="space-y-2">
                          <p className="text-xl">
                              <span className="font-medium">
                                {transaction.type === 'buy' ? 'Comprar' : 
                                transaction.type === 'sell' ? 'Vender' : 
                                transaction.type === 'extraccion' ? 'Extracción' : 
                                transaction.type}:
                              </span>{' '}
                              <span className="font-bold">
                                {Number(transaction.amount).toLocaleString('en-US')} {transaction.item}
                              </span>
                            </p>
                            <p className="text-xl">
                              <span className="font-medium">Pago:</span>{' '}
                              <span className="font-bold">
                                {Number(transaction.paymentAmount).toLocaleString('en-US')} {transaction.payment}
                              </span>
                            </p>
                            <p className="text-lg text-gray-600">
                              <span className="font-medium">Empleado:</span>{' '}
                              {transaction.employee}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingOrder(transaction);
                            setFormData({
                              searchTerm: '',
                              amount: transaction.amount.toString(),
                              paymentAmount: transaction.paymentAmount.toString(),
                              notes: transaction.notes || ''
                            });
                            setNewTransaction({
                              type: transaction.type,
                              item: transaction.item,
                              amount: transaction.amount,
                              payment: transaction.payment,
                              paymentAmount: transaction.paymentAmount,
                              employee: transaction.employee,
                              client: transaction.client
                            });
                          }}
                          className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 
                                   px-6 py-3 rounded-xl text-lg font-semibold
                                   hover:from-blue-200 hover:to-blue-300 
                                   transition-all duration-200 shadow-md"
                        >
                          Editar
                        </button>
                      </div>
                      {transaction.notes && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-gray-700">{transaction.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                {transactions.filter(t => t.status === 'pending' && t.type !== 'extraccion' as TransactionType).length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-xl">
                    No hay órdenes pendientes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}

  function EmployeeView({
    rates,
    transactions,
    setTransactions,
    inventory,
    setInventory,
  }: {
    rates: ExchangeRates;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    inventory: Inventory;
    setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  }) {
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [statusNote, setStatusNote] = useState<string>('');
    const [paymentCollector, setPaymentCollector] = useState<string>('');
    const employeeOrders = transactions?.filter(t => 
      t.employee === selectedEmployee && 
      t.status === 'pending' && 
      t.type !== ('extraccion' as TransactionType)
    );
  
    const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
      try {
        const transaction = transactions.find(t => t.id === orderId);
        if (!transaction) {
          console.error('Transaction not found:', orderId);
          return;
        }
    
        const timestamp = new Date().toISOString();
        const updatedTransaction = {
          status: newStatus,
          notes: statusNote || transaction.notes || null,
          payment_amount: transaction.paymentAmount,
          completed_at: newStatus === 'completed' ? timestamp : null // Only set completed_at when status is 'completed'
        };
    
        console.log('Updating transaction with:', updatedTransaction);
    
        // Update in Supabase
        const { data, error } = await supabase
          .from('transactions')
          .update(updatedTransaction)
          .eq('id', orderId)
          .select()
          .single();
    
        if (error) {
          console.error('Supabase update error details:', error);
          throw error;
        }
    
        // Update local state
        setTransactions(prev => prev.map(t => 
          t.id === orderId 
            ? {
                ...t,
                status: newStatus,
                notes: statusNote || t.notes || undefined,
                completedAt: newStatus === 'completed' ? timestamp : null
              }
            : t
        ));
    
        setStatusNote('');
      } catch (error) {
        console.error('Full error details:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
        }
      }
    };
    
    const completeDelayedPayment = async (
      transaction: Transaction,
      collectorEmployee: string,
      completionNote: string
    ) => {
      try {
        const existingNotes = transaction.notes || '';
        const newNote = completionNote 
          ? `\nPago completado por ${collectorEmployee}: ${completionNote}` 
          : `\nPago completado por ${collectorEmployee}`;
        
        // Only include fields we know exist in the database
        const supabaseTransaction = {
          status: 'completed' as OrderStatus,
          notes: existingNotes + newNote,
          payment_collector: collectorEmployee
        };
    
        console.log('Updating transaction:', supabaseTransaction);
    
        const { error } = await supabase
          .from('transactions')
          .update(supabaseTransaction)
          .eq('id', transaction.id);
    
        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
    
        // Update local states
        // Update local states
          setInventory(prev => ({
            ...prev,
            [transaction.payment]: prev[transaction.payment] + 
              (transaction.type === 'buy' ? -transaction.paymentAmount : 
              transaction.type === 'sell' ? transaction.paymentAmount : 
              transaction.type === 'extraccion' ? -transaction.paymentAmount : 0)
          }));
    
        setTransactions(prev => prev.map(t => {
          if (t.id === transaction.id) {
            return {
              ...t,
              status: 'completed',
              paymentCollector: collectorEmployee,
              notes: existingNotes + newNote
            };
          }
          return t;
        }));
    
        setStatusNote('');
        setPaymentCollector('');
    
      } catch (error) {
        console.error('Error completing delayed payment:', error);
        alert('Error al completar el pago. Por favor, intente nuevamente.');
      }
    };
    
    
    // Get all pending payment transactions
    const pendingPayments = transactions.filter(t => t.status === 'payment_delayed');
    
    return (
      <div className="space-y-6">
        <ExchangeRatesInput rates={rates} editable={false} />
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Vista Empleado</h2>
          <select 
          onTouchStart={handleTouchStart}
            className="w-full p-2 border rounded mb-4"
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
          >
            <option value="">Seleccionar empleado</option>
            {employees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
    
          {/* Pending Orders Section */}
          {selectedEmployee && (
            <>
              <h3 className="font-semibold mb-4">Órdenes pendientes para {selectedEmployee}</h3>
              {employeeOrders.map(order => (
                <div key={order.id} className="border p-4 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{order.client!.name}</p>
                      <p className="text-sm text-gray-600">{order.client!.address}</p>
                      <p className="text-sm text-gray-600">{order.client!.phone}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                      Pendiente
                    </span>
                  </div>
                  <div className="my-2">
                    <p>
                      {order.type === 'buy' ? 'Comprar' : 'Vender'} {order.amount} {order.item}
                    </p>
                    <p>Pago: {order.paymentAmount} {order.payment}</p>
                  </div>
                  {/* Add this to show the original notes */}
                  {order.notes && (
                    <div className="my-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm font-semibold">Notas:</p>
                      <p className="text-sm text-gray-600">{order.notes}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Notas (opcional)"
                      className="w-full p-2 border rounded"
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                    <button
                        onClick={async () => await updateOrderStatus(order.id, 'completed')}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex-1"
                      >
                        Completada
                      </button>
                      <button
                        onClick={async () => await updateOrderStatus(order.id, 'cancelled')}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex-1"
                      >
                        Cancelada
                      </button>
                      <button
                        onClick={async () => await updateOrderStatus(order.id, 'payment_delayed')}
                        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex-1"
                      >
                        Pago Demorado
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
    
        {/* New Pending Payments Section */}
        <div className="bg-white shadow rounded p-4">
          <h3 className="text-lg font-semibold mb-4">Pagos Pendientes</h3>
          <div className="space-y-4">
            {pendingPayments.map((transaction) => (
              <div key={transaction.id} className="border p-4 rounded bg-yellow-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{transaction.client!.name}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.type === 'buy' ? 'Compra' : 
                      transaction.type === 'sell' ? 'Venta' : 
                      transaction.type === 'extraccion' ? 'Extracción' : 
                      transaction.type} {transaction.amount} {transaction.item}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pago pendiente: {transaction.paymentAmount} {transaction.payment}
                    </p>
                    {transaction.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-semibold">Notas originales:</p>
                        <p className="text-sm text-gray-600">{transaction.notes}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-yellow-600 text-sm">
                    Registrado por: {transaction.delayedBy}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2">
                  <select
                  onTouchStart={handleTouchStart}
                    className="w-full p-2 border rounded"
                    value={paymentCollector}
                    onChange={(e) => setPaymentCollector(e.target.value)}
                  >
                    <option value="">Seleccionar empleado que recibió el pago</option>
                    {['Veneno', 'Chinda', 'Juan'].map((emp) => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Notas de completación (opcional)"
                    className="w-full p-2 border rounded"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                  
                  <button
                    onClick={() => {
                      if (paymentCollector) {
                        completeDelayedPayment(transaction, paymentCollector, statusNote);
                        setPaymentCollector('');
                        setStatusNote('');
                      }
                    }}
                    disabled={!paymentCollector}
                    className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 
                             disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Marcar Pago Completado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function InventoryView({
    inventory,
    setInventory,
    transactions,
    setTransactions,
  }: {
    inventory: Inventory;
    setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  }) {
    // State declarations
    const [currentInventory, setCurrentInventory] = useState<Inventory>({
      dolares: 0,
      euros: 0,
      reales: 0,
      pesos: 0
    });
  
    const [transactionNotes, setTransactionNotes] = useState<Record<string | number, string>>({});
    
    const [adjustmentsInput, setAdjustmentsInput] = useState<Record<keyof Inventory, string>>(() =>
      Object.fromEntries(Object.keys(inventory).map((key) => [key, ''])) as Record<keyof Inventory, string>
    );
  
    // Calculate Inventory function
    const calculateInventory = useCallback(async (): Promise<Inventory> => {
      const current: Inventory = {
        dolares: 0,
        euros: 0,
        reales: 0,
        pesos: 0
      };
      console.log('Starting inventory calculation');
      
      transactions
        .sort((a, b) => a.id - b.id)
        .forEach(t => {
          if (t.status === 'completed') {
            console.log('Processing transaction:', {
              id: t.id,
              type: t.type,
              item: t.item,
              amount: t.amount,
              payment: t.payment,
              paymentAmount: t.paymentAmount
            });
            
            if (t.type === 'manual') {
              current[t.item] += Number(t.amount) || 0;
              console.log(`Manual adjustment: ${t.item} += ${t.amount}`);
            } else if (t.type === 'extraccion'as TransactionType) {
              current[t.item] -= Number(t.amount) || 0;
              console.log(`Extraction: ${t.item} -= ${t.amount}`);
            } else if (t.type === 'buy') {
              current[t.item] -= Number(t.amount) || 0;
              current[t.payment] += Number(t.paymentAmount) || 0;
              console.log(`Buy: ${t.item} -= ${t.amount}, ${t.payment} += ${t.paymentAmount}`);
            } else if (t.type === 'sell') {
              current[t.item] += Number(t.amount) || 0;
              current[t.payment] -= Number(t.paymentAmount) || 0;
              console.log(`Sell: ${t.item} += ${t.amount}, ${t.payment} -= ${t.paymentAmount}`);
            }
            console.log('Current totals:', {...current});
          }
        });
        
      console.log('Final inventory:', current);
      
      try {
        const timestamp = new Date().toISOString();
        const inventoryRecords = Object.entries(current).map(([currency, amount]) => ({
          currency,
          amount,
          last_updated: timestamp
        }));
        
        console.log('Saving inventory to Supabase:', inventoryRecords);
        
        const { error } = await supabase
          .from('inventory')
          .insert(inventoryRecords);
          
        if (error) {
          console.error('Error saving inventory to Supabase:', error);
        }
      } catch (error) {
        console.error('Failed to save inventory:', error);
      }
      
      return current;
    }, [transactions]); // Add transactions as a dependency
    
    // Then the useEffect remains almost the same
    useEffect(() => {
      const updateInventory = async () => {
        const calculated = await calculateInventory();
        setCurrentInventory(calculated);
      };
      updateInventory();
    }, [calculateInventory]);
  
    // Update transaction note function
    const updateTransactionNote = (transactionId: number, note: string) => {
      setTransactions(prev => prev.map(t => 
        t.id === transactionId 
          ? { ...t, notes: t.notes ? `${t.notes}\nNota adicional: ${note}` : `Nota adicional: ${note}` }
          : t
      ));
      setTransactionNotes(prev => ({ ...prev, [transactionId]: '' }));
    };
  
    // Today's transactions memo
    const todaysTransactions = useMemo(() => {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      return transactions
        .filter(t => {
          const transactionDate = new Date(t.created_at || t.id);
          return transactionDate >= startOfToday && transactionDate <= endOfToday;
        })
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.id);
          const dateB = new Date(b.created_at || b.id);
          return dateB.getTime() - dateA.getTime();
        });
    }, [transactions]);
  
    // Apply adjustment function
    const applyAdjustment = async (item: keyof Inventory) => {
      const newValue = parseInt(adjustmentsInput[item], 10);
      
      if (!isNaN(newValue)) {
        const difference = newValue - currentInventory[item];
        
        if (difference !== 0) {
          try {
            // Create the Supabase transaction first
            const supabaseTransaction = {
              type: 'manual',
              item: item,
              amount: difference,
              payment: 'pesos',
              payment_amount: 0,  // Note: using snake_case for Supabase
              employee: 'Sistema',
              client_id: null,
              status: 'completed',
              notes: `Ajuste manual: ${difference > 0 ? 'añadidos' : 'restados'} ${Math.abs(difference)} ${item}`,
              created_at: new Date().toISOString()
            };
    
            console.log('Saving manual adjustment to Supabase:', supabaseTransaction);
            
            const { data, error } = await supabase
              .from('transactions')
              .insert([supabaseTransaction])
              .select();
    
            if (error) {
              console.error('Supabase error:', error);
              throw error;
            }
    
            console.log('Supabase response:', data);
    
            if (data && data[0]) {
              // Create the local transaction with the ID from Supabase
              const newTransaction: Transaction = {
                id: data[0].id,
                type: 'manual',
                item: item as CurrencyType,
                amount: difference,
                payment: 'pesos',
                paymentAmount: 0,
                employee: 'Sistema',
                client: null,
                status: 'completed',
                notes: supabaseTransaction.notes,
                created_at: supabaseTransaction.created_at
              };
    
              // Update local state
              setTransactions(prev => [newTransaction, ...prev]);
            }
    
            // Clear input
            setAdjustmentsInput(prev => ({ ...prev, [item]: '' }));
    
          } catch (error) {
            console.error('Error in applyAdjustment:', error);
            alert('Error al guardar el ajuste manual. Por favor, intente nuevamente.');
          }
        }
      }
    };
  
    // Component render
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Inventario</h2>
        </div>
  
        {/* Current Inventory with Manual Adjustment Controls */}
        <div className="bg-white shadow rounded p-4">
          <h3 className="font-semibold mb-4">Inventario Actual</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Top row */}
            <div className="p-3 border rounded">
              <div className="font-medium capitalize">pesos</div>
              <div className={`text-lg ${currentInventory.pesos < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(currentInventory.pesos).toLocaleString('en-US')}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nuevo Total"
                  value={adjustmentsInput['pesos'] || ''}
                  onChange={(e) => {
                    if (/^-?\d*$/.test(e.target.value)) {
                      setAdjustmentsInput(prev => ({ ...prev, pesos: e.target.value }));
                    }
                  }}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => applyAdjustment('pesos')}
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Aplicar
                </button>
              </div>
            </div>
    
            <div className="p-3 border rounded">
              <div className="font-medium capitalize">dolares</div>
              <div className={`text-lg ${currentInventory.dolares < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(currentInventory.dolares).toLocaleString('en-US')}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nuevo Total"
                  value={adjustmentsInput['dolares'] || ''}
                  onChange={(e) => {
                    if (/^-?\d*$/.test(e.target.value)) {
                      setAdjustmentsInput(prev => ({ ...prev, dolares: e.target.value }));
                    }
                  }}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => applyAdjustment('dolares')}
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Aplicar
                </button>
              </div>
            </div>
    
            {/* Bottom row */}
            <div className="p-3 border rounded">
              <div className="font-medium capitalize">euros</div>
              <div className={`text-lg ${currentInventory.euros < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(currentInventory.euros).toLocaleString('en-US')}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nuevo Total"
                  value={adjustmentsInput['euros'] || ''}
                  onChange={(e) => {
                    if (/^-?\d*$/.test(e.target.value)) {
                      setAdjustmentsInput(prev => ({ ...prev, euros: e.target.value }));
                    }
                  }}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => applyAdjustment('euros')}
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Aplicar
                </button>
              </div>
            </div>
    
            <div className="p-3 border rounded">
              <div className="font-medium capitalize">reales</div>
              <div className={`text-lg ${currentInventory.reales < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(currentInventory.reales).toLocaleString('en-US')}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nuevo Total"
                  value={adjustmentsInput['reales'] || ''}
                  onChange={(e) => {
                    if (/^-?\d*$/.test(e.target.value)) {
                      setAdjustmentsInput(prev => ({ ...prev, reales: e.target.value }));
                    }
                  }}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => applyAdjustment('reales')}
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
  
        {/* Today's Transactions Section */}
        <div className="bg-white shadow rounded p-4">
          <h3 className="font-semibold mb-4">Transacciones de Hoy</h3>
          <div className="space-y-4">
            {todaysTransactions.map((t) => (
              <div
                key={t.id}
                className={`border p-3 rounded ${
                  t.status === 'completed' ? 'bg-green-50' :
                  t.status === 'cancelled' ? 'bg-red-50' : 'bg-yellow-50'
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">
                      {t.type === 'manual' ? 'Ajuste Manual' :
                       t.type === 'buy' ? 'Compra' : 'Venta'} {t.amount} {t.item}
                    </span>
                    {t.client && (
                      <div className="text-sm text-gray-600">
                        Cliente: {t.client.name}
                      </div>
                    )}
                    {t.notes && (
                      <div className="text-sm text-gray-600">{t.notes}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      t.status === 'completed' ? 'text-green-600' :
                      t.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {t.status === 'completed' ? 'Completada' :
                       t.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(t.id).toLocaleTimeString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Agregar nota adicional"
                    value={transactionNotes[t.id] || ''}
                    onChange={(e) => setTransactionNotes(prev => ({
                      ...prev,
                      [t.id]: e.target.value
                    }))}
                    className="w-full p-2 border rounded"
                  />
                  <button
                    onClick={() => updateTransactionNote(t.id, transactionNotes[t.id])}
                    className="mt-1 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    disabled={!transactionNotes[t.id]}
                  >
                    Agregar Nota
                  </button>
                </div>
              </div>
            ))}
  
            {todaysTransactions.length === 0 && (
              <div className="text-gray-500 text-center py-4">
                No hay transacciones hoy
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  function TransactionHistory({ 
    transactions, 
    setTransactions 
  }: { 
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  }) {
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Calculate old transactions (older than 3 months)
    const oldTransactions = useMemo((): Transaction[] => {
      const threeMonthsAgo = subMonths(new Date(), 3);
      return transactions.filter(t => 
        !isAfter(new Date(t.created_at || t.id), threeMonthsAgo)
      );
    }, [transactions]);

    const oldTransactionsExist = oldTransactions.length > 0;
    const oldTransactionsCount = oldTransactions.length;

    const handleExportAllToExcel = () => {
      const data = [
        ['Historial Completo de Transacciones'],
        ['Fecha', 'Tipo', 'Cliente', 'Item', 'Cantidad', 'Método de Pago', 'Monto', 'Empleado', 'Estado', 'Notas'],
        ...transactions.map((t: Transaction) => [
          new Date(t.id).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          t.type === 'manual' ? 'Ajuste Manual' : t.type === 'buy' ? 'Compra' : 'Venta',
          t.client?.name || '',
          t.item,
          t.amount,
          t.payment,
          t.paymentAmount,
          t.employee,
          t.status,
          t.notes || ''
        ])
      ];
    
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
      XLSX.writeFile(wb, `Todas_Las_Transacciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

  // Filter to keep only last 3 months of transactions
  const activeTransactions = useMemo((): Transaction[] => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return transactions.filter(t => new Date(t.created_at || t.id) > threeMonthsAgo);
  }, [transactions]);

  // Group transactions by selected time period

// Helper function to get proper date from transaction
const getTransactionDate = (transaction: Transaction): Date => {
  // Try created_at first
  if (transaction.created_at) {
    const date = new Date(transaction.created_at);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Fall back to id if it's a timestamp
  if (transaction.id) {
    const date = new Date(transaction.id);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1970) return date;
  }
  
  // If all else fails, return current date
  return new Date();
};

// Update your groupedTransactions code
const groupedTransactions = useMemo(() => {
  const groups: Record<string, Transaction[]> = {};
  
  activeTransactions.forEach((transaction: Transaction) => {
    const date = getTransactionDate(transaction);
    let groupKey = '';
    
    switch (groupBy) {
      case 'day':
        groupKey = date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        break;
      case 'week':
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        groupKey = `Semana del ${monday.toLocaleDateString('es-ES')}`;
        break;
      case 'month':
        groupKey = date.toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long' 
        });
        break;
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    
    groups[groupKey].push(transaction);
  });

  // Sort transactions within each group
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => {
      const dateA = getTransactionDate(a);
      const dateB = getTransactionDate(b);
      return dateB.getTime() - dateA.getTime();
    });
  });

  return groups;
}, [activeTransactions, groupBy]);

  const handleArchiveOldTransactions = async () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const oldTransactions = transactions.filter((t: Transaction) => new Date(t.id) <= threeMonthsAgo);
    
    if (oldTransactions.length > 0) {
        const filename = `Transacciones_Antiguas_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Explicitly type the data array
        const data: (string | number)[][] = [
            ['Historial de Transacciones'],
            ['Fecha', 'Tipo', 'Cliente', 'Item', 'Cantidad', 'Método de Pago', 'Monto', 'Empleado', 'Estado', 'Notas'],
            ...oldTransactions.map((t: Transaction) => [
                new Date(t.id).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }),
                t.type === 'manual' ? 'Ajuste Manual' : t.type === 'buy' ? 'Compra' : 'Venta',
                t.client?.name || '',
                t.item,
                t.amount,
                t.payment,
                t.paymentAmount,
                t.employee,
                t.status,
                t.notes || ''
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
        XLSX.writeFile(wb, filename);

        // Update transactions in Supabase
        const { error } = await supabase
            .from('transactions')
            .update({ 
                archived: true,
                archive_date: new Date().toISOString(),
                archive_filename: filename
            })
            .in('id', oldTransactions.map(t => t.id));

        if (error) {
            console.error('Error updating archived status:', error);
            return;
        }

        setTransactions(transactions.filter(t => new Date(t.id) > threeMonthsAgo));
      }
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <select
          onTouchStart={handleTouchStart}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
            className="border rounded p-2"
          >
            <option value="day">Por Día</option>
            <option value="week">Por Semana</option>
            <option value="month">Por Mes</option>
          </select>
          <button
            onClick={handleExportAllToExcel}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Exportar Todo
          </button>
          <button
            onClick={handleArchiveOldTransactions}
            className={`px-4 py-2 rounded text-white ${
              oldTransactionsExist ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!oldTransactionsExist}
          >
            Archivar Transacciones Antiguas
            {oldTransactionsExist && <span className="ml-2">({oldTransactionsCount})</span>}
          </button>
        </div>
      </div>
      {Object.entries(groupedTransactions).sort(([dateA]: [string, Transaction[]]) => {
        if (!dateA) return 0;
        const dateParts = dateA.split('/').map(Number);
        if (dateParts.length < 3) return 0;
        const [dayA, monthA, yearA] = dateParts;
        const dateAObj = new Date(yearA, monthA - 1, dayA);
        return -dateAObj.getTime();
      }).map(([date, groupTransactions]: [string, Transaction[]]) => (
        <div key={date} className="bg-white shadow rounded p-4">
          <button
            onClick={() => {
              const newExpanded = new Set(expandedGroups);
              if (newExpanded.has(date)) {
                newExpanded.delete(date);
              } else {
                newExpanded.add(date);
              }
              setExpandedGroups(newExpanded);
            }}
            className="w-full text-left font-medium p-2 hover:bg-gray-50 rounded"
          >
            {date} ({groupTransactions.length} transacciones)
          </button>

          {expandedGroups.has(date) && (
            <div className="mt-2 space-y-2">
              {groupTransactions
                .sort((a, b) => b.id - a.id)
                .map(t => (
                  <div
                    key={t.id}
                    className={`border p-3 rounded ${
                      t.status === 'completed' ? 'bg-green-50' :
                      t.status === 'cancelled' ? 'bg-red-50' : 'bg-yellow-50'
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <span className="font-medium">
                          {t.type === 'manual' ? 'Ajuste Manual' :
                           t.type === 'buy' ? 'Compra' : 'Venta'}
                        </span>
                        <div className="text-sm text-gray-600">
                          {t.type === 'manual' ? (
                            <p>{t.amount > 0 ? 'Añadidos' : 'Restados'} {Math.abs(t.amount)} {t.item}</p>
                          ) : (
                            <>
                              <p>Cliente: {t.client?.name}</p>
                              <p>{t.amount} {t.item} {t.type === 'buy' ? 'por' : 'a cambio de'} {t.paymentAmount} {t.payment}</p>
                              <p>Empleado: {t.employee}</p>
                            </>
                          )}
                          {t.notes && <p className="mt-1"><strong>Notas:</strong> {t.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          t.status === 'completed' ? 'text-green-600' :
                          t.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {t.status === 'completed' ? 'Completada' :
                           t.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(t.id).toLocaleTimeString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
  }

  useEffect(() => {
    console.log("All transactions:", transactions);
    console.log("Completed transactions:", transactions.filter(t => t.status === 'completed'));
    console.log("Current inventory:", inventory);
  }, [transactions, inventory]);


   // Add the authentication checks before the main return
   if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.role === 'employee') {
    return (
      <EmployeeDashboard
        username={user.username}
        rates={exchangeRates}
        transactions={transactions}
        setTransactions={setTransactions}
      />
    );
  }

  // Main return statement for the admin interface
return (
  <main className="min-h-screen bg-gray-50">
    <div className="p-4 w-full mx-auto max-w-screen-lg lg:max-w-screen-xl">
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">Blue Eyes</h1>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-3">
            <button
              onClick={() => setView('orders')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Órdenes
            </button>
            <button
              onClick={() => setView('clients')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'clients' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setView('employees')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'employees' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Empleados
            </button>
            <button
              onClick={() => setView('inventory')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'inventory' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inventario
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'history' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Historial
            </button>
            <button
              onClick={() => setView('analysis')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'analysis' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Análisis
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden w-full">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setView('orders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  view === 'orders' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Órdenes
              </button>
              <button
                onClick={() => setView('clients')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  view === 'clients' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setView('employees')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  view === 'employees' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Empleados
              </button>
              <button
                onClick={() => setView('inventory')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  view === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Inventario
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium col-span-2 ${
                  view === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Historial
              </button>
              <button
              onClick={() => setView('analysis')}
              className={`px-4 py-2 rounded-lg text-sm font-medium col-span-2 ${
                view === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Análisis
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Views with responsive wrappers */}
        <div className="w-full bg-white rounded-lg shadow-sm p-4">
          {view === 'orders' ? (
            <div className="w-full">
              <OrdersView
                rates={exchangeRates}
                onRatesChange={setExchangeRates}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                transactions={transactions}
                setTransactions={setTransactions}
                clients={clients}
                employees={employees}
              />
            </div>
          ) : view === 'clients' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClientManagement />
            </div>
          ) : view === 'employees' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmployeeView
                transactions={transactions}
                setTransactions={setTransactions}
                inventory={inventory}
                setInventory={setInventory}
                rates={exchangeRates}
              />
            </div>
          ) : view === 'history' ? (
            <div className="w-full">
              <TransactionHistory
                transactions={transactions}
                setTransactions={setTransactions}
              />
            </div>
          ) : view === 'analysis' ? (
            <div className="w-full">
              <AnalysisView
                transactions={transactions}
                inventory={inventory}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InventoryView
                inventory={inventory}
                setInventory={setInventory}
                transactions={transactions}
                setTransactions={setTransactions}
              />
            </div>
          )}
        </div>

      {/* Logout button */}
      <button
        onClick={() => setUser(null)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-600 z-10"
      >
        Cerrar Sesión
      </button>
    </div>
  </main>
);
}