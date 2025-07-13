import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getUserTokenCount, getUserSubscription } from '@/libs/DB';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user has a subscription record
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return new NextResponse('No subscription found', { status: 404 });
    }

    const tokenCount = await getUserTokenCount(userId);

    return NextResponse.json({ tokenCount });
  } catch (error) {
    console.error('Error fetching token count:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 