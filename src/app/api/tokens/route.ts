import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getUserTokenCount } from '@/libs/DB';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const tokenCount = await getUserTokenCount(userId);

    return NextResponse.json({ tokenCount });
  } catch (error) {
    console.error('Error fetching token count:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 