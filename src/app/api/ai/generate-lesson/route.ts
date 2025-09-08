import { NextRequest, NextResponse } from 'next/server';
import { AIService, AILessonContentRequest } from '@/lib/openai';
import { verifyAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = authResult.user;
    const body: AILessonContentRequest = await request.json();

    // Validate required fields
    if (!body.lessonTitle || !body.moduleContext || !body.duration) {
      return NextResponse.json(
        { error: 'Missing required fields: lessonTitle, moduleContext, duration' },
        { status: 400 }
      );
    }

    // Generate lesson content
    const content = await AIService.generateLessonContent(body);

    // Log the AI request for tracking
    console.log(`AI lesson content generated for user ${uid}:`, {
      lessonTitle: body.lessonTitle,
      moduleContext: body.moduleContext,
      duration: body.duration
    });

    return NextResponse.json({
      success: true,
      data: content
    });

  } catch (error) {
    console.error('Error generating lesson content:', error);
    return NextResponse.json(
      { error: 'Failed to generate lesson content' },
      { status: 500 }
    );
  }
}
