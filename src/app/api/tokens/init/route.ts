import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getUserSubscription, createBasicUserSubscription } from '@/libs/DB';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user already has a subscription record
    const existingSubscription = await getUserSubscription(userId);
    
    if (existingSubscription) {
      // If user exists but has no tokens, initialize with 10 tokens
      if (!existingSubscription.token || existingSubscription.token <= 0) {
        const { addUserTokens } = await import('@/libs/DB');
        await addUserTokens(userId, 10);
        return NextResponse.json({ 
          success: true, 
          message: 'Tokens initialized',
          tokenCount: 10 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'User already has tokens',
        tokenCount: existingSubscription.token 
      });
    }

    // Create new subscription record with initial tokens
    await createBasicUserSubscription(userId);

    return NextResponse.json({ 
      success: true, 
      message: 'User subscription and tokens initialized',
      tokenCount: 10 
    });
  } catch (error) {
    console.error('Error initializing tokens:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 