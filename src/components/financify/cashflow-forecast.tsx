
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, CheckCircle, TrendingDown, Calendar, PlusCircle, RefreshCw } from 'lucide-react';

// --- Types ---
type RecurringBill = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number; // 1-31
  type: 'income' | 'expense';
};

type DailyForecast = {
  date: Date;
  dayOfMonth: number;
  balance: number;
  income: number;
  expense: number;
  events: string[];
  status: 'safe' | 'warning' | 'danger';
};

// --- Mock Data (Replace with Props or API Data) ---
const INITIAL_BALANCE = 25000;
const DAILY_BURN_RATE = 400; // Food, Travel, etc.
const LOW_BALANCE_THRESHOLD = 5000;

const MOCK_RECURRING: RecurringBill[] = [
  { id: '1', name: 'Rent', amount: 12000, dayOfMonth: 5, type: 'expense' },
  { id: '2', name: 'SIP Investment', amount: 2000, dayOfMonth: 10, type: 'expense' },
  { id: '3', name: 'Netflix', amount: 199, dayOfMonth: 15, type: 'expense' },
  { id: '4', name: 'Client Retainer', amount: 30000, dayOfMonth: 28, type: 'income' },
];

export default function CashflowForecast() {
  // State for "What-If" Simulation
  const [simulationAmount, setSimulationAmount] = useState<string>('');
  const [simulationDate, setSimulationDate] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);

  // --- Core Forecasting Logic ---
  const forecastData = useMemo(() => {
    let currentBalance = INITIAL_BALANCE;
    const forecast: DailyForecast[] = [];
    const today = new Date();

    // Generate next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dayOfMonth = date.getDate();
      
      let dailyIncome = 0;
      let dailyExpense = 0;
      let dailyEvents: string[] = [];

      // 1. Apply Daily Burn (Variable Spend)
      dailyExpense += DAILY_BURN_RATE;

      // 2. Apply Recurring Bills
      const todaysBills = MOCK_RECURRING.filter(bill => bill.dayOfMonth === dayOfMonth);
      todaysBills.forEach(bill => {
        if (bill.type === 'expense') {
          dailyExpense += bill.amount;
          dailyEvents.push(`-${bill.amount} (${bill.name})`);
        } else {
          dailyIncome += bill.amount;
          dailyEvents.push(`+${bill.amount} (${bill.name})`);
        }
      });

      // 3. Apply Simulation (If Active)
      if (isSimulating && simulationDate && simulationAmount) {
        const simDateObj = new Date(simulationDate);
        if (
          date.getDate() === simDateObj.getDate() &&
          date.getMonth() === simDateObj.getMonth()
        ) {
          const amt = parseFloat(simulationAmount);
          dailyExpense += amt;
          dailyEvents.push(`-${amt} (Planned Purchase)`);
        }
      }

      // Update Running Balance
      currentBalance = currentBalance + dailyIncome - dailyExpense;

      // Determine Health Status
      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (currentBalance < 0) status = 'danger';
      else if (currentBalance < LOW_BALANCE_THRESHOLD) status = 'warning';

      forecast.push({
        date,
        dayOfMonth,
        balance: currentBalance,
        income: dailyIncome,
        expense: dailyExpense,
        events: dailyEvents,
        status,
      });
    }
    return forecast;
  }, [simulationAmount, simulationDate, isSimulating]);

  // --- Helper to format currency ---
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // --- Helper to format date ---
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
  };

  // Find the lowest balance point
  const lowestPoint = forecastData.reduce((min, p) => (p.balance < min.balance ? p : min), forecastData[0]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cashflow Forecast</h2>
          <p className="text-slate-500 text-sm">Projecting your balance for the next 30 days based on recurring bills & average spend.</p>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Current Balance</span>
          <div className="text-xl font-bold text-emerald-600">{formatINR(INITIAL_BALANCE)}</div>
        </div>
      </div>

      {/* Insight Card */}
      <div className={`p-4 rounded-xl border-l-4 shadow-sm ${lowestPoint.status === 'danger' ? 'bg-red-50 border-red-500' : lowestPoint.status === 'warning' ? 'bg-amber-50 border-amber-500' : 'bg-emerald-50 border-emerald-500'}`}>
        <div className="flex items-start gap-3">
          {lowestPoint.status === 'danger' && <AlertTriangle className="text-red-500 w-6 h-6 mt-1" />}
          {lowestPoint.status === 'warning' && <AlertTriangle className="text-amber-500 w-6 h-6 mt-1" />}
          {lowestPoint.status === 'safe' && <CheckCircle className="text-emerald-500 w-6 h-6 mt-1" />}
          
          <div>
            <h3 className="font-semibold text-slate-800">
              {lowestPoint.status === 'danger' ? 'Critical Cashflow Warning' : lowestPoint.status === 'warning' ? 'Tight Cashflow Ahead' : 'Cashflow Looks Healthy'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Your balance hits a low of <span className="font-bold">{formatINR(lowestPoint.balance)}</span> on <strong>{formatDate(lowestPoint.date)}</strong>.
              {lowestPoint.status !== 'safe' && " Consider delaying big purchases or asking for early payments."}
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">"What-If" Simulator</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Expense Name (Optional)</label>
            <input type="text" placeholder="e.g. New Phone" className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₹)</label>
            <input 
              type="number" 
              value={simulationAmount}
              onChange={(e) => setSimulationAmount(e.target.value)}
              placeholder="20000" 
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
            <input 
              type="date" 
              value={simulationDate}
              onChange={(e) => setSimulationDate(e.target.value)}
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isSimulating ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isSimulating ? 'Clear' : 'Simulate'}
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecastData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate} 
              tick={{fontSize: 12}} 
              minTickGap={30}
            />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip 
              formatter={(value: number) => [formatINR(value), "Balance"]}
              labelFormatter={(label) => formatDate(new Date(label))}
            />
            {/* Danger Line */}
            <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
            <ReferenceLine y={LOW_BALANCE_THRESHOLD} stroke="orange" strokeDasharray="3 3" label="Low Funds" />
            
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="#4f46e5" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Calendar List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> 30-Day Breakdown
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {forecastData.map((day, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border text-sm transition-all hover:shadow-md ${
                day.status === 'danger' ? 'bg-red-50 border-red-200' : 
                day.status === 'warning' ? 'bg-amber-50 border-amber-200' : 
                'bg-white border-slate-100'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-600">{formatDate(day.date)}</span>
                <span className={`font-bold ${day.status === 'danger' ? 'text-red-600' : day.status === 'warning' ? 'text-amber-600' : 'text-slate-800'}`}>
                  {formatINR(day.balance)}
                </span>
              </div>
              
              {/* Daily Events Badge */}
              <div className="space-y-1">
                {day.events.length > 0 ? (
                  day.events.map((event, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      {event.startsWith('+') ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      )}
                      <span className="truncate">{event}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic">No major bills</div>
                )}
                {/* Daily Burn Note */}
                <div className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100">
                  - {formatINR(DAILY_BURN_RATE)} daily spend
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
