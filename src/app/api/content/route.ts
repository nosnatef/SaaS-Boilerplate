import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { 
  createUserContent, 
  getUserTokenCount, 
  decrementUserTokens 
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

    // Check if user has tokens
    const tokenCount = await getUserTokenCount(userId);
    if (tokenCount <= 0) {
      return new NextResponse('Insufficient tokens. Please purchase more tokens to continue.', { status: 402 });
    }

    // Get user info for createdBy field
    const user = await currentUser();
    const createdBy = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user?.emailAddresses?.[0]?.emailAddress || 'Unknown User';

    // Create the content
    const userContent = await createUserContent({
      userId,
      content,
      createdBy,
    });

    // Decrement user tokens
    await decrementUserTokens(userId);

    return NextResponse.json({ 
      success: true, 
      content: userContent,
      remainingTokens: tokenCount - 1
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