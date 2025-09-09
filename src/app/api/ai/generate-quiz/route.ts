import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminDb } from '@/lib/firebase-admin';
import OpenAI from 'openai';
import { QuizBlock } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(authResult.user!.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { moduleContent, moduleTitle, questionCount } = body;

    if (!moduleContent || !moduleTitle) {
      return NextResponse.json({ 
        error: 'Module content and title are required' 
      }, { status: 400 });
    }

    console.log('Generating quiz for module:', moduleTitle);
    console.log('Module content length:', moduleContent.length);

    // Generate quiz using AI
    const prompt = `
You are a course quiz generator. Given the following module content:

Module: ${moduleTitle}

${moduleContent}

       Create exactly 5 questions that test comprehension. Mix types: multiple choice, multiple select, true/false, matching. Return JSON conforming to the QuizBlock schema provided.

       Requirements:
       - Multiple choice: 2-3 questions with single correct answer
       - Multiple select: 1-2 questions with multiple correct answers
       - True/False: 1-2 questions
       - Matching: 1 question with 4-6 pairs to match
       - NO short answer questions

Format the response as JSON with this exact structure:
{
  "type": "quiz",
  "title": "Module Quiz: ${moduleTitle}",
  "description": "Test your understanding of the module content",
  "questions": [
    {
      "kind": "mcq",
      "text": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct": [0]
    },
    {
      "kind": "truefalse", 
      "text": "True or false statement",
      "correct": true
    },
    {
      "kind": "match",
      "left": ["Term 1", "Term 2", "Term 3"],
      "right": ["Definition 1", "Definition 2", "Definition 3"],
      "correctPairs": [[0, 0], [1, 1], [2, 2]]
    }
  ]
}

Important:
- For MCQ: correct array contains index(es) of correct option(s)
- For multiple select: correct array contains multiple indices
- For short answer: provide 2-3 variations of correct answers
- For matching: correctPairs are [leftIndex, rightIndex] pairs
- Make questions test understanding, not just memorization
- Ensure questions are directly related to the module content
- Use clear, unambiguous language
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert quiz generator creating educational assessments. Always respond with valid JSON format matching the QuizBlock schema exactly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Clean and parse the response
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const quiz = JSON.parse(cleanedResponse) as QuizBlock;

    console.log('Generated quiz:', quiz);

    return NextResponse.json({ 
      success: true, 
      data: quiz 
    });

  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ 
      error: 'Failed to generate quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
