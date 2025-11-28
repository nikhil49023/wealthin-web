
'use client';

import {useState, useRef, useEffect, useCallback} from 'react';
import {Button} from '@/components/ui/button';
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
import {Badge} from '@/components/ui/badge';
import {
  PlusCircle,
  Trash2,
  Upload,
  Loader2,
  FileUp,
  File as FileIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {useToast} from '@/hooks/use-toast';
import type {ExtractedTransaction} from '@/ai/schemas/transactions';
import {cn} from '@/lib/utils';
import {useAuth} from '@/context/auth-provider';
import {useLanguage} from '@/hooks/use-language';
import {useRouter} from 'next/navigation';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  writeBatch,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {getStorage, ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {app} from '@/lib/firebase';
import { extractTransactionsAction } from '@/app/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);
const storage = getStorage(app);

export default function TransactionsPage() {
  const {user, loading: loadingAuth} = useAuth();
  const [transactions, setTransactions] = useState<
    (ExtractedTransaction & {id: string})[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const {translations} = useLanguage();
  const router = useRouter();

  const [newTransaction, setNewTransaction] = useState({
    description: '',
    date: '',
    type: 'expense' as 'income' | 'expense',
    amount: '',
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

  const [isImporting, setIsImporting] = useState(false);

  const {toast} = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] =
    useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const invalidateDashboardCache = useCallback(() => {
    if (user) {
      const cacheKey = `dashboard-summary-${user.uid}`;
      localStorage.removeItem(cacheKey);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoadingData(true);
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const unsubscribe = onSnapshot(
        transactionsRef,
        snapshot => {
          const fetchedTransactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as (ExtractedTransaction & {id: string})[];
          setTransactions(fetchedTransactions);
          setLoadingData(false);
        },
        async (error) => {
          console.error('Error fetching transactions:', error);
          const permissionError = new FirestorePermissionError({
            path: transactionsRef.path,
            operation: 'list'
          });
          errorEmitter.emit('permission-error', permissionError);
          setLoadingData(false);
        }
      );
      return () => unsubscribe();
    } else if (!loadingAuth) {
      setLoadingData(false);
      setTransactions([]);
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  const handleClearData = async () => {
    if (!user) return;
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const querySnapshot = await getDocs(transactionsRef);
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    invalidateDashboardCache();
    toast({
      title: 'Success',
      description: translations.transactions.toasts.successClearData,
    });
  };

  const handleAddTransaction = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: translations.transactions.toasts.errorLoginToAdd,
      });
      return;
    }
    if (
      !newTransaction.description ||
      !newTransaction.date ||
      !newTransaction.amount
    ) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: translations.transactions.toasts.errorFillFields,
      });
      return;
    }

    setIsAddingTransaction(true);

    try {
      let invoiceUrl: string | undefined = undefined;

      if (invoiceFile) {
        const storageRef = ref(
          storage,
          `invoices/${user.uid}/${Date.now()}-${invoiceFile.name}`
        );
        const uploadResult = await uploadBytes(storageRef, invoiceFile);
        invoiceUrl = await getDownloadURL(uploadResult.ref);
      }

      const transactionData: Omit<ExtractedTransaction, 'invoiceUrl'> & {
        invoiceUrl?: string;
      } = {
        ...newTransaction,
      };
      if (invoiceUrl) {
        transactionData.invoiceUrl = invoiceUrl;
      }
      
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      addDoc(transactionsRef, transactionData)
      .then(() => {
        setNewTransaction({
            description: '',
            date: '',
            type: 'expense',
            amount: '',
        });
        setInvoiceFile(null);
        setAddTransactionDialogOpen(false);
        invalidateDashboardCache();
        toast({
            title: 'Success',
            description: translations.transactions.toasts.successAddTransaction,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: transactionsRef.path,
            operation: 'create',
            requestResourceData: transactionData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
      })

    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error Adding Transaction',
        description:
          'Could not save the transaction. Please check your connection.',
      });
    } finally {
      setIsAddingTransaction(false);
    }
  };

  const processFile = async (file: File) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: translations.transactions.toasts.errorLoginToImport,
      });
      return;
    }
    setIsImporting(true);
    setImportDialogOpen(false);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const documentDataUri = reader.result as string;

        const result = await extractTransactionsAction({documentDataUri});

        if (result.success) {
          const batch = writeBatch(db);
          const transactionsRef = collection(db, 'users', user.uid, 'transactions');
          result.data.transactions.forEach((transaction: ExtractedTransaction) => {
            const docRef = doc(transactionsRef);
            batch.set(docRef, transaction);
          });
          await batch.commit();

          invalidateDashboardCache();
          toast({
            title: 'Import Successful',
            description: `${result.data.transactions.length} ${translations.transactions.toasts.importSuccess}`,
          });
        } else {
          throw new Error(result.error || 'Failed to extract transactions.');
        }
        setIsImporting(false);
      };
      reader.onerror = error => {
        console.error('Error reading file:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: translations.transactions.toasts.errorReadingFile,
        });
        setIsImporting(false);
      };
    } catch (error: any) {
      console.error('File processing error:', error);
      toast({
        variant: 'destructive',
        title: translations.transactions.toasts.importFailed,
        description:
          error.message || translations.transactions.toasts.errorProcessingFile,
      });
      setIsImporting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleInvoiceFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      setInvoiceFile(event.target.files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const showLoginPrompt = !user && !loadingAuth;

  if (loadingAuth || loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {translations.transactions.title}
          </h1>
          <p className="text-muted-foreground">
            {translations.transactions.description}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={showLoginPrompt}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />{' '}
                {translations.transactions.clearAllData}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {translations.transactions.clearDataDialog.title}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {translations.transactions.clearDataDialog.description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {translations.transactions.clearDataDialog.cancel}
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData}>
                  {translations.transactions.clearDataDialog.continue}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            disabled={isImporting || showLoginPrompt}
            className="w-full"
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {translations.transactions.import}
          </Button>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {translations.transactions.importDialog.title}
                </DialogTitle>
                <DialogDescription>
                  {translations.transactions.importDialog.description}
                </DialogDescription>
              </DialogHeader>
              <div
                className={cn(
                  'mt-4 border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center cursor-pointer transition-colors',
                  {'bg-accent': isDragging}
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  id="document"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileUp className="w-8 h-8" />
                  <p>
                    {isDragging
                      ? translations.transactions.importDialog.dropHere
                      : translations.transactions.importDialog.dragDrop}
                  </p>
                  <p className="text-xs">
                    Supports PDF, images, documents, and CSV files.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={addTransactionDialogOpen}
            onOpenChange={setAddTransactionDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={showLoginPrompt} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />{' '}
                {translations.transactions.addTransaction}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {translations.transactions.addTransactionDialog.title}
                </DialogTitle>
                <DialogDescription>
                  {translations.transactions.addTransactionDialog.description}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    {
                      translations.transactions.addTransactionDialog
                        .descriptionLabel
                    }
                  </Label>
                  <Input
                    id="description"
                    value={newTransaction.description}
                    onChange={e =>
                      setNewTransaction({
                        ...newTransaction,
                        description: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    {translations.transactions.addTransactionDialog.dateLabel}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    onChange={e => {
                      if (e.target.value) {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          setNewTransaction({
                            ...newTransaction,
                            date: date.toLocaleDateString('en-GB'),
                          });
                        } else {
                          setNewTransaction({
                            ...newTransaction,
                            date: '',
                          });
                        }
                      }
                    }}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    {translations.transactions.addTransactionDialog.typeLabel}
                  </Label>
                  <Select
                    value={newTransaction.type}
                    onValueChange={(value: 'income' | 'expense') =>
                      setNewTransaction({...newTransaction, type: value})
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue
                        placeholder={
                          translations.transactions.addTransactionDialog
                            .typePlaceholder
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">
                        {
                          translations.transactions.addTransactionDialog
                            .expense
                        }
                      </SelectItem>
                      <SelectItem value="income">
                        {
                          translations.transactions.addTransactionDialog
                            .income
                        }
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    {translations.transactions.addTransactionDialog.amountLabel}
                  </Label>
                  <Input
                    id="amount"
                    value={newTransaction.amount}
                    onChange={e =>
                      setNewTransaction({
                        ...newTransaction,
                        amount: e.target.value,
                      })
                    }
                    className="col-span-3"
                    placeholder={
                      translations.transactions.addTransactionDialog
                        .amountPlaceholder
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="invoice" className="text-right">
                    Invoice
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="invoice"
                      type="file"
                      onChange={handleInvoiceFileChange}
                      className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {invoiceFile && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                        <FileIcon className="h-3 w-3" />
                        <span>{invoiceFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isAddingTransaction}
                  >
                    {translations.transactions.addTransactionDialog.cancel}
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleAddTransaction}
                  disabled={isAddingTransaction}
                >
                  {isAddingTransaction ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isAddingTransaction
                    ? 'Adding...'
                    : translations.transactions.addTransactionDialog
                        .addTransaction}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translations.transactions.history.title}</CardTitle>
          <CardDescription>
            {translations.transactions.history.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">
                  {translations.transactions.history.tableDescription}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {translations.transactions.history.tableDate}
                </TableHead>
                <TableHead>
                  {translations.transactions.history.tableType}
                </TableHead>
                <TableHead className="text-right">
                  {translations.transactions.history.tableAmount}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showLoginPrompt ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-24 text-muted-foreground"
                  >
                    {translations.transactions.history.loginPrompt}
                  </TableCell>
                </TableRow>
              ) : transactions.length > 0 ? (
                transactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {transaction.description}
                      <div className="text-muted-foreground text-xs sm:hidden">
                        {transaction.date}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {transaction.date}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === 'income'
                            ? 'default'
                            : 'destructive'
                        }
                        className={cn(
                          'capitalize',
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800'
                            : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800'
                        )}
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.amount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-24 text-muted-foreground"
                  >
                    {translations.transactions.history.noTransactions}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
