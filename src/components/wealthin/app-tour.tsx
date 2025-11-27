'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Home,
  Wallet,
  BrainCircuit,
  MessagesSquare,
  Rocket,
  Lightbulb,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-provider';

const tourSteps = [
  {
    icon: Lightbulb,
    title: 'Welcome to WealthIn!',
    description:
      "Let's take a quick tour to see how you can make the most of your financial co-pilot.",
  },
  {
    icon: Home,
    title: 'The Dashboard',
    description:
      'This is your financial command center. Get a quick overview of your income, expenses, and a daily AI-powered "Fin Bite" to guide you.',
  },
  {
    icon: Wallet,
    title: 'Manage Transactions',
    description:
      'Head to the Transactions page to add your income and expenses. You can add them manually or use our AI to import from a document!',
  },
  {
    icon: BrainCircuit,
    title: 'Brainstorm Business Ideas',
    description:
      'Explore curated startup ideas, or analyze your own. Our AI provides a detailed analysis, helping you build a solid business plan.',
  },
  {
    icon: MessagesSquare,
    title: 'AI Financial Advisor',
    description:
      'Have a financial question? Ask our AI Advisor. It uses your transaction history to give personalized and contextual advice.',
  },
  {
    icon: Rocket,
    title: 'Launchpad & Growth Hub',
    description:
      'Discover government schemes, connect with other MSMEs in the marketplace, and find resources to launch and grow your business.',
  },
];

type AppTourProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete: () => void;
};

export default function AppTour({
  isOpen,
  onOpenChange,
  onComplete,
}: AppTourProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { userProfile } = useAuth();
  
  const isMsme = userProfile?.role === 'msme';
  
  if (isMsme) {
      tourSteps[tourSteps.length -1].title = "Growth Hub"
  } else {
      tourSteps[tourSteps.length -1].title = "Launchpad"
  }

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const CurrentIcon = tourSteps[step].icon;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center pt-8">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CurrentIcon className="h-10 w-10 text-primary" />
          </div>
        </DialogHeader>

        <div className="relative h-40 overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute w-full text-center"
            >
              <DialogTitle className="text-2xl">
                {tourSteps[step].title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                {tourSteps[step].description}
              </DialogDescription>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="flex-row justify-between w-full">
          <Button variant="ghost" onClick={handlePrev} disabled={step === 0}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <Button onClick={handleNext}>
            {step === tourSteps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
