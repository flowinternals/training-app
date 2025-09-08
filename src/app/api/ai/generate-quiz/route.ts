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

    const { content, count = 5, difficulty = 'intermediate' } = body;

    // Generate quiz questions
    const quiz = await AIService.generateQuizQuestions(content, count, difficulty);

    // Log the AI request for tracking
    console.log(`AI quiz generated for user ${uid}:`, {
      contentLength: content.length,
      questionCount: count,
      difficulty
    });

    return NextResponse.json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error('Error generating quiz questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz questions' },
      { status: 500 }
    );
  }
}
