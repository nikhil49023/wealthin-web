
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Trash2,
  Upload,
  Loader2,
  FileUp,
  HelpCircle,
  Edit,
  AreaChart,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import { extractTransactionsAction } from '@/app/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { AlertCircle } from 'lucide-react';


const db = getFirestore(app);

// Data types for new features
type Investment = { id: string; name: string; type: string; amount: number };
type Debt = { id: string; name: string; type: string; totalAmount: number; amountPaid: number };

type ForecastDay = {
  date: Date;
  transactions: ExtractedTransaction[];
  income: number;
  expense: number;
  net: number;
  openingBalance: number;
  closingBalance: number;
};

export default function FundManagementPage() {
  const { user, loading: loadingAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // State for all data types
  const [transactions, setTransactions] = useState<(ExtractedTransaction & { id: string })[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  // Loading states
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingInvestments, setLoadingInvestments] = useState(true);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Dialog states
  const [addInvestmentDialogOpen, setAddInvestmentDialogOpen] = useState(false);
  const [addDebtDialogOpen, setAddDebtDialogOpen] = useState(false);
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form states
  const [newInvestment, setNewInvestment] = useState({ name: '', type: 'Stocks', amount: '' });
  const [newDebt, setNewDebt] = useState({ name: '', type: 'Personal Loan', totalAmount: '', amountPaid: '0' });
  const [newTransaction, setNewTransaction] = useState({ description: '', date: '', time: '', type: 'expense' as 'income' | 'expense', amount: '' });

  // Import flow state
  const [importStep, setImportStep] = useState<'upload' | 'confirm'>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedTransaction[]>([]);

  // File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cashflow states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  // Data fetching effects
  useEffect(() => {
    if (!user) return;
    const collections = {
      transactions: setLoadingTransactions,
      investments: setLoadingInvestments,
      debts: setLoadingDebts,
    };

    const unsubscribes = Object.entries(collections).map(([col, setter]) => {
      setter(true);
      const ref = collection(db, 'users', user.uid, col);
      const q = col === 'transactions' ? query(ref, orderBy('date', 'desc')) : ref;
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        if (col === 'transactions') setTransactions(data);
        if (col === 'investments') setInvestments(data);
        if (col === 'debts') setDebts(data);
        setter(false);
      }, (error) => {
        console.error(`Error fetching ${col}:`, error);
        setter(false);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const invalidateDashboardCache = useCallback(() => {
    if (user) {
      const cacheKey = `dashboard-summary-${user.uid}`;
      localStorage.removeItem(cacheKey);
    }
  }, [user]);

  // Financial Health Score Calculation
  const financialHealth = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalInvestments = investments.reduce((sum, i) => sum + i.amount, 0);
    const totalDebt = debts.reduce((sum, d) => sum + (d.totalAmount - d.amountPaid), 0);

    if (totalIncome === 0) return { score: 0, feedback: 'Add income to calculate score.' };

    const savingsRate = (totalIncome - totalExpenses) / totalIncome;
    const debtToIncome = totalDebt > 0 ? totalDebt / totalIncome : 0;
    const investmentRate = totalInvestments > 0 ? totalInvestments / totalIncome : 0;

    let score = 50;
    score += savingsRate * 50;
    score -= debtToIncome * 30;
    score += investmentRate * 20;

    score = Math.max(0, Math.min(100, score));

    let feedback = 'You\'re on the right track!';
    if (score < 40) feedback = 'There is room for improvement. Focus on increasing savings and reducing debt.';
    if (score > 80) feedback = 'Excellent! You are managing your funds very effectively.';

    return { score: Math.round(score), feedback };
  }, [transactions, investments, debts]);

  // Generic add function
  const handleAdd = async (collectionName: string, data: any, dialogSetter: (open: boolean) => void) => {
    if (!user) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'users', user.uid, collectionName), data);
      toast({ title: 'Success', description: `${collectionName.slice(0, -1)} added.` });
      dialogSetter(false);
      invalidateDashboardCache();
    } catch (error) {
      console.error(`Error adding ${collectionName}:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not add ${collectionName.slice(0, -1)}.` });
    } finally {
      setIsAdding(false);
    }
  };

  // Generic delete function
  const handleDelete = async (collectionName: string, id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, collectionName, id));
      toast({ title: 'Success', description: `${collectionName.slice(0, -1)} removed.` });
      invalidateDashboardCache();
    } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not remove ${collectionName.slice(0, -1)}.` });
    }
  };

  const startProgressAnimation = () => {
    setImportProgress(0);
    progressIntervalRef.current = setInterval(() => {
        setImportProgress(prev => {
            if (prev >= 95) {
                clearInterval(progressIntervalRef.current!);
                return 95;
            }
            return prev + 1;
        });
    }, 200);
  };

  const finishProgressAnimation = () => {
    if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
    }
    setImportProgress(100);
    setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
    }, 1000);
  };

  const resetImportDialog = () => {
    setImportDialogOpen(false);
    setExtractedData([]);
    setImportStep('upload');
  };

  const processFiles = async (files: FileList) => {
    if (!user || files.length === 0) return;
    setIsImporting(true);
    startProgressAnimation();

    try {
      const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      const dataUris = await Promise.all(Array.from(files).map(fileToDataUri));

      const result = await extractTransactionsAction({ documentDataUri: dataUris });

      if (result.success && result.data.transactions.length > 0) {
        setExtractedData(result.data.transactions);
        setImportStep('confirm');
      } else {
        throw new Error(result.error || 'No transactions were extracted from the document(s).');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
      resetImportDialog();
    } finally {
      finishProgressAnimation();
      setIsImporting(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!user || extractedData.length === 0) return;
    setIsAdding(true);
    try {
        const batch = writeBatch(db);
        const transactionsRef = collection(db, 'users', user.uid, 'transactions');
        extractedData.forEach(transaction => {
            const docRef = doc(transactionsRef);
            batch.set(docRef, transaction);
        });
        await batch.commit();
        invalidateDashboardCache();
        toast({ title: 'Import Successful', description: `${extractedData.length} transactions were imported.` });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
        setIsAdding(false);
        resetImportDialog();
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) processFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files) processFiles(files);
  };
  
  const loading = loadingAuth || loadingTransactions || loadingInvestments || loadingDebts;

  const monthlyForecast = useMemo((): ForecastDay[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let currentBalance = Number(openingBalance) || 0;

    return daysInMonth.map(day => {
      const dayTransactions = transactions.filter(t => {
        try {
          const transactionDate = new Date(t.date);
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

    const isNegativeBalance = dayData.closingBalance < 0;

    return (
      <div className={cn(
        "h-full w-full p-2 flex flex-col justify-between text-left text-sm",
        isNegativeBalance ? "bg-red-100/50 dark:bg-red-900/30" : 
        dayData.net > 0 ? "bg-green-100/30 dark:bg-green-900/20" :
        dayData.net < 0 ? "bg-amber-100/30 dark:bg-amber-900/20" :
        ""
      )}>
        <span className="font-semibold text-foreground">{format(date, 'd')}</span>
        <div className="text-xs text-right mt-auto">
          {dayData.net > 0 && <span className="font-bold text-green-600">+{formatCurrency(dayData.net)}</span>}
          {dayData.net < 0 && <span className="font-bold text-red-600">{formatCurrency(dayData.net)}</span>}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fund Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Financial Health Score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative h-32 w-32">
            <svg className="transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-current text-muted"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" strokeWidth="2" />
              <path
                className="stroke-current text-primary"
                strokeDasharray={`${financialHealth.score}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">{financialHealth.score}</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-muted-foreground">{financialHealth.feedback}</p>
          </div>
        </CardContent>
      </Card>

      {isImporting && importStep === 'upload' && (
        <Card>
            <CardHeader>
                <CardTitle>Importing Transactions...</CardTitle>
                <CardDescription>AI is analyzing your document. Please wait.</CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={importProgress} className="w-full" />
                <p className="text-center text-sm text-muted-foreground mt-2">{Math.round(importProgress)}%</p>
            </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions">
        <div className="flex flex-wrap gap-4 justify-between items-center">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="investments">Investments</TabsTrigger>
                <TabsTrigger value="debts">Debts</TabsTrigger>
                <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            </TabsList>
            <Dialog open={importDialogOpen} onOpenChange={open => { if (!open) resetImportDialog(); else setImportDialogOpen(true); }}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={isImporting} className="w-full sm:w-auto">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    {importStep === 'upload' && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Import Transactions</DialogTitle>
                                <DialogDescription>Upload a document (PDF, image, CSV) to automatically extract transactions.</DialogDescription>
                            </DialogHeader>
                             <div className="grid md:grid-cols-2 gap-6 py-4">
                                <div
                                    className={cn('border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center', { 'bg-accent': isDragging })}
                                    onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                                    onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input id="document" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.csv,.txt" className="hidden" multiple />
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <FileUp className="w-8 h-8" />
                                        <p>Drag & drop file(s) or click to select</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-semibold flex items-center gap-2 mb-2"><HelpCircle className="h-5 w-5 text-primary"/>For Best Results</h4>
                                    <p className="text-sm text-muted-foreground mb-3">Ensure your document is clear and readable. For handwritten notes, use a simple table format:</p>
                                    <Table className="bg-background text-xs">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Office Supplies</TableCell>
                                                <TableCell>25/07/2024</TableCell>
                                                <TableCell>Expense</TableCell>
                                                <TableCell className="text-right">1500</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </>
                    )}
                    {importStep === 'confirm' && (
                         <>
                            <DialogHeader>
                                <DialogTitle>Confirm Extracted Data</DialogTitle>
                                <DialogDescription>Please review the transactions extracted by the AI. If correct, click "Confirm & Save".</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extractedData.map((t, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{t.description}</TableCell>
                                                <TableCell>{t.date} {t.time}</TableCell>
                                                <TableCell><Badge variant={t.type === 'income' ? 'default' : 'destructive'}>{t.type}</Badge></TableCell>
                                                <TableCell className="text-right font-mono">₹{Number(t.amount).toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                             <DialogFooter className="mt-4">
                                <Button variant="ghost" onClick={resetImportDialog} disabled={isAdding}>Cancel</Button>
                                <Button onClick={handleConfirmAndSave} disabled={isAdding}>
                                     {isAdding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Confirm & Save'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>A record of your income and expenses.</CardDescription>
              <Dialog open={addTransactionDialogOpen} onOpenChange={setAddTransactionDialogOpen}>
                <DialogTrigger asChild><Button className="w-fit"><PlusCircle className="mr-2"/> Add Transaction</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Transaction</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Description" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}/>
                    <Input type="date" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}/>
                    <Input type="time" value={newTransaction.time} onChange={e => setNewTransaction({...newTransaction, time: e.target.value})}/>
                    <Select value={newTransaction.type} onValueChange={(v: 'income' | 'expense') => setNewTransaction({...newTransaction, type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Amount (e.g., 1500.00)" type="number" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}/>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button disabled={isAdding} onClick={() => {
                        const dataToSave = {
                          description: newTransaction.description,
                          amount: parseFloat(newTransaction.amount),
                          type: newTransaction.type,
                          date: newTransaction.date,
                          time: newTransaction.time,
                        };
                        handleAdd('transactions', dataToSave, setAddTransactionDialogOpen);
                    }}>
                        {isAdding && <Loader2 className="mr-2 animate-spin"/>} Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTransactions ? <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> :
                  transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.date} {t.time}</p>
                      </TableCell>
                      <TableCell><Badge variant={t.type === 'income' ? 'default' : 'destructive'} className={cn(t.type === 'income' && 'bg-green-600')}>{t.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono">₹{Number(t.amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete('transactions', t.id)}><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments">
          <Card>
            <CardHeader>
              <CardTitle>Investment Portfolio</CardTitle>
              <CardDescription>Track your investments and their performance.</CardDescription>
              <Dialog open={addInvestmentDialogOpen} onOpenChange={setAddInvestmentDialogOpen}>
                <DialogTrigger asChild><Button className="w-fit"><PlusCircle className="mr-2"/> Add Investment</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Investment</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Investment Name (e.g., Reliance Industries)" value={newInvestment.name} onChange={e => setNewInvestment({...newInvestment, name: e.target.value})}/>
                    <Select value={newInvestment.type} onValueChange={(v) => setNewInvestment({...newInvestment, type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="Stocks">Stocks</SelectItem><SelectItem value="Mutual Funds">Mutual Funds</SelectItem><SelectItem value="Real Estate">Real Estate</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Amount Invested" type="number" value={newInvestment.amount} onChange={e => setNewInvestment({...newInvestment, amount: e.target.value})}/>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button disabled={isAdding} onClick={() => handleAdd('investments', {...newInvestment, amount: parseFloat(newInvestment.amount)}, setAddInvestmentDialogOpen)}>
                        {isAdding && <Loader2 className="mr-2 animate-spin"/>} Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInvestments ? <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> :
                  investments.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell><Badge variant="secondary">{i.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono">₹{i.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete('investments', i.id)}><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debts Tab */}
        <TabsContent value="debts">
          <Card>
            <CardHeader>
              <CardTitle>Debt Management</CardTitle>
              <CardDescription>Keep track of your loans and liabilities.</CardDescription>
               <Dialog open={addDebtDialogOpen} onOpenChange={setAddDebtDialogOpen}>
                <DialogTrigger asChild><Button className="w-fit"><PlusCircle className="mr-2"/> Add Debt</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Debt</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Debt Name (e.g., Car Loan)" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})}/>
                    <Select value={newDebt.type} onValueChange={(v) => setNewDebt({...newDebt, type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="Personal Loan">Personal Loan</SelectItem><SelectItem value="Home Loan">Home Loan</SelectItem><SelectItem value="Credit Card">Credit Card</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Total Amount" type="number" value={newDebt.totalAmount} onChange={e => setNewDebt({...newDebt, totalAmount: e.target.value})}/>
                    <Input placeholder="Amount Paid" type="number" value={newDebt.amountPaid} onChange={e => setNewDebt({...newDebt, amountPaid: e.target.value})}/>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button disabled={isAdding} onClick={() => handleAdd('debts', {...newDebt, totalAmount: parseFloat(newDebt.totalAmount), amountPaid: parseFloat(newDebt.amountPaid)}, setAddDebtDialogOpen)}>
                        {isAdding && <Loader2 className="mr-2 animate-spin"/>} Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDebts ? <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> :
                  debts.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                      <TableCell>
                        <Progress value={(d.amountPaid / d.totalAmount) * 100} className="w-full"/>
                      </TableCell>
                      <TableCell className="text-right font-mono">₹{(d.totalAmount - d.amountPaid).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete('debts', d.id)}><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

         {/* Cashflow Tab */}
        <TabsContent value="cashflow">
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AreaChart/> Cashflow Calendar</CardTitle>
                    <CardDescription>Visually forecast your income, expenses, and daily balance for the month.</CardDescription>
                </CardHeader>
            </Card>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}>Previous</Button>
                        <Button variant="outline" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>Next</Button>
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
                            day: 'h-24 w-full p-0 text-left align-top',
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
        </TabsContent>

      </Tabs>
    </div>
  );
}
