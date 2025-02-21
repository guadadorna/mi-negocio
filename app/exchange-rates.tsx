import React, { useState, useEffect } from 'react';

interface Rate {
  buy: number;
  sell: number;
}

interface ExchangeRates {
  dolarToPeso: Rate;
  euroToDolar: Rate;
  realToDolar: Rate;
}

interface SimpleExchangeRatesProps {
  rates?: ExchangeRates;
  onRatesChange: (rates: ExchangeRates) => void;
  editable?: boolean;
}

const SimpleExchangeRates = ({
  rates = {
    dolarToPeso: { buy: 0, sell: 0 },
    euroToDolar: { buy: 0, sell: 0 },
    realToDolar: { buy: 0, sell: 0 }
  },
  onRatesChange,
  editable = true
}: SimpleExchangeRatesProps) => {
  // Rest of the component code stays exactly the same
  const [localRates, setLocalRates] = useState({
    dolarToPeso: {
      buy: (rates?.dolarToPeso?.buy ?? 0).toString(),
      sell: (rates?.dolarToPeso?.sell ?? 0).toString()
    },
    euroToDolar: {
      buy: (rates?.euroToDolar?.buy ?? 0).toString(),
      sell: (rates?.euroToDolar?.sell ?? 0).toString()
    },
    realToDolar: {
      buy: (rates?.realToDolar?.buy ?? 0).toString(),
      sell: (rates?.realToDolar?.sell ?? 0).toString()
    }
  });

  useEffect(() => {
    if (!rates) return;
    
    setLocalRates({
      dolarToPeso: {
        buy: (rates.dolarToPeso?.buy ?? 0).toString(),
        sell: (rates.dolarToPeso?.sell ?? 0).toString()
      },
      euroToDolar: {
        buy: (rates.euroToDolar?.buy ?? 0).toString(),
        sell: (rates.euroToDolar?.sell ?? 0).toString()
      },
      realToDolar: {
        buy: (rates.realToDolar?.buy ?? 0).toString(),
        sell: (rates.realToDolar?.sell ?? 0).toString()
      }
    });
  }, [rates]);

  const handleChange = (currency: keyof ExchangeRates, type: keyof Rate, value: string) => {
    if (!editable) return;
    
    // Allow empty string, numbers, dots and commas
    if (value !== '' && !/^\d*[.,]?\d*$/.test(value)) return;
  
    setLocalRates(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [type]: value
      }
    }));
  };

  const handleBlur = (currency: keyof ExchangeRates, type: keyof Rate) => {
    if (!editable) return;

    const value = parseFloat(localRates[currency][type]) || 0;
    
    const updatedRates = { ...rates };
    if (!updatedRates[currency]) {
      updatedRates[currency] = { buy: 0, sell: 0 };
    }
    updatedRates[currency][type] = value;
    
    onRatesChange(updatedRates);

    setLocalRates(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [type]: value.toString()
      }
    }));
  };

  return (
    <div className="w-full">
      {/* Mobile View */}
      <div className="block md:hidden space-y-4">
      {/* Dólar a Peso */}
      <div className="bg-blue-50 p-4 rounded-lg w-full">
        <h3 className="text-lg font-semibold mb-3">Dólar a Peso</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Compra</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-2 text-right border rounded ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.dolarToPeso.buy}
              onChange={e => {
                // Convert comma to dot if needed
                const value = e.target.value.replace(',', '.');
                handleChange('dolarToPeso', 'buy', value);
              }}
              onBlur={() => handleBlur('dolarToPeso', 'buy')}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Venta</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-2 text-right border rounded ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.dolarToPeso.sell}
              onChange={e => {
                // Convert comma to dot if needed
                const value = e.target.value.replace(',', '.');
                handleChange('dolarToPeso', 'sell', value);
              }}
              onBlur={() => handleBlur('dolarToPeso', 'sell')}
              readOnly={!editable}
            />
          </div>
        </div>
      </div>

      {/* Euro a Dólar */}
      <div className="bg-green-50 p-4 rounded-lg w-full">
        <h3 className="text-lg font-semibold mb-3">Euro a Dólar</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Compra</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-2 text-right border rounded ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.euroToDolar.buy}
              onChange={e => {
                // Convert comma to dot if needed
                const value = e.target.value.replace(',', '.');
                handleChange('euroToDolar', 'buy', value);
              }}
              onBlur={() => handleBlur('euroToDolar', 'buy')}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Venta</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-2 text-right border rounded ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.euroToDolar.sell}
              onChange={e => {
                // Convert comma to dot if needed
                const value = e.target.value.replace(',', '.');
                handleChange('euroToDolar', 'sell', value);
              }}
              onBlur={() => handleBlur('euroToDolar', 'sell')}
              readOnly={!editable}
            />
          </div>
        </div>
      </div>

      {/* Real a Dólar */}
      <div className="bg-yellow-50 p-4 rounded-lg w-full">
        <h3 className="text-lg font-semibold mb-3">Real a Dólar</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Compra</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-2 text-right border rounded ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.realToDolar.buy}
              onChange={e => {
                // Convert comma to dot if needed
                const value = e.target.value.replace(',', '.');
                handleChange('realToDolar', 'buy', value);
              }}
              onBlur={() => handleBlur('realToDolar', 'buy')}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Venta</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-2 text-right border rounded ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.realToDolar.sell}
              onChange={e => {
                // Convert comma to dot if needed
                const value = e.target.value.replace(',', '.');
                handleChange('realToDolar', 'sell', value);
              }}
              onBlur={() => handleBlur('realToDolar', 'sell')}
              readOnly={!editable}
            />
          </div>
        </div>
      </div>
    </div>
{/* Desktop View - Updated for wider boxes */}
<div className="hidden md:grid md:grid-cols-3 gap-6 w-full min-w-[900px]">
      {/* Dólar a Peso */}
      <div className="bg-blue-50 p-6 rounded-lg w-full min-w-[280px]">
        <h3 className="text-xl font-semibold mb-4">Dólar a Peso</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Compra</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-3 text-right border rounded text-lg ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.dolarToPeso.buy}
              onChange={e => {
                const value = e.target.value.replace(',', '.');
                handleChange('dolarToPeso', 'buy', value);
              }}
              onBlur={() => handleBlur('dolarToPeso', 'buy')}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Venta</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-3 text-right border rounded text-lg ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.dolarToPeso.sell}
              onChange={e => {
                const value = e.target.value.replace(',', '.');
                handleChange('dolarToPeso', 'sell', value);
              }}
              onBlur={() => handleBlur('dolarToPeso', 'sell')}
              readOnly={!editable}
            />
          </div>
        </div>
      </div>

      {/* Euro a Dólar */}
      <div className="bg-green-50 p-6 rounded-lg w-full min-w-[280px]">
        <h3 className="text-xl font-semibold mb-4">Euro a Dólar</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Compra</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-3 text-right border rounded text-lg ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.euroToDolar.buy}
              onChange={e => {
                const value = e.target.value.replace(',', '.');
                handleChange('euroToDolar', 'buy', value);
              }}
              onBlur={() => handleBlur('euroToDolar', 'buy')}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Venta</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-3 text-right border rounded text-lg ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.euroToDolar.sell}
              onChange={e => {
                const value = e.target.value.replace(',', '.');
                handleChange('euroToDolar', 'sell', value);
              }}
              onBlur={() => handleBlur('euroToDolar', 'sell')}
              readOnly={!editable}
            />
          </div>
        </div>
      </div>

      {/* Real a Dólar */}
      <div className="bg-yellow-50 p-6 rounded-lg w-full min-w-[280px]">
        <h3 className="text-xl font-semibold mb-4">Real a Dólar</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Compra</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-3 text-right border rounded text-lg ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.realToDolar.buy}
              onChange={e => {
                const value = e.target.value.replace(',', '.');
                handleChange('realToDolar', 'buy', value);
              }}
              onBlur={() => handleBlur('realToDolar', 'buy')}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Venta</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.01"
              className={`w-full p-3 text-right border rounded text-lg ${
                editable ? '' : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              value={localRates.realToDolar.sell}
              onChange={e => {
                const value = e.target.value.replace(',', '.');
                handleChange('realToDolar', 'sell', value);
              }}
              onBlur={() => handleBlur('realToDolar', 'sell')}
              readOnly={!editable}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default SimpleExchangeRates;