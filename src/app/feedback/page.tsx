'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FeedbackPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Feedback &amp; Support</h1>
        <Button asChild variant="ghost">
          <Link href="/profile">
            <ArrowLeft className="mr-2" />
            Back to Profile
          </Link>
        </Button>
      </div>
      <div className="flex-1 w-full h-full rounded-lg overflow-hidden border">
        <iframe
          aria-label="WealthIn Feedback"
          frameBorder="0"
          style={{ height: '100%', width: '100%', border: 'none' }}
          src="https://forms.zohopublic.in/sainikhilkilani621gm1/form/Contactwithfeedback/formperma/UDR5Z4RLNZJLRvVsEJg3IVod_kZviMOWQKbI7ERRYe4"
        ></iframe>
      </div>
    </div>
  );
}
