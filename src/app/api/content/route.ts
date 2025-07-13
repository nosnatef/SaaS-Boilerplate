import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { 
  consumeTokenAndCreateContent,
  getUserSubscription
} from '@/libs/DB';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new NextResponse('Content is required and must be a string', { status: 400 });
    }

    // Get user info for createdBy field
    const user = await currentUser();
    const createdBy = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user?.emailAddresses?.[0]?.emailAddress || 'Unknown User';


    // Create the content (consumeTokenAndCreateContent handles token validation atomically)
    const result = await consumeTokenAndCreateContent({
      userId,
      content,
      createdBy,
    });

    return NextResponse.json({ 
      success: true, 
      content: result.content,
      remainingTokens: result.remainingTokens
    });
  } catch (error) {
    console.error('Error creating content:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { getUserContent } = await import('@/libs/DB');
    const userContent = await getUserContent(userId);

    return NextResponse.json({ content: userContent });
  } catch (error) {
    console.error('Error fetching user content:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 