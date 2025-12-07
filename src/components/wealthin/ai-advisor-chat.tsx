
'use client';

import {useState, useRef, useEffect, type ElementRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Send, Sparkles, User, Loader2} from 'lucide-react';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {motion, AnimatePresence} from 'framer-motion';
import type {ExtractedTransaction} from '@/ai/schemas/transactions';
import {useAuth, type UserProfile} from '@/context/auth-provider';
import {useLanguage} from '@/hooks/use-language';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {app} from '@/lib/firebase';
import { generateRagAnswerAction } from '@/app/actions';
import { FormattedText } from '@/components/wealthin/formatted-text';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

const db = getFirestore(app);

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

type AIAdvisorChatProps = {
  initialMessage?: string;
};

const getUniqueMessageId = () => `msg-${Date.now()}-${Math.random()}`;

export default function AIAdvisorChat({initialMessage}: AIAdvisorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const {user, userProfile, loading: loadingAuth} = useAuth();
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [marketplaceProfiles, setMarketplaceProfiles] = useState<UserProfile[]>([]);
  const {translations} = useLanguage();

  useEffect(() => {
    if (user) {
      // --- Listener for recent transactions ---
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, orderBy('date', 'desc'), limit(20));
      const unsubTransactions = onSnapshot(q, snapshot => {
        setTransactions(snapshot.docs.map(
          doc => doc.data() as ExtractedTransaction
        ));
      },
      (error) => {
        console.error("AI Advisor transactions snapshot error", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: transactionsRef.path, operation: 'list'
        }));
      });

      // --- Listener for MSME marketplace profiles ---
      const msmeRef = collection(db, 'msme-profiles');
      const unsubMsme = onSnapshot(msmeRef, snapshot => {
        setMarketplaceProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
      },
      (error) => {
        console.error("AI Advisor MSME profiles snapshot error", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: msmeRef.path, operation: 'list'
        }));
      });

      return () => {
        unsubTransactions();
        unsubMsme();
      };
    }
  }, [user]);

  // Effect to handle the entire initial message flow
  useEffect(() => {
    const welcomeMessage: Message = {
      id: getUniqueMessageId(),
      text: translations.aiAdvisor.welcome,
      sender: 'ai',
    };
    
    if (initialMessage) {
        const initialUserMessage: Message = {
            id: getUniqueMessageId(),
            text: initialMessage,
            sender: 'user',
        };
        setMessages([welcomeMessage, initialUserMessage]);
        handleSendMessage(undefined, initialMessage);
    } else {
        setMessages([welcomeMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, translations.aiAdvisor.welcome]);


  const scrollToBottom = () => {
    bottomOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (
    e?: React.FormEvent,
    messageText?: string,
  ) => {
    e?.preventDefault();
    const queryText = messageText || input;
    if (!queryText.trim() || isLoading) return;

    if (!messageText) {
      const newUserMessage: Message = {
        id: getUniqueMessageId(),
        text: queryText,
        sender: 'user',
      };
      setMessages(prev => [...prev, newUserMessage]);
    }

    setInput('');
    setIsLoading(true);

    try {
       // Sanitize transactions before sending to server action
      const plainTransactions = transactions.map(t => {
        const plainT: { [key: string]: any } = { ...t };
        for (const key in plainT) {
            if (plainT[key] instanceof Timestamp) {
                plainT[key] = plainT[key].toDate().toISOString();
            } else if (plainT[key] && typeof plainT[key] === 'object' && 'toDate' in plainT[key]) {
                plainT[key] = (plainT[key] as Timestamp).toDate().toISOString();
            }
        }
        return plainT as ExtractedTransaction;
      });
      
      const result = await generateRagAnswerAction({
        query: queryText, 
        transactions: plainTransactions,
        userProfile: userProfile || undefined,
        marketplaceProfiles: marketplaceProfiles,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to get a response from the AI.');
      }

      const newAiMessage: Message = {
        id: getUniqueMessageId(),
        text: result.data.answer,
        sender: 'ai',
      };
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error: any) {
      console.error('Error calling RAG API:', error);
      const errorAiMessage: Message = {
        id: getUniqueMessageId(),
        text: error.message || translations.aiAdvisor.error,
        sender: 'ai',
      };
      setMessages(prev => [...prev, errorAiMessage]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="flex-1 space-y-6 p-4 sm:p-6 overflow-y-auto">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.3}}
              className={`flex items-start gap-3 ${
                message.sender === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.sender === 'ai' && (
                <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                  <AvatarFallback>
                    <Sparkles className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 max-w-sm text-sm ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.sender === 'user' ? <p>{message.text}</p> : <FormattedText text={message.text} />}
                 {message.sender === 'ai' && index > 0 && (
                  <Badge variant="outline" className="mt-3 border-blue-200 bg-blue-50 text-blue-800 text-xs">
                    Powered by WealthIn AI
                  </Badge>
                )}
              </div>
              {message.sender === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3, delay: 0.2}}
            className="flex items-start gap-3"
          >
            <Avatar className="h-8 w-8 bg-primary/20 text-primary">
              <AvatarFallback>
                <Sparkles className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3 max-w-md">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </motion.div>
        )}
        <div ref={bottomOfChatRef} />
      </div>
      <div className="p-2 sm:p-4 border-t bg-background/80 backdrop-blur-sm md:bg-card md:backdrop-blur-none">
        <form onSubmit={handleSendMessage} className="relative flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={translations.aiAdvisor.inputPlaceholder}
            className="h-11"
            disabled={isLoading || (!user && !loadingAuth)}
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 flex-shrink-0"
            disabled={isLoading || !input.trim() || (!user && !loadingAuth)}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
