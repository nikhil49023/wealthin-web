
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Loader2, Briefcase, Building, Phone, MapPin, Edit, Link as LinkIcon, Trash2, Gem, Crown, Check, Plus, Minus, History, MessageSquare } from 'lucide-react';
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
import { useLanguage } from '@/hooks/use-language';
import { useAuth, type CreditTransaction } from '@/context/auth-provider';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getAuth, deleteUser } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const db = getFirestore(app);
const auth = getAuth(app);

const rechargeOptions = [
    { credits: 10, price: 10 },
    { credits: 25, price: 25 },
    { credits: 50, price: 50 },
];

export default function ProfilePage() {
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const { translations } = useLanguage();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isMsme = userProfile?.role === 'msme';
  
  const [msmeData, setMsmeData] = useState({
    msmeName: userProfile?.msmeName || '',
    msmeService: userProfile?.msmeService || '',
    msmeLocation: userProfile?.msmeLocation || '',
    ownerContact: userProfile?.ownerContact || '',
    msmeWebsite: userProfile?.msmeWebsite || '',
  });

  const handleMsmeDataChange = (field: keyof typeof msmeData, value: string) => {
    setMsmeData(prev => ({...prev, [field]: value}));
  };

  const handleSaveChanges = async () => {
    if (!user || !userProfile) return;
    setIsSaving(true);
    
    const userDocRef = doc(db, 'users', user.uid);
    const msmeProfileRef = doc(db, 'msme-profiles', user.uid);

    const privateData = { ...userProfile, ...msmeData };
    const publicData = {
      uid: user.uid,
      displayName: userProfile.displayName,
      email: userProfile.email,
      msmeName: msmeData.msmeName,
      msmeService: msmeData.msmeService,
      msmeLocation: msmeData.msmeLocation,
      ownerContact: msmeData.ownerContact,
      msmeWebsite: msmeData.msmeWebsite,
    };

    const privateUpdate = setDoc(userDocRef, privateData, { merge: true }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: privateData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error('Failed to update private profile.');
    });

    const publicUpdate = setDoc(msmeProfileRef, publicData, { merge: true }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: msmeProfileRef.path,
            operation: 'update',
            requestResourceData: publicData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error('Failed to update public MSME profile.');
    });


    Promise.all([privateUpdate, publicUpdate])
        .then(() => {
            toast({ title: 'Success', description: 'Your profile has been updated.'});
            setEditDialogOpen(false);
        })
        .catch((error) => {
            console.error("Error updating profile:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your profile.'});
        })
        .finally(() => {
            setIsSaving(false);
        });
  };


  const handleLogout = () => {
    signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // First, delete Firestore data (private user doc and public msme profile)
      const userDocRef = doc(db, 'users', user.uid);
      const deleteUserDoc = deleteDoc(userDocRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error('Failed to delete user data.');
      });

      const operations = [deleteUserDoc];

      if (isMsme) {
          const msmeProfileRef = doc(db, 'msme-profiles', user.uid);
          const deleteMsmeDoc = deleteDoc(msmeProfileRef).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: msmeProfileRef.path, operation: 'delete' });
            // Don't throw here to allow user deletion to proceed if only this fails
          });
          operations.push(deleteMsmeDoc);
      }
      
      await Promise.all(operations);

      // Then, delete the user from Firebase Auth
      await deleteUser(user);
      
      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: `${error.message} You may need to log out and log in again before deleting your account.`,
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  
  const sortedCreditHistory = userProfile?.creditHistory
    ? [...userProfile.creditHistory].sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toMillis() : Date.parse(a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toMillis() : Date.parse(b.date);
        return dateB - dateA;
      })
    : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <Card>
        <CardHeader className="text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary">
            <AvatarFallback className="text-3xl bg-muted">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.displayName || 'User'}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
           <Button asChild variant="outline">
              <a href="https://forms.zohopublic.in/sainikhilkilani621gm1/form/Contactwithfeedback/formperma/UDR5Z4RLNZJLRvVsEJg3IVod_kZviMOWQKbI7ERRYe4" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2" />
                Feedback & Support
              </a>
           </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <LogOut className="mr-2" />
                {translations.sidebar.logout}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{translations.logoutDialog.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {translations.logoutDialog.description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{translations.logoutDialog.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  {translations.logoutDialog.confirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="sm:col-span-2 lg:col-span-1">
                <Trash2 className="mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      
      {/* Credits Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Gem /> Credits</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle>Your Balance</CardTitle>
                 </CardHeader>
                 <CardContent className="text-center">
                    <p className="text-5xl font-bold">{userProfile?.credits ?? 0}</p>
                    <p className="text-muted-foreground">Available Credits</p>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="mt-6 w-full">Recharge Credits</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Recharge Credits</DialogTitle>
                                <DialogDescription>Select a pack to add credits to your account. (1 Credit ≈ ₹1)</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                                {rechargeOptions.map(option => (
                                    <Card key={option.credits} className="text-center p-4 cursor-pointer hover:border-primary transition-colors">
                                        <p className="text-3xl font-bold">{option.credits}</p>
                                        <p className="text-muted-foreground">Credits</p>
                                        <Button variant="outline" size="sm" className="mt-4">
                                            Pay ₹{option.price}
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                 </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> Credit History</CardTitle>
                 </CardHeader>
                 <CardContent>
                    {sortedCreditHistory.length > 0 ? (
                        <div className="space-y-4 pr-2">
                            {sortedCreditHistory.map((tx, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("flex items-center justify-center h-8 w-8 rounded-full", tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}>
                                            {tx.amount > 0 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {tx.date instanceof Timestamp ? formatDistanceToNow(tx.date.toDate(), { addSuffix: true }) : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={cn("font-bold", tx.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-10">No credit history yet.</p>
                    )}
                 </CardContent>
            </Card>
        </div>
      </div>


      {isMsme && userProfile && (
        <Card>
           <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Briefcase />
                  My MSME Profile
                </CardTitle>
                <CardDescription>
                  This is your business information as it appears to others in the marketplace.
                </CardDescription>
              </div>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4"/> Edit
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit MSME Profile</DialogTitle>
                        <DialogDescription>Update your business details below.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="msmeName">Business Name</Label>
                            <Input id="msmeName" value={msmeData.msmeName} onChange={(e) => handleMsmeDataChange('msmeName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="msmeService">Service / Product</Label>
                            <Input id="msmeService" value={msmeData.msmeService} onChange={(e) => handleMsmeDataChange('msmeService', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="msmeLocation">Location</Label>
                            <Input id="msmeLocation" value={msmeData.msmeLocation} onChange={(e) => handleMsmeDataChange('msmeLocation', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ownerContact">Contact Number</Label>
                            <Input id="ownerContact" value={msmeData.ownerContact} onChange={(e) => handleMsmeDataChange('ownerContact', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="msmeWebsite">Website URL</Label>
                            <Input id="msmeWebsite" value={msmeData.msmeWebsite} onChange={(e) => handleMsmeDataChange('msmeWebsite', e.target.value)} placeholder="e.g., www.mybusiness.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Business Name</h4>
                      <p className="text-muted-foreground">{userProfile.msmeName || 'Not Provided'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Location</h4>
                      <p className="text-muted-foreground">{userProfile.msmeLocation || 'Not Provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Service / Product</h4>
                      <p className="text-muted-foreground">{userProfile.msmeService || 'Not Provided'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Contact Number</h4>
                      <p className="text-muted-foreground">{userProfile.ownerContact || 'Not Provided'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                    <LinkIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Website</h4>
                      {userProfile.msmeWebsite ? (
                         <a href={userProfile.msmeWebsite.startsWith('http') ? userProfile.msmeWebsite : `https://${userProfile.msmeWebsite}`} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">
                           {userProfile.msmeWebsite}
                         </a>
                      ) : (
                        <p className="text-muted-foreground">Not Provided</p>
                      )}
                    </div>
                  </div>
               </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
