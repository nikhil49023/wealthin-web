
'use client';

import { Suspense } from 'react';
import AIAdvisorChat from '@/components/wealthin/ai-advisor-chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, Lightbulb, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function AIAdvisorPageContent() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get('q') || undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            Your Personal AI Financial Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
           <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 [&>svg]:text-amber-600 text-xs">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              AI-generated advice can sometimes be inaccurate. Please cross-verify important information with a qualified professional.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0">
          <AIAdvisorChat key={initialQuestion || 'initial'} initialMessage={initialQuestion} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AIAdvisorPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <AIAdvisorPageContent />
        </Suspense>
    )
}
