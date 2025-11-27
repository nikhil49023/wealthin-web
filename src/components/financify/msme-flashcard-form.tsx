'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

// This type is now defined in page.tsx and this file is not used.
// It is kept here to avoid breaking changes but can be removed later.
type MsmeData = {
  msmeName: string;
  msmeService: string;
  msmeLocation: string;
  ownerContact: string;
};

const questions = [
  {
    key: 'msmeName' as keyof MsmeData,
    label: 'What is your MSME Name?',
    placeholder: 'e.g., GreenPack Industries',
  },
  {
    key: 'msmeService' as keyof MsmeData,
    label: 'What service or product do you offer?',
    placeholder: 'e.g., Eco-friendly Packaging',
  },
  {
    key: 'msmeLocation' as keyof MsmeData,
    label: 'Where is your business located?',
    placeholder: 'e.g., Pune, Maharashtra',
  },
  {
    key: 'ownerContact' as keyof MsmeData,
    label: 'What is your contact number?',
    placeholder: 'e.g., 9876543210',
    type: 'tel',
  },
];

type MsmeFlashcardFormProps = {
  onDataChange: (data: MsmeData) => void;
};

export default function MsmeFlashcardForm({ onDataChange }: MsmeFlashcardFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MsmeData>({
    msmeName: '',
    msmeService: '',
    msmeLocation: '',
    ownerContact: '',
  });
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const progress = ((currentStep + 1) / questions.length) * 100;
  const currentQuestion = questions[currentStep];
  const currentValue = formData[currentQuestion.key];
  
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
    <div className="space-y-4">
        <Progress value={progress} className="w-full h-1" />
        <div className="relative h-48 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                    }}
                    className="absolute w-full"
                >
                    <Card className="glassmorphic">
                        <CardContent className="p-6 space-y-4">
                        <Label htmlFor={currentQuestion.key} className="text-lg font-medium">{currentQuestion.label}</Label>
                        <Input
                            id={currentQuestion.key}
                            name={currentQuestion.key}
                            value={currentValue}
                            onChange={handleChange}
                            placeholder={currentQuestion.placeholder}
                            type={currentQuestion.type || 'text'}
                            className="bg-transparent"
                            autoComplete="off"
                        />
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>

      <div className="flex justify-between mt-4">
        <Button onClick={handlePrev} variant="outline" disabled={currentStep === 0}>
          Previous
        </Button>
        <Button onClick={handleNext} variant="outline" disabled={currentStep === questions.length - 1 || !currentValue}>
          Next
        </Button>
      </div>
    </div>
  );
}
