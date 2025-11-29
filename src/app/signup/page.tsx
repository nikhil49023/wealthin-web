
'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import Link from 'next/link';
import {useToast} from '@/hooks/use-toast';
import {useRouter} from 'next/navigation';
import {Loader2, ArrowLeft, ArrowRight, Info, Wallet} from 'lucide-react';
import {app} from '@/lib/firebase';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {getFirestore, doc, setDoc, serverTimestamp} from 'firebase/firestore';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Progress} from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {motion, AnimatePresence} from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const auth = getAuth(app);
const db = getFirestore(app);

const msmeServiceCategories = [
  'IT / Software Services',
  'Retail / E-commerce',
  'Construction / Real Estate',
  'Manufacturing',
  'Food & Agro Processing',
  'Hospitality & Tourism',
  'Healthcare & Pharma',
  'Logistics & Supply Chain',
  'Professional Services (Accounting, Legal, etc.)',
  'Textiles & Apparel',
  'Other',
];

const individualSteps = [
  {
    field: 'role',
    title: 'Select Account Type',
    description: 'Are you an individual or representing an MSME?',
  },
  {
    field: 'displayName',
    title: 'What is your name?',
    description: 'This will be used to personalize your experience.',
  },
  {
    field: 'email',
    title: 'Enter your email',
    description: 'This will be your login username.',
  },
  {
    field: 'password',
    title: 'Create a password',
    description: 'Must be at least 6 characters long.',
  },
];

const msmeSteps = [
  ...individualSteps.slice(0, 4),
  {
    field: 'msmeName',
    title: 'What is your MSME Name?',
    description: 'Your official business or brand name.',
  },
  {
    field: 'msmeDescription',
    title: 'Describe your Business',
    description: 'A short description of what your business does.',
  },
  {
    field: 'msmeService',
    title: 'What is your primary service category?',
    description: 'Select the category that best fits your business.',
  },
  {
    field: 'msmeLocation',
    title: 'Where is your business located?',
    description: 'e.g., Pune, Maharashtra',
  },
  {
    field: 'ownerContact',
    title: 'What is your contact number?',
    description: 'This will be shared with potential clients.',
  },
  {
    field: 'msmeWebsite',
    title: 'What is your business website?',
    description: 'Enter your website URL or a link to a social media profile.',
  },
];

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    role: 'individual' as 'individual' | 'msme',
    displayName: '',
    email: '',
    password: '',
    msmeName: '',
    msmeDescription: '',
    msmeService: '',
    msmeLocation: '',
    ownerContact: '',
    msmeWebsite: '',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [direction, setDirection] = useState(1);
  const {toast} = useToast();
  const router = useRouter();

  const steps = formData.role === 'msme' ? msmeSteps : individualSteps;
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / (steps.length + 1)) * 100;

  const handleNext = () => {
    // Validation
    const currentField = currentStepData.field as keyof typeof formData;
    if (!formData[currentField]) {
      toast({variant: 'destructive', description: 'Please fill in the field.'});
      return;
    }
    if (currentField === 'password' && formData.password.length < 6) {
      toast({
        variant: 'destructive',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleSignUp = async () => {
    const requiredIndividualFields: (keyof typeof formData)[] = ['displayName', 'email', 'password'];
    for (const field of requiredIndividualFields) {
        if (!formData[field]) {
            toast({ variant: 'destructive', description: `Please ensure the '${field}' field is filled out.` });
            return;
        }
    }
    if (formData.password.length < 6) {
        toast({ variant: 'destructive', description: 'Password must be at least 6 characters.' });
        return;
    }

    if (formData.role === 'msme') {
        const requiredMsmeFields: (keyof typeof formData)[] = ['msmeName', 'msmeDescription', 'msmeService', 'msmeLocation', 'ownerContact'];
        for (const field of requiredMsmeFields) {
            if (!formData[field]) {
                toast({ variant: 'destructive', description: `Please ensure the '${field}' field is filled out.` });
                return;
            }
        }
    }
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      await updateProfile(user, {displayName: formData.displayName});

      // Create a user profile document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const privateProfileData: any = {
        uid: user.uid,
        displayName: formData.displayName,
        email: user.email,
        role: formData.role,
        createdAt: serverTimestamp(),
        credits: 20, // Start with 20 credits
        hasCompletedTour: false, // New user flag
        creditHistory: [{
          amount: 20,
          description: 'Welcome Bonus!',
          date: serverTimestamp()
        }],
        completedGoals: [],
      };

      if (formData.role === 'msme') {
        privateProfileData.msmeName = formData.msmeName;
        privateProfileData.msmeDescription = formData.msmeDescription;
        privateProfileData.msmeService = formData.msmeService;
        privateProfileData.msmeLocation = formData.msmeLocation;
        privateProfileData.ownerContact = formData.ownerContact;
        privateProfileData.msmeWebsite = formData.msmeWebsite;
        
        // Also create the public MSME profile for the marketplace
        const msmeProfileRef = doc(db, 'msme-profiles', user.uid);
        const publicProfileData = {
           uid: user.uid,
           displayName: formData.displayName,
           email: user.email,
           msmeName: formData.msmeName,
           msmeDescription: formData.msmeDescription,
           msmeService: formData.msmeService,
           msmeLocation: formData.msmeLocation,
           ownerContact: formData.ownerContact,
           msmeWebsite: formData.msmeWebsite,
        };
        await setDoc(msmeProfileRef, publicProfileData, { merge: true });
      }

      await setDoc(userDocRef, privateProfileData);

      toast({
        title: 'Account Created!',
        description: 'You are now logged in. Redirecting to your dashboard...',
      });

      // The AuthProvider will handle redirection on successful login.
    } catch (error: any) {
      let description = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
          case 'auth/email-already-in-use':
              description = 'This email address is already in use by another account.';
              break;
          case 'auth/invalid-email':
              description = 'The email address is not valid.';
              break;
          case 'auth/weak-password':
              description = 'The password is too weak. Please use at least 6 characters.';
              break;
      }
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: description,
      });
      setIsLoading(false);
    }
  };

  const renderInput = () => {
    switch (currentStepData.field) {
      case 'role':
        return (
          <RadioGroup
            defaultValue={formData.role}
            onValueChange={(value: 'individual' | 'msme') =>
              handleChange('role', value)
            }
            className="flex gap-4 pt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual" className="text-base">
                Individual
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="msme" id="msme" />
              <Label htmlFor="msme" className="text-base">
                MSME
              </Label>
            </div>
          </RadioGroup>
        );
      case 'password':
        return (
          <Input
            id={currentStepData.field}
            type="password"
            value={formData[currentStepData.field as keyof typeof formData]}
            onChange={e =>
              handleChange(
                currentStepData.field as keyof typeof formData,
                e.target.value
              )
            }
          />
        );
      case 'msmeService':
        return (
          <Select
            value={formData.msmeService}
            onValueChange={value => handleChange('msmeService', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a service category" />
            </SelectTrigger>
            <SelectContent>
              {msmeServiceCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'msmeWebsite':
        return (
          <div className="space-y-4">
            <Input
              id={currentStepData.field}
              value={formData[currentStepData.field as keyof typeof formData]}
              onChange={e =>
                handleChange(
                  currentStepData.field as keyof typeof formData,
                  e.target.value
                )
              }
              placeholder="e.g., www.mybusiness.com"
            />
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                No website? No problem! You can use a link to your profile on any social media platform instead.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <Input
            id={currentStepData.field}
            value={formData[currentStepData.field as keyof typeof formData]}
            onChange={e =>
              handleChange(
                currentStepData.field as keyof typeof formData,
                e.target.value
              )
            }
          />
        );
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 30 : -30,
      opacity: 0,
    }),
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center items-center h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto">
            <Wallet className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Create a WealthIn Account</h1>
        </div>

        <Card className="overflow-hidden">
          <Progress
            value={progress}
            className="w-full h-1 rounded-none bg-primary/20 [&>div]:bg-primary"
          />
          <div className="relative h-64">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: {type: 'spring', stiffness: 300, damping: 30},
                  opacity: {duration: 0.2},
                }}
                className="absolute w-full"
              >
                <CardHeader>
                  <CardTitle>{currentStepData.title}</CardTitle>
                  <CardDescription>{currentStepData.description}</CardDescription>
                </CardHeader>
                <CardContent>{renderInput()}</CardContent>
              </motion.div>
            </AnimatePresence>
          </div>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || isLoading}
            >
              <ArrowLeft className="mr-2" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight className="ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSignUp} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="underline hover:text-primary">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
