
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
  Landmark,
  FileText,
  Percent,
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
import { Input } from '@/components/ui/input';
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
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { ExtractedTransaction } from '@/ai/schemas/transactions';
import { extractTransactionsAction } from '@/app/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import CashflowForecast from '@/components/financify/cashflow-forecast';
import { Checkbox } from '@/components/ui/checkbox';


const db = getFirestore(app);

type TaxDeductibleTransaction = ExtractedTransaction & { id: string, isTaxDeductible?: boolean };

export default function FundManagementPage() {
  const { user, loading: loadingAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // State for all data types
  const [transactions, setTransactions] = useState<TaxDeductibleTransaction[]>([]);

  // Loading states
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Dialog states
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form states
  const [newTransaction, setNewTransaction] = useState({ description: '', date: '', time: '', type: 'expense' as 'income' | 'expense', amount: '' });

  // Import flow state
  const [importStep, setImportStep] = useState<'upload' | 'confirm'>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedTransaction[]>([]);

  // File Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  
  const formatCurrency = (amount: number | string | undefined): string => {
    if (amount === undefined || amount === null || amount === '') return '₹0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(numAmount);
  };

  // Data fetching effects
  useEffect(() => {
    if (!user) return;
    setLoadingTransactions(true);
    const ref = collection(db, 'users', user.uid, 'transactions');
    const q = query(ref, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TaxDeductibleTransaction[];
      setTransactions(data);
      setLoadingTransactions(false);
    }, (error) => {
      console.error(`Error fetching transactions:`, error);
      setLoadingTransactions(false);
    });

    return () => unsubscribe();
  }, [user]);

  const invalidateDashboardCache = useCallback(() => {
    if (user) {
      const cacheKey = `dashboard-summary-${user.uid}`;
      localStorage.removeItem(cacheKey);
    }
  }, [user]);

  const loading = loadingAuth || loadingTransactions;

  // Financial Health Score Calculation
  const financialHealth = useMemo(() => {
    if (loading) return { score: null, feedback: 'Calculating score...' };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    
    if (transactions.length === 0) {
      return { score: 0, feedback: 'Add transactions to see your score.' };
    }
    if (totalIncome === 0) return { score: 0, feedback: 'Add income to calculate score.' };

    const savingsRate = (totalIncome - totalExpenses) / totalIncome;
    let score = 50 + (savingsRate * 50);
    score = Math.max(0, Math.min(100, score));

    let feedback = 'You\'re on the right track!';
    if (score < 40) feedback = 'There is room for improvement. Focus on increasing your savings rate.';
    if (score > 80) feedback = 'Excellent! You are managing your funds very effectively.';

    return { score: Math.round(score), feedback };
  }, [transactions, loading]);

  // Generic add function for transactions
  const handleAddTransaction = async () => {
    if (!user) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: `Transaction added.` });
      setAddTransactionDialogOpen(false);
      invalidateDashboardCache();
    } catch (error) {
      console.error(`Error adding transaction:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not add transaction.` });
    } finally {
      setIsAdding(false);
    }
  };

  // Generic delete function for transactions
  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      toast({ title: 'Success', description: `Transaction removed.` });
      invalidateDashboardCache();
    } catch (error) {
        console.error(`Error deleting transaction:`, error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not remove transaction.` });
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

  const processFile = async (file: File) => {
    if (!user) return;
    setIsImporting(true);
    startProgressAnimation();

    try {
        const dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });

      const result = await extractTransactionsAction({ documentDataUri: dataUri });

      if (result.success && result.data.transactions.length > 0) {
        setExtractedData(result.data.transactions);
        setImportStep('confirm');
      } else {
        throw new Error(result.error || 'No transactions were extracted from the document.');
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
    if (files && files[0]) processFile(files[0]);
  };
  
  if (loadingAuth || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Financial Data...</h2>
      </div>
    );
  }

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
              {(financialHealth.score !== null && !isNaN(financialHealth.score)) && (
                <path
                  className="stroke-current text-primary"
                  strokeDasharray={`${financialHealth.score}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" strokeWidth="2.5" strokeLinecap="round" />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">
                {financialHealth.score !== null && !isNaN(financialHealth.score) ? financialHealth.score : <Loader2 className="h-6 w-6 animate-spin" />}
              </span>
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

      <Tabs defaultValue="cashflow">
        <div className="flex flex-wrap gap-4 justify-between items-center">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="tax">Tax</TabsTrigger>
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
                                <DialogDescription>
                                  Choose a document to import transactions from (e.g., PDF, JPG, PNG).
                                </DialogDescription>
                            </DialogHeader>
                             <div
                                className={cn('border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors flex flex-col items-center justify-center mt-4', { 'bg-accent': isDragging })}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); processFile(e.dataTransfer.files[0]); }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <FileUp className="w-8 h-8" />
                                  <p className="font-semibold">Upload a Document</p>
                                  <p className="text-xs">Drag & drop or click to upload</p>
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
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extractedData.map((t, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{t.description}</TableCell>
                                                <TableCell>{t.date}</TableCell>
                                                <TableCell className={cn("text-right font-mono", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount).replace('₹', '₹')}
                                                </TableCell>
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
        
        <TabsContent value="cashflow">
            <CashflowForecast transactions={transactions} isLoading={loadingTransactions} />
        </TabsContent>

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
                    <Button disabled={isAdding} onClick={handleAddTransaction}>
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
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTransactions ? <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> :
                  transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </TableCell>
                      <TableCell className={cn("text-right font-mono", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.id)}><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax</CardTitle>
              <CardDescription>Manage tax-related transactions and access resources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a href="https://eportal.incometax.gov.in/" target="_blank" rel="noopener noreferrer">
                        <Card className="hover:bg-accent/50 transition-colors">
                            <CardHeader className="flex-row items-center gap-4">
                                <Landmark className="w-8 h-8 text-primary"/>
                                <div>
                                    <h3 className="font-semibold">Income Tax Portal</h3>
                                    <p className="text-sm text-muted-foreground">File returns and manage taxes.</p>
                                </div>
                            </CardHeader>
                        </Card>
                    </a>
                     <a href="https://www.gst.gov.in/" target="_blank" rel="noopener noreferrer">
                        <Card className="hover:bg-accent/50 transition-colors">
                             <CardHeader className="flex-row items-center gap-4">
                                <FileText className="w-8 h-8 text-primary"/>
                                <div>
                                    <h3 className="font-semibold">GST Portal</h3>
                                    <p className="text-sm text-muted-foreground">Manage your GST compliance.</p>
                                </div>
                            </CardHeader>
                        </Card>
                    </a>
                </div>

                 <div>
                    <h3 className="text-lg font-semibold mb-2">Tax Deductible Expenses</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      A tax-deductible expense is a cost you incur to run your business that can be subtracted from your taxable income, lowering your tax bill. Common categories include office rent, employee salaries, raw materials, marketing costs, and travel expenses. Use the checklist below to mark your expenses and easily identify them for tax filing purposes.
                    </p>
                     <div className="max-h-96 overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted">
                                <TableRow>
                                    <TableHead className="w-10">
                                        <Percent className="w-4 h-4"/>
                                    </TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.filter(t => t.type === 'expense').map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={t.isTaxDeductible}
                                                onCheckedChange={(checked) => {
                                                    // This would update the document in a real app
                                                    console.log(`Set transaction ${t.id} deductible status to: ${checked}`);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{t.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(t.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                 </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
