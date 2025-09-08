import { NextRequest, NextResponse } from 'next/server';
import { AIService, AICourseOutlineRequest } from '@/lib/openai';
import { verifyAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = authResult.user;
    const body: AICourseOutlineRequest = await request.json();

    // Validate required fields
    if (!body.topic || !body.duration || !body.difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, duration, difficulty' },
        { status: 400 }
      );
    }

    // Generate course outline
    const outline = await AIService.generateCourseOutline(body);

    // Log the AI request for tracking
    console.log(`AI outline generated for user ${uid}:`, {
      topic: body.topic,
      duration: body.duration,
      difficulty: body.difficulty
    });

    return NextResponse.json({
      success: true,
      data: outline
    });

  } catch (error) {
    console.error('Error generating course outline:', error);
    return NextResponse.json(
      { error: 'Failed to generate course outline' },
      { status: 500 }
    );
  }
}
