import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/openai';
import { verifyAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = authResult.user;
    const body = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    const { content } = body;

    // Generate summary
    const summary = await AIService.summarizeContent(content);

    // Log the AI request for tracking
    console.log(`AI summary generated for user ${uid}:`, {
      contentLength: content.length
    });

    return NextResponse.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
