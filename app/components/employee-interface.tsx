import React, { useState, useMemo } from 'react'; 
import { Transaction, OrderStatus, ExchangeRates } from '../types'; 
import SimpleExchangeRates from '../exchange-rates';
import { supabase } from '../lib/supabase';

// Auth types
type UserRole = 'admin' | 'employee';
type User = {
  username: string;
  role: UserRole;
};

// Login Component
const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // For now, using a simple mapping. In production, this should be in your database
    const users: Record<string, UserRole> = {
      'admin': 'admin',
      'veneno': 'employee',
      'chinda': 'employee',
      'juan': 'employee'
    };

    if (username.toLowerCase() in users) {
      onLogin({
        username: username.toLowerCase(),
        role: users[username.toLowerCase()]
      });
    } else {
      setError('Usuario no válido');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Blue Eyes</h1>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border rounded"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white p-3 rounded font-medium hover:bg-blue-600"
          >
            Ingresar
          </button>
        </div>
      </div>
    </div>
  );
};

// In employee-interface.tsx, replace the current EmployeeDashboard with:

const EmployeeDashboard = ({ 
  username,
  rates,
  transactions,
  setTransactions
}: { 
  username: string;
  rates: ExchangeRates;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) => {
  const [statusNote, setStatusNote] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Get all transactions for this employee
  const employeeTransactions = transactions.filter(t => 
    t.employee.toLowerCase() === username
  );

  // Helper function to get transaction date
  const getTransactionDate = (transaction: Transaction): Date => {
    if (transaction.created_at) {
      const date = new Date(transaction.created_at);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Fallback to id if it's a valid timestamp
    const date = new Date(transaction.id);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1970) return date;
    
    // If all else fails, return current date
    return new Date();
  };

  // Group transactions by selected time period with proper date handling
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    employeeTransactions.forEach((transaction: Transaction) => {
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

    // Sort transactions within each group by date
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = getTransactionDate(a);
        const dateB = getTransactionDate(b);
        return dateB.getTime() - dateA.getTime();
      });
    });

    return groups;
  }, [employeeTransactions, groupBy]);

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
        notes: statusNote ? 
          (transaction.notes ? `${transaction.notes}\n${statusNote}` : statusNote) 
          : transaction.notes || null,
        payment_amount: transaction.paymentAmount,
        completed_at: newStatus === 'completed' ? timestamp : null
      };
  
      console.log('Updating transaction with:', updatedTransaction);
  
      // Update in Supabase
      const { error } = await supabase
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

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Bienvenido, {username}</h1>
      
      {/* Exchange Rates Display - Read Only */}
      <div className="mb-6">
        <SimpleExchangeRates rates={rates} onRatesChange={() => {}} editable={false} />
      </div>
  
      {/* Pending Transactions Section */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Órdenes Pendientes</h2>
        <div className="space-y-4">
          {transactions
            .filter(t => t.employee.toLowerCase() === username && t.status === 'pending')
            .map(transaction => (
              <div 
                key={transaction.id} 
                className="p-4 rounded-lg shadow bg-yellow-50 border border-yellow-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{transaction.client?.name}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.type === 'buy' ? 'Compra' : 'Venta'} de {transaction.amount} {transaction.item}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pago: {transaction.paymentAmount} {transaction.payment}
                    </p>
                    {transaction.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        Notas: {transaction.notes}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded text-sm bg-yellow-200 text-yellow-800">
                    Pendiente
                  </span>
                </div>
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
                      onClick={() => updateOrderStatus(transaction.id, 'completed')}
                      className="flex-1 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                    >
                      Completar
                    </button>
                    <button
                      onClick={() => updateOrderStatus(transaction.id, 'cancelled')}
                      className="flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => updateOrderStatus(transaction.id, 'payment_delayed')}
                      className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600"
                    >
                      Pago Demorado
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {transactions.filter(t => 
            t.employee.toLowerCase() === username && t.status === 'pending'
          ).length === 0 && (
            <p className="text-center text-gray-500">No hay órdenes pendientes</p>
          )}
        </div>
      </div>
  
      {/* Historical Transactions Section */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Historial de Transacciones</h2>
        
        {/* Group selector */}
        <div className="mb-4">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
            className="w-full p-2 border rounded"
          >
            <option value="day">Por Día</option>
            <option value="week">Por Semana</option>
            <option value="month">Por Mes</option>
          </select>
        </div>
  
        {/* Grouped transactions */}
        <div className="space-y-4">
          {Object.entries(groupedTransactions)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, groupTransactions]) => (
              <div key={date} className="border rounded-lg p-4">
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
                  className="w-full flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                >
                  <span className="font-semibold">{date}</span>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {groupTransactions.length} transacciones
                    </span>
                    <span className="transform transition-transform duration-200" 
                          style={{ transform: expandedGroups.has(date) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </div>
                </button>
  
                {expandedGroups.has(date) && (
                  <div className="mt-4 space-y-3">
                    {groupTransactions
                      .filter(t => t.status !== 'pending')
                      .map(transaction => (
                        <div 
                          key={transaction.id} 
                          className={`p-3 rounded-lg ${
                            transaction.status === 'completed' ? 'bg-green-50 border-green-200' :
                            transaction.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                            'bg-orange-50 border-orange-200'
                          } border`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {transaction.type === 'buy' ? 'Compra' : 'Venta'} de {transaction.amount} {transaction.item}
                              </p>
                              {transaction.client && (
                                <p className="text-sm text-gray-600">Cliente: {transaction.client.name}</p>
                              )}
                              <p className="text-sm text-gray-600">
                                Pago: {transaction.paymentAmount} {transaction.payment}
                              </p>
                              {transaction.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Notas: {transaction.notes}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-sm ${
                              transaction.status === 'completed' ? 'bg-green-200 text-green-800' :
                              transaction.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                              'bg-orange-200 text-orange-800'
                            }`}>
                              {transaction.status === 'completed' ? 'Completada' :
                               transaction.status === 'cancelled' ? 'Cancelada' : 
                               'Pago Demorado'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export { Login, EmployeeDashboard };