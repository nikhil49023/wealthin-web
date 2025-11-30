'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-provider';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, AreaChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type DailyData = {
  date: Date;
  income: number;
  expense: number;
  net: number;
  transactions: ExtractedTransaction[];
};

type ForecastDay = DailyData & {
  openingBalance: number;
  closingBalance: number;
};

export default function CashflowCalendarPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTransactions = snapshot.docs.map(doc => ({
            ...doc.data() as ExtractedTransaction,
            // Ensure date is a valid Date object
            date: doc.data().date ? doc.data().date : new Date().toISOString(),
        }));
        setTransactions(fetchedTransactions);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching transactions:", error);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const monthlyForecast = useMemo((): ForecastDay[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let currentBalance = Number(openingBalance) || 0;

    return daysInMonth.map(day => {
      const dayTransactions = transactions.filter(t => {
        try {
          // Handle both 'YYYY-MM-DD' and full ISO strings
          const transactionDate = t.date.includes('T') ? parseISO(t.date) : new Date(t.date.split('/').reverse().join('-'));
          return isSameDay(transactionDate, day);
        } catch {
          return false;
        }
      });
      
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      
      const dayData: ForecastDay = {
        date: day,
        transactions: dayTransactions,
        income,
        expense,
        net: income - expense,
        openingBalance: currentBalance,
        closingBalance: currentBalance + income - expense,
      };
      
      currentBalance = dayData.closingBalance;
      return dayData;
    });
  }, [currentMonth, transactions, openingBalance]);

  const selectedDayData = monthlyForecast.find(d => isSameDay(d.date, selectedDay || new Date()));

  const DayWithContent = ({ date }: { date: Date }) => {
    const dayData = monthlyForecast.find(d => isSameDay(d.date, date));
    if (!dayData) return <div className="p-1 text-center text-sm">{format(date, 'd')}</div>;

    const isLowBalance = dayData.closingBalance < (Number(openingBalance) * 0.25); // Warning if balance drops below 25% of opening
    const isNegativeBalance = dayData.closingBalance < 0;

    return (
      <div className={cn(
        "h-full w-full p-1 flex flex-col justify-between text-left text-sm",
        isNegativeBalance ? "bg-red-100/50 dark:bg-red-900/30" : isLowBalance ? "bg-amber-100/50 dark:bg-amber-900/30" : ""
      )}>
        <span className="font-medium">{format(date, 'd')}</span>
        <div className="text-xs text-right">
          {dayData.net > 0 && <span className="text-green-600 font-bold">+{formatCurrency(dayData.net)}</span>}
          {dayData.net < 0 && <span className="text-red-600 font-bold">{formatCurrency(dayData.net)}</span>}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h2 className="text-xl font-semibold">Loading Cashflow Data...</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <AreaChart />
                Cashflow Calendar
            </h1>
            <p className="text-muted-foreground">
                Visually forecast your income, expenses, and daily balance.
            </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}>Previous</Button>
                <Button variant="outline" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>Next</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              components={{
                DayContent: DayWithContent,
              }}
              className="p-0"
              classNames={{
                day: 'h-20 w-full p-0 text-left align-top',
                head_cell: 'w-full'
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Opening Balance</CardTitle>
                    <CardDescription>Enter your starting balance for this month to get an accurate forecast.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Label htmlFor="opening-balance">Balance on {format(startOfMonth(currentMonth), 'do MMM')}</Label>
                    <Input
                        id="opening-balance"
                        type="number"
                        placeholder="e.g., 50000"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Details for {selectedDay ? format(selectedDay, 'do MMMM') : 'Today'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedDayData ? (
                        <>
                            {selectedDayData.closingBalance < 0 && (
                                <Badge variant="destructive" className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Negative Balance Warning
                                </Badge>
                            )}
                            <div className="flex justify-between"><span>Opening Balance:</span> <span className="font-mono">{formatCurrency(selectedDayData.openingBalance)}</span></div>
                            <div className="flex justify-between text-green-600"><span>Income:</span> <span className="font-mono">+{formatCurrency(selectedDayData.income)}</span></div>
                            <div className="flex justify-between text-red-600"><span>Expense:</span> <span className="font-mono">{formatCurrency(selectedDayData.expense)}</span></div>
                            <hr />
                            <div className="flex justify-between font-bold"><span>Closing Balance:</span> <span className="font-mono">{formatCurrency(selectedDayData.closingBalance)}</span></div>

                            {selectedDayData.transactions.length > 0 && (
                                <div className="pt-4 space-y-2">
                                    <h4 className="font-semibold">Transactions:</h4>
                                    <ul className="text-sm space-y-1">
                                    {selectedDayData.transactions.map((t, i) => (
                                        <li key={i} className="flex justify-between">
                                            <span>{t.description}</span>
                                            <span className={cn("font-mono", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-muted-foreground text-center">Select a day to see details.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
