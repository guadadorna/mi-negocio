import React, { useState, useMemo } from 'react';
import { Transaction, Inventory, TransactionType } from '../types';
import { format, subDays, subWeeks, subMonths, isWithinInterval } from 'date-fns';

interface AnalysisViewProps {
  transactions: Transaction[];
  inventory: Inventory;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  transactions,
  inventory
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  // Calculate extractions for the selected employee
  const employeeExtractions = useMemo(() => {
    if (!selectedEmployee) return [];
    
    const now = new Date();
    let startDateTime: Date;
    
    switch (timeRange) {
      case 'week':
        startDateTime = subWeeks(now, 1);
        break;
      case 'month':
        startDateTime = subMonths(now, 1);
        break;
      default: // day
        startDateTime = subDays(now, 1);
    }

    return transactions.filter(t => 
      t.type === ('extraccion' as TransactionType) &&
      t.employee === selectedEmployee &&
      isWithinInterval(new Date(t.created_at || t.id), {
        start: startDateTime,
        end: now
      })
    );
  }, [selectedEmployee, timeRange, transactions]);

  // Calculate inventory differences
  const calculateInventoryDifference = () => {
    if (!startDate || !endDate) return null;

    const startTransactions = transactions.filter(t => 
      t.status === 'completed' &&
      new Date(t.created_at || t.id) <= new Date(startDate)
    );

    const endTransactions = transactions.filter(t => 
      t.status === 'completed' &&
      new Date(t.created_at || t.id) <= new Date(endDate)
    );

    const calculateInventoryState = (txs: Transaction[]) => {
      const state: Inventory = {
        dolares: 0,
        euros: 0,
        reales: 0,
        pesos: 0
      };

      txs.forEach(t => {
        if (t.type === 'buy') {
          state[t.item] += t.amount;
          state[t.payment] -= t.paymentAmount;
        } else if (t.type === 'sell') {
          state[t.item] -= t.amount;
          state[t.payment] += t.paymentAmount;
        } else if (t.type === ('extraccion' as TransactionType)) {
          state[t.item] -= t.amount;
        }
      });

      return state;
    };

    const startState = calculateInventoryState(startTransactions);
    const endState = calculateInventoryState(endTransactions);

    return {
      dolares: endState.dolares - startState.dolares,
      euros: endState.euros - startState.euros,
      reales: endState.reales - startState.reales,
      pesos: endState.pesos - startState.pesos
    };
  };

  const inventoryDiff = calculateInventoryDifference();

  return (
    <div className="space-y-6">
      {/* Inventory Difference Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Diferencia de Inventario</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Inicial</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Final</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {inventoryDiff && (
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(inventoryDiff).map(([currency, diff]) => (
              <div key={currency} className="p-4 border rounded">
                <h3 className="font-medium capitalize">{currency}</h3>
                <p className={`text-lg ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diff}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extractions Analysis Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Análisis de Extracciones</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Empleado</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Seleccionar empleado</option>
              {['Veneno', 'Chinda', 'Juan'].map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Período</label>
            <select
              className="w-full p-2 border rounded"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            >
              <option value="day">Último día</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          {selectedEmployee && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Extracciones:</h3>
              {employeeExtractions.length > 0 ? (
                <div className="space-y-2">
                  {employeeExtractions.map((extraction) => (
                    <div key={extraction.id} className="p-3 border rounded bg-gray-50">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{extraction.amount} {extraction.item}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(extraction.created_at || extraction.id), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        {extraction.notes && (
                          <p className="text-sm text-gray-600">{extraction.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No hay extracciones en este período</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};