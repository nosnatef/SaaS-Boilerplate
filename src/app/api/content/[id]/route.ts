import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { deleteUserContent } from '@/libs/DB';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const contentId = parseInt(params.id);
    if (isNaN(contentId)) {
      return new NextResponse('Invalid content ID', { status: 400 });
    }

    const deletedContent = await deleteUserContent(contentId, userId);
    
    if (!deletedContent) {
      return new NextResponse('Content not found or access denied', { status: 404 });
    }

    return NextResponse.json({ success: true, deletedContent });
  } catch (error) {
    console.error('Error deleting content:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 