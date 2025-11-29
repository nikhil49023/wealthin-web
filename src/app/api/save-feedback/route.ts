
'use server';

import { NextResponse } from 'next/server';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Using standard auth
import { app } from '@/lib/firebase';

const db = getFirestore(app);

// Note: This API route doesn't have user authentication yet.
// In a real app, you'd get the user from the session.

export async function POST(req: Request) {
  try {
    const { feedback, page, ideaTitle } = await req.json();
    
    if (!feedback || !page) {
      return NextResponse.json(
        { message: 'Feedback and page are required.' },
        { status: 400 }
      );
    }

    const feedbackRef = collection(db, 'dpr-feedback');
    await addDoc(feedbackRef, {
      // userId: user?.uid || 'anonymous', // Add user ID when auth is available
      feedback,
      page,
      ideaTitle: ideaTitle || 'N/A',
      timestamp: serverTimestamp(),
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully.' });

  } catch (error: any) {
    console.error('Error saving feedback:', error);
    // Avoid exposing internal errors to the client
    return NextResponse.json(
      { message: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}

    