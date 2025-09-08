import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { AIService } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // Extract course fields using AI
    console.log('Extracting fields from text:', text.substring(0, 200) + '...');
    const extractedFields = await AIService.extractCourseFields(text);
    console.log('Extracted fields:', extractedFields);

    return NextResponse.json(extractedFields);
  } catch (error) {
    console.error('Error extracting fields:', error);
    return NextResponse.json(
      { error: 'Failed to extract course fields' },
      { status: 500 }
    );
  }
}
