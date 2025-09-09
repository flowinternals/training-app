import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: courseId, lessonId } = resolvedParams;
    
    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'Course ID and Lesson ID are required' }, { status: 400 });
    }

    // Get the lesson to find its module
    const lessonDoc = await adminDb.collection('courses').doc(courseId)
      .collection('modules').where('lessons', 'array-contains', { id: lessonId })
      .limit(1).get();
    
    if (lessonDoc.empty) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    const moduleId = lessonDoc.docs[0].id;
    
    // Get quiz data for this specific lesson
    const quizDoc = await adminDb.collection('courses').doc(courseId)
      .collection('modules').doc(moduleId)
      .collection('lessons').doc(lessonId)
      .collection('quiz').doc('data').get();
    
    if (!quizDoc.exists) {
      return NextResponse.json({ error: 'Quiz data not found' }, { status: 404 });
    }
    
    const quizData = quizDoc.data();
    
    // Convert correctPairs strings back to arrays
    if (quizData && quizData.questions) {
      quizData.questions = quizData.questions.map((q: any) => {
        if (q.correctPairs && Array.isArray(q.correctPairs)) {
          q.correctPairs = q.correctPairs.map((pair: any) => 
            typeof pair === 'string' ? pair.split(',').map(Number) : pair
          );
        }
        return q;
      });
    }
    
    return NextResponse.json(quizData);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz data' },
      { status: 500 }
    );
  }
}
