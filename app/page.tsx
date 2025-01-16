'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from 'react'
import { Client, Transaction, View, OrderStatus, CurrencyType, TransactionType, NewTransactionType,Inventory,ExchangeRates } from './types'
import * as XLSX from 'xlsx'
import { generateTestData } from './testData'
import { isAfter, subMonths } from 'date-fns'
import { useCallback } from 'react';

const SHOW_TEST_BUTTON = process.env.NODE_ENV === 'development';

export default function Home() {
  const [view, setView] = useState<View>('orders')
  const [clients, setClients] = useState<Client[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<Inventory>({
    dolares: 0,
    euros: 0,
    reales: 0,
    pesos: 0
  });

  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    dolarToPeso: { buy: 0.0, sell: 0.0 },
    euroToDolar: { buy: 0.0, sell: 0.0 },
    realToDolar: { buy: 0.0, sell: 0.0 },
  });
  
 
  const employees = ['Veneno', 'Chinda', 'Juan']

  
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
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingClient) {
        // Update existing client
        setClients(prev => prev.map(client => 
          client.id === editingClient.id 
            ? { ...formData, id: client.id }
            : client
        ));
        setEditingClient(null);
      } else {
        // Add new client
        setClients(prev => [...prev, { ...formData, id: Date.now() }]);
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
  
    const handleCreateTransaction = () => {
      if (!newTransaction.client || !formData.amount || !newTransaction.employee) return;
      
      const transaction: Transaction = {
        id: editingOrder ? editingOrder.id : Date.now(),
        ...newTransaction,
        amount: Number(formData.amount),
        paymentAmount: calculatedPaymentAmount,
        status: 'pending',
        notes: formData.notes
      };
  
      if (editingOrder) {
        setTransactions(prev => prev.map(t => 
          t.id === editingOrder.id ? transaction : t
        ));
        setEditingOrder(null);
      } else {
        setTransactions(prev => [transaction, ...prev]);
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
      <div className="space-y-8">
        {/* Exchange Rates Section */}
          <div className="bg-white shadow-xl rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Tasas de Cambio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Dólar a Peso */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <h3 className="text-2xl font-bold mb-4">Dólar a Peso</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium mb-2">Compra</label>
                    <input
                      type="number"
                      className="w-full p-3 text-2xl font-bold text-right border rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={rates.dolarToPeso.buy}
                      onChange={(e) => onRatesChange({
                        ...rates,
                        dolarToPeso: {
                          ...rates.dolarToPeso,
                          buy: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2">Venta</label>
                    <input
                      type="number"
                      className="w-full p-3 text-2xl font-bold text-right border rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={rates.dolarToPeso.sell}
                      onChange={(e) => onRatesChange({
                        ...rates,
                        dolarToPeso: {
                          ...rates.dolarToPeso,
                          sell: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Euro a Dólar */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <h3 className="text-2xl font-bold mb-4">Euro a Dólar</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium mb-2">Compra</label>
                    <input
                      type="number"
                      className="w-full p-3 text-2xl font-bold text-right border rounded-lg focus:ring-2 focus:ring-green-500"
                      value={rates.euroToDolar.buy}
                      onChange={(e) => onRatesChange({
                        ...rates,
                        euroToDolar: {
                          ...rates.euroToDolar,
                          buy: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2">Venta</label>
                    <input
                      type="number"
                      className="w-full p-3 text-2xl font-bold text-right border rounded-lg focus:ring-2 focus:ring-green-500"
                      value={rates.euroToDolar.sell}
                      onChange={(e) => onRatesChange({
                        ...rates,
                        euroToDolar: {
                          ...rates.euroToDolar,
                          sell: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Real a Dólar */}
              <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                <h3 className="text-2xl font-bold mb-4">Real a Dólar</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium mb-2">Compra</label>
                    <input
                      type="number"
                      className="w-full p-3 text-2xl font-bold text-right border rounded-lg focus:ring-2 focus:ring-yellow-500"
                      value={rates.realToDolar.buy}
                      onChange={(e) => onRatesChange({
                        ...rates,
                        realToDolar: {
                          ...rates.realToDolar,
                          buy: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2">Venta</label>
                    <input
                      type="number"
                      className="w-full p-3 text-2xl font-bold text-right border rounded-lg focus:ring-2 focus:ring-yellow-500"
                      value={rates.realToDolar.sell}
                      onChange={(e) => onRatesChange({
                        ...rates,
                        realToDolar: {
                          ...rates.realToDolar,
                          sell: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
  
         {/* New Order Section */}
      <div className="bg-white shadow-xl rounded-xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">
          {editingOrder ? 'Editar Orden' : 'Nueva Orden'}
        </h2>

        {/* Operation Summary Box */}
        {formData.amount && calculatedPaymentAmount > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border-2 border-blue-300">
            <h3 className="text-2xl font-bold mb-4 text-blue-900">Resumen de la Operación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xl">
              <div className="space-y-3">
                <p className="flex justify-between">
                  <span className="font-medium">Operación:</span>
                  <span className="font-bold">
                    {newTransaction.type === 'buy' ? 'Compra' : 'Venta'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="font-medium">Cantidad:</span>
                  <span className="font-bold">
                    {formData.amount} {newTransaction.item}
                  </span>
                </p>
              </div>
              <div className="space-y-3">
                <p className="flex justify-between">
                  <span className="font-medium">
                    {newTransaction.type === 'buy' ? 'A pagar' : 'A recibir'}:
                  </span>
                  <span className="font-bold text-blue-800">
                    {calculatedPaymentAmount.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} {newTransaction.payment}
                  </span>
                </p>
                <p className="flex justify-between text-blue-700">
                  <span className="font-medium">Tasa efectiva:</span>
                  <span className="font-bold">
                    {(calculatedPaymentAmount / Number(formData.amount)).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} {newTransaction.payment}/{newTransaction.item}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Client Selection */}
            <div className="relative">
              <label className="block text-lg font-medium mb-2">Cliente</label>
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
                value={formData.searchTerm}
                onChange={e => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
              {formData.searchTerm && (
                <div className="absolute z-10 w-full mt-2 bg-white border rounded-xl shadow-lg max-h-64 overflow-auto">
                  {filteredClients.map(client => (
                    <div
                      key={client.id}
                      className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setNewTransaction(prev => ({
                          ...prev,
                          client: client
                        }));
                        setFormData(prev => ({ ...prev, searchTerm: '' }));
                      }}
                    >
                      <div className="font-semibold text-lg">{client.name}</div>
                      <div className="text-gray-600">{client.address}</div>
                      <div className="text-gray-600">{client.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employee Selection */}
            <div>
              <label className="block text-lg font-medium mb-2">Empleado</label>
              <select
                className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
                value={newTransaction.employee}
                onChange={(e) =>
                  setNewTransaction(prev => ({ ...prev, employee: e.target.value }))
                }
              >
                <option value="">Seleccionar empleado</option>
                {employees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-lg font-medium mb-2">Tipo de Operación</label>
              <select
                className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
                value={newTransaction.type}
                onChange={(e) =>
                  setNewTransaction(prev => ({
                    ...prev,
                    type: e.target.value as TransactionType,
                  }))
                }
              >
                <option value="buy">Comprar</option>
                <option value="sell">Vender</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Currency Selection */}
            <div>
              <label className="block text-lg font-medium mb-2">Moneda</label>
              <select
                className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
                value={newTransaction.item}
                onChange={(e) =>
                  setNewTransaction(prev => ({
                    ...prev,
                    item: e.target.value as CurrencyType,
                  }))
                }
              >
                <option value="dolares">Dólares</option>
                <option value="euros">Euros</option>
                <option value="reales">Reales</option>
                <option value="pesos">Pesos</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-lg font-medium mb-2">Cantidad</label>
              <input
                type="number"
                className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
                value={formData.amount}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, amount: e.target.value }))
                }
                placeholder="Ingrese cantidad"
              />
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-lg font-medium mb-2">Método de Pago</label>
              <select
                className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
                value={newTransaction.payment}
                onChange={(e) =>
                  setNewTransaction(prev => ({
                    ...prev,
                    payment: e.target.value as CurrencyType,
                  }))
                }
              >
                <option value="pesos">Pesos</option>
                <option value="dolares">Dólares</option>
                <option value="euros">Euros</option>
                <option value="reales">Reales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8">
          <label className="block text-lg font-medium mb-2">Notas</label>
          <textarea
            className="w-full p-4 text-lg border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
            value={formData.notes}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, notes: e.target.value }))
            }
            rows={3}
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

      {/* Pending Orders Section */}
      <div className="bg-white shadow-xl rounded-xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Órdenes Pendientes</h2>
        <div className="space-y-6">
          {transactions
            .filter((t) => t.status === 'pending')
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
                          {transaction.type === 'buy' ? 'Comprar' : 'Vender'}:
                        </span>{' '}
                        <span className="font-bold">
                          {transaction.amount} {transaction.item}
                        </span>
                      </p>
                      <p className="text-xl">
                        <span className="font-medium">Pago:</span>{' '}
                        <span className="font-bold">
                          {transaction.paymentAmount} {transaction.payment}
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
          {transactions.filter(t => t.status === 'pending').length === 0 && (
            <div className="text-center py-12 text-gray-500 text-xl">
              No hay órdenes pendientes
            </div>
          )}
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
      t.employee === selectedEmployee && t.status === 'pending'
    );
  
    const updateOrderStatus = (orderId: number, newStatus: OrderStatus) => {
      // Get the transaction we're updating
      const transaction = transactions.find(t => t.id === orderId);
      
      if (transaction && newStatus === 'payment_delayed') {
        // Update inventory immediately for the item being traded
        const newInventory = {...inventory};
        
        if (transaction.type === 'buy') {
          // If buying dollars, add them immediately
          newInventory[transaction.item] = (newInventory[transaction.item] || 0) + transaction.amount;
        } else {
          // If selling dollars, subtract them immediately
          newInventory[transaction.item] = (newInventory[transaction.item] || 0) - transaction.amount;
        }
        
        // Update inventory state
        setInventory(newInventory);
      }
    
      // Update transaction status
      setTransactions(prev => prev.map(t => {
        if (t.id === orderId) {
          if (newStatus === 'payment_delayed') {
            return {
              ...t,
              status: 'payment_delayed',
              notes: statusNote,
              pendingPayment: { amount: t.paymentAmount, currency: t.payment },
              delayedBy: selectedEmployee,
              paymentCollector: selectedEmployee,
            };
          }
          return { ...t, status: newStatus, notes: statusNote };
        }
        return t;
      }));
      
      setStatusNote('');
    };
    
    const completeDelayedPayment = (
      transaction: Transaction,
      collectorEmployee: string,
      completionNote: string
    ) => {
      // Update only the payment currency in inventory
      setInventory(prev => ({
        ...prev,
        [transaction.payment]: prev[transaction.payment] + 
          (transaction.type === 'buy' ? -transaction.paymentAmount : transaction.paymentAmount)
      }));
    
      // Update transaction status
      setTransactions(prev => prev.map(t => {
        if (t.id === transaction.id) {
          return {
            ...t,
            status: 'completed',
            paymentCollector: collectorEmployee,
            notes: t.notes + (completionNote ? `\nPago completado: ${completionNote}` : '\nPago completado'),
          };
        }
        return t;
      }));
    };
    
    
    // Get all pending payment transactions
    const pendingPayments = transactions.filter(t => t.status === 'payment_delayed');
    
    return (
      <div className="space-y-6">
        <ExchangeRatesInput rates={rates} editable={false} />
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Vista Empleado</h2>
          <select 
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
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex-1"
                      >
                        Completada
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex-1"
                      >
                        Cancelada
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'payment_delayed')}
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
                      {transaction.type === 'buy' ? 'Compra' : 'Venta'} {transaction.amount} {transaction.item}
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

    const [transactionNotes, setTransactionNotes] = useState<Record<string | number, string>>({});

  const updateTransactionNote = (transactionId: number, note: string) => {
  setTransactions(prev => prev.map(t => 
    t.id === transactionId 
      ? { ...t, notes: t.notes ? `${t.notes}\nNota adicional: ${note}` : `Nota adicional: ${note}` }
      : t
  ));
  setTransactionNotes(prev => ({ ...prev, [transactionId]: '' }));
  };
    
    const todaysTransactions = useMemo(() => {
      const today = new Date();
      return transactions
        .filter(t => {
          const transactionDate = new Date(t.id);
          return (
            transactionDate.getDate() === today.getDate() &&
            transactionDate.getMonth() === today.getMonth() &&
            transactionDate.getFullYear() === today.getFullYear()
          );
        })
        .sort((a, b) => b.id - a.id);
    }, [transactions]);

    const [adjustmentsInput, setAdjustmentsInput] = useState<Record<keyof Inventory, string>>(() =>
      Object.fromEntries(Object.keys(inventory).map((key) => [key, ''])) as Record<keyof Inventory, string>
    );
    
    const calculateInventory = (): Inventory => {
      const current: Inventory = {
        dolares: 0,
        euros: 0,
        reales: 0,
        pesos: 0
      };
    
      transactions
        .sort((a, b) => a.id - b.id)
        .forEach(t => {
          if (t.status === 'completed') {
            if (t.type === 'manual') {
              current[t.item] += t.amount;
            } else if (t.type === 'buy') {
              // Client buys from us - we give item, receive payment
              current[t.item] -= t.amount;
              current[t.payment] += t.paymentAmount;
            } else if (t.type === 'sell') {
              // Client sells to us - we receive item, give payment
              current[t.item] += t.amount;
              current[t.payment] -= t.paymentAmount;
            }
          }
        });
    
      return current;
    }; 
    
    const applyAdjustment = (item: keyof Inventory) => {
      const newValue = parseInt(adjustmentsInput[item], 10);
      
      if (!isNaN(newValue)) {
        // Calculate current inventory
        const currentInventory = calculateInventory();
        
        // Calculate the difference between desired and current value
        const difference = newValue - currentInventory[item];
        
        // Only create transaction if there's a difference
        if (difference !== 0) {
          const newTransaction: Transaction = {
            id: Date.now(),
            type: 'manual',
            item: item as CurrencyType,
            amount: difference,
            payment: 'pesos' as CurrencyType,
            paymentAmount: 0,
            employee: 'Sistema',
            client: { id: 0, name: 'Ajuste Manual', address: '', phone: '' },
            status: 'completed',
            notes: `Ajuste manual: ${difference > 0 ? 'añadidos' : 'restados'} ${Math.abs(difference)} ${item}`
          };
    
          setTransactions(prev => [newTransaction, ...prev]);
        }
        
        setAdjustmentsInput(prev => ({ ...prev, [item]: '' }));
      }
    };

    // Calculate current inventory for display
    
    const currentInventory = calculateInventory();

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
              <div className={`text-lg ${currentInventory['pesos'] < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentInventory['pesos']}
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
              <div className={`text-lg ${currentInventory['dolares'] < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentInventory['dolares']}
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
              <div className={`text-lg ${currentInventory['euros'] < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentInventory['euros']}
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
              <div className={`text-lg ${currentInventory['reales'] < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentInventory['reales']}
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
        !isAfter(new Date(t.id), threeMonthsAgo)
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
    return transactions.filter(t => new Date(t.id) > threeMonthsAgo);
  }, [transactions]);

  // Group transactions by selected time period
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    activeTransactions.forEach((transaction: Transaction) => {
      const date = new Date(transaction.id);
      let groupKey = '';
      
      switch (groupBy) {
        case 'day':
          groupKey = date.toLocaleDateString();
          break;
        case 'week':
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          groupKey = `Semana del ${monday.toLocaleDateString()}`;
          break;
        case 'month':
          groupKey = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
    });

    return groups;
  }, [activeTransactions, groupBy]);

  const handleArchiveOldTransactions = () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const oldTransactions = transactions.filter((t: Transaction) => new Date(t.id) <= threeMonthsAgo);
    
    if (oldTransactions.length > 0) {
      const data = [
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
      XLSX.writeFile(wb, `Transacciones_Antiguas_${new Date().toISOString().split('T')[0]}.xlsx`);

      setTransactions(transactions.filter(t => new Date(t.id) > threeMonthsAgo));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <select
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

  return (
  <main className="p-4 max-w-6xl mx-auto">
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Blue Eyes</h1>
      <div className="flex gap-4">
        <button
          onClick={() => setView('orders')}
          className={`px-6 py-3 rounded-lg text-lg font-medium transition-colors ${
            view === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Órdenes
        </button>
        <button
          onClick={() => setView('clients')}
          className={`px-4 py-2 rounded ${view === 'clients' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Clientes
        </button>
        <button
          onClick={() => setView('employees')}
          className={`px-4 py-2 rounded ${view === 'employees' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Empleados
        </button>
        <button
          onClick={() => setView('inventory')}
          className={`px-4 py-2 rounded ${view === 'inventory' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Inventario
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-4 py-2 rounded ${view === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Historial
        </button>
  
        {SHOW_TEST_BUTTON && (
        <button
          onClick={() => generateTestData(setClients, setTransactions)}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Generar Datos de Prueba
        </button>
      )}
      </div>
    </div>

    {view === 'orders' ? (
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
    ) : view === 'clients' ? (
      <ClientManagement />
    ) : view === 'employees' ? (
      <EmployeeView 
        transactions={transactions} 
        setTransactions={setTransactions} 
        inventory={inventory}
        setInventory={setInventory}
        rates={exchangeRates}
      />
    ) : view === 'history' ? (  // Add this new condition
      <TransactionHistory
        transactions={transactions}
        setTransactions={setTransactions}
      />
    ) : (
      <InventoryView
        inventory={inventory}
        setInventory={setInventory}
        transactions={transactions}
        setTransactions={setTransactions}
      />
    )}
  </main>
  );
}