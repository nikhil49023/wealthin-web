
'use client';

import { useState } from 'react';
import AIAdvisorChat from '@/components/financify/ai-advisor-chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, Lightbulb, Send } from 'lucide-react';

export default function AIAdvisorPage() {
  // The key is now used to force-remount the chat component with a new initial question.
  const [chatKey, setChatKey] = useState(Date.now());
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>();
  
  const sampleQuestions = [
    "Where is most of my money going?",
    "Suggest some ways I can reduce my monthly expenses.",
    "What are some government schemes for new MSMEs in Andhra Pradesh?",
    "How can I get a collateral-free loan for my small business?",
  ];

  const handleSampleQuestionClick = (question: string) => {
    setInitialQuestion(question);
    setChatKey(Date.now()); // Change the key to force a remount
  };

  return (
    <div className="flex flex-col gap-6">
       <Card>
          <CardHeader className="p-4 md:p-6">
             <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5"/>
                Click a question to get started
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sampleQuestions.map((q, i) => (
                <Card 
                  key={i} 
                  onClick={() => handleSampleQuestionClick(q)}
                  className="group cursor-pointer hover:bg-accent transition-colors"
                >
                  <CardContent className="p-3 flex items-center justify-between">
                      <p className="text-sm font-medium">{q}</p>
                      <Send className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
       </Card>
       
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 [&>svg]:text-amber-600 text-xs">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            AI-generated advice can sometimes be inaccurate. Please cross-verify important information with a qualified professional.
          </AlertDescription>
        </Alert>

      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0">
          <AIAdvisorChat key={chatKey} initialMessage={initialQuestion} />
        </CardContent>
      </Card>
    </div>
  );
}
