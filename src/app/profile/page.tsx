
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
import { LogOut, Loader2, Briefcase, Building, Phone, MapPin, Edit, Link as LinkIcon, Trash2, Gem, Crown, Check } from 'lucide-react';
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
import { useAuth } from '@/context/auth-provider';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, deleteUser } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

const db = getFirestore(app);
const auth = getAuth(app);

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
            errorEmitter.emit('permission-error', permissionError);
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
          <div className="flex justify-center items-center gap-2 pt-4">
            <Gem className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold">{userProfile?.credits ?? 0} Credits</span>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="default">Recharge Credits (Demo)</Button>
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
              <Button variant="destructive">
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

      {/* Subscription Plans Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold text-center">Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Individual Pro Plan */}
          <Card className={cn("flex flex-col")}>
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 text-primary rounded-full mb-2">
                  <Gem className="h-8 w-8" />
              </div>
              <CardTitle>Individual Pro</CardTitle>
              <CardDescription>
                Unlock powerful tools to build and grow your venture.
              </CardDescription>
              <p className="text-4xl font-bold pt-2">₹30 <span className="text-base font-normal text-muted-foreground">/ month</span></p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"/>
                        <span><span className="font-semibold text-foreground">DPR Generation:</span> Get 1 full DPR export per month to secure loans and funding.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"/>
                        <span><span className="font-semibold text-foreground">Community Access:</span> Network with fellow entrepreneurs and mentors.</span>
                    </li>
                     <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"/>
                        <span>Includes all free services like AI chat and idea analysis.</span>
                    </li>
                </ul>
            </CardContent>
            <CardContent>
              <Button className="w-full" disabled>Choose Plan (Demo)</Button>
            </CardContent>
          </Card>
          
          {/* Enterprise Pro Plan */}
          <Card className={cn("flex flex-col border-primary shadow-lg")}>
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 text-primary rounded-full mb-2">
                  <Crown className="h-8 w-8" />
              </div>
              <CardTitle>Enterprise Pro</CardTitle>
              <CardDescription>
                Maximize your visibility and scale your business.
              </CardDescription>
              <p className="text-4xl font-bold pt-2">₹50-60 <span className="text-base font-normal text-muted-foreground">/ month</span></p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"/>
                        <span><span className="font-semibold text-foreground">Prioritized Marketplace Listing:</span> Get your services featured at the top.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"/>
                        <span><span className="font-semibold text-foreground">Enterprise Community:</span> Access to an exclusive network of established businesses.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"/>
                        <span><span className="font-semibold text-foreground">DPR Generation:</span> Includes 1 DPR export per month.</span>
                    </li>
                </ul>
            </CardContent>
            <CardContent>
              <Button className="w-full" disabled>Choose Plan (Demo)</Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
