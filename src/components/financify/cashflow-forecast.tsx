
'use client';

import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, CheckCircle, Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';

// --- Types ---
type DailyData = {
  date: Date;
  balance: number;
  income: number;
  expense: number;
  events: string[];
  status: 'safe' | 'warning' | 'danger';
};

type CashflowForecastProps = {
    transactions: (ExtractedTransaction & { id: string })[];
    isLoading: boolean;
};

export default function CashflowForecast({ transactions, isLoading }: CashflowForecastProps) {
  const LOW_BALANCE_THRESHOLD = 5000;
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- Core Forecasting Logic ---
  const { historicalData, lowestPoint } = useMemo(() => {
    if (transactions.length === 0) {
      return { historicalData: [], lowestPoint: null };
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 2. Set the window for the selected month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // 3. Calculate initial balance before the window starts
    let runningBalance = transactions
      .filter(t => new Date(t.date) < startDate)
      .reduce((acc, t) => {
        const amount = Number(t.amount);
        return t.type === 'income' ? acc + amount : acc - amount;
      }, 0);

    const data: DailyData[] = [];
    const tempDate = new Date(startDate);

    // 4. Iterate through the selected month
    while (tempDate <= endDate) {
      const currentDateString = tempDate.toISOString().split('T')[0];
      
      const todaysTransactions = transactions.filter(
        t => {
            try {
                return new Date(t.date).toISOString().split('T')[0] === currentDateString;
            } catch (e) {
                return false;
            }
        }
      );

      let dailyIncome = 0;
      let dailyExpense = 0;
      let dailyEvents: string[] = [];
      
      todaysTransactions.forEach(t => {
          const amount = Number(t.amount);
          if (t.type === 'income') {
              dailyIncome += amount;
              dailyEvents.push(`+${amount} (${t.description})`);
          } else {
              dailyExpense += amount;
              dailyEvents.push(`-${amount} (${t.description})`);
          }
      });

      runningBalance += dailyIncome - dailyExpense;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (runningBalance < 0) status = 'danger';
      else if (runningBalance < LOW_BALANCE_THRESHOLD) status = 'warning';

      data.push({
        date: new Date(tempDate),
        balance: runningBalance,
        income: dailyIncome,
        expense: dailyExpense,
        events: dailyEvents,
        status,
      });

      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    const finalLowestPoint = data.reduce((min, p) => (p.balance < min.balance ? p : min), data[0] || null);

    return { historicalData: data, lowestPoint: finalLowestPoint };
  }, [transactions, currentDate]);

  const weeklyChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < historicalData.length; i += 7) {
      chunks.push(historicalData.slice(i, i + 7));
    }
    return chunks;
  }, [historicalData]);


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
  
  const formatMonthYear = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
  }

  if (isLoading) {
      return (
          <div className="flex flex-col justify-center items-center h-64 text-center">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <h2 className="text-xl font-semibold">Loading Cashflow Data...</h2>
          </div>
      )
  }

  if (transactions.length === 0) {
      return (
          <div className="text-center py-10">
              <h3 className="text-lg font-semibold">No transactions to analyze.</h3>
              <p className="text-muted-foreground mt-2">Add some income and expenses to see your cashflow history.</p>
          </div>
      )
  }

  const BreakdownCard = ({ day }: { day: DailyData }) => (
    <div 
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
      
      <div className="space-y-1">
        {day.events.length > 0 ? (
          day.events.slice(0, 2).map((event, i) => ( // Show max 2 events
            <div key={i} className="flex items-center gap-1 text-xs">
              {event.startsWith('+') ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
              )}
              <span className="truncate" title={event}>{event}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 italic">No transactions</div>
        )}
        {day.events.length > 2 && <div className="text-xs text-slate-400 italic">...and {day.events.length - 2} more</div>}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cashflow Analysis</h2>
          <p className="text-slate-500 text-sm">Reviewing your account balance over time.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted p-1">
            <Button size="icon" variant="ghost" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-sm w-32 text-center">{formatMonthYear(currentDate)}</span>
            <Button size="icon" variant="ghost" onClick={handleNextMonth}>
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
      </div>

      {lowestPoint && (
        <div className={`p-4 rounded-xl border-l-4 shadow-sm ${lowestPoint.status === 'danger' ? 'bg-red-50 border-red-500' : lowestPoint.status === 'warning' ? 'bg-amber-50 border-amber-500' : 'bg-emerald-50 border-emerald-500'}`}>
          <div className="flex items-start gap-3">
            {lowestPoint.status === 'danger' && <AlertTriangle className="text-red-500 w-6 h-6 mt-1" />}
            {lowestPoint.status === 'warning' && <AlertTriangle className="text-amber-500 w-6 h-6 mt-1" />}
            {lowestPoint.status === 'safe' && <CheckCircle className="text-emerald-500 w-6 h-6 mt-1" />}
            
            <div>
              <h3 className="font-semibold text-slate-800">
                {lowestPoint.status === 'danger' ? 'Critical Cashflow Event' : lowestPoint.status === 'warning' ? 'Low Balance Recorded' : 'Monthly Snapshot'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Your balance hit a low of <span className="font-bold">{formatINR(lowestPoint.balance)}</span> on <strong>{formatDate(lowestPoint.date)}</strong> during this period.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate} 
              tick={{fontSize: 12}} 
              minTickGap={30}
            />
            <YAxis tick={{fontSize: 12}} tickFormatter={(val) => formatINR(val).replace('₹', '')} />
            <Tooltip 
              formatter={(value: number) => [formatINR(value), "Balance"]}
              labelFormatter={(label) => formatDate(new Date(label))}
            />
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

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Daily Breakdown
        </h3>
        
        {/* Mobile Carousel View */}
        <div className="md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {weeklyChunks.map((week, weekIndex) => (
                <CarouselItem key={weekIndex}>
                  <div className="p-1 space-y-3">
                    {week.map(day => <BreakdownCard key={day.date.toISOString()} day={day} />)}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-[-10px]" />
            <CarouselNext className="absolute right-[-10px]" />
          </Carousel>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {historicalData.map((day) => (
            <BreakdownCard key={day.date.toISOString()} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}
