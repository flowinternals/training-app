import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json();
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Restore the course structure based on what we saw in the logs
    const modules = [
      {
        title: 'Setting Up Cursor',
        description: 'Understand how to setup and configure Cursor effectively for your development environment and workflow.',
        order: 1,
        lessons: [
          {
            title: 'Introduction to Cursor',
            content: 'Welcome to Cursor! This lesson covers the basics of what Cursor is and why it\'s useful for developers.',
            duration: 15,
            type: 'text',
            order: 1,
            completedBy: []
          },
          {
            title: 'Installation and Setup',
            content: 'Learn how to install Cursor and configure it for your development environment.',
            duration: 20,
            type: 'text',
            order: 2,
            completedBy: []
          },
          {
            title: 'Basic Configuration',
            content: 'Configure Cursor settings to optimize your development workflow.',
            duration: 25,
            type: 'text',
            order: 3,
            completedBy: []
          }
        ]
      },
      {
        title: 'AI-Assisted Coding with Cursor',
        description: 'Learn to leverage the power of AI to generate, refactor and explain code.',
        order: 2,
        lessons: [
          {
            title: 'Understanding AI Features',
            content: 'Explore the AI-powered features available in Cursor.',
            duration: 20,
            type: 'text',
            order: 1,
            completedBy: []
          },
          {
            title: 'Code Generation',
            content: 'Learn how to use AI to generate code snippets and complete functions.',
            duration: 30,
            type: 'text',
            order: 2,
            completedBy: []
          }
        ]
      },
      {
        title: 'Navigating and Understanding Code with Cursor',
        description: "Master the use of Cursor's navigation and code-understanding features to accelerate debugging and reviews.",
        order: 3,
        lessons: [
          {
            title: 'Code Navigation',
            content: 'Learn advanced navigation techniques in Cursor.',
            duration: 25,
            type: 'text',
            order: 1,
            completedBy: []
          },
          {
            title: 'Code Understanding',
            content: 'Use Cursor to understand complex codebases and legacy code.',
            duration: 30,
            type: 'text',
            order: 2,
            completedBy: []
          }
        ]
      }
    ];

    console.log('Starting course restoration for:', courseId);
    
    // Process each module
    for (const moduleData of modules) {
      console.log(`Creating module: ${moduleData.title}`);
      
      // Create module document
      const moduleRef = adminDb.collection('courses').doc(courseId).collection('modules').doc();
      await moduleRef.set({
        title: moduleData.title,
        description: moduleData.description,
        order: moduleData.order
      });
      
      console.log(`Module created with ID: ${moduleRef.id}`);
      
      // Process lessons for this module
      for (const lessonData of moduleData.lessons) {
        console.log(`  Creating lesson: ${lessonData.title}`);
        
        // Create lesson document
        const lessonRef = adminDb.collection('courses').doc(courseId)
          .collection('modules').doc(moduleRef.id)
          .collection('lessons').doc();
        
        await lessonRef.set({
          title: lessonData.title,
          content: lessonData.content,
          duration: lessonData.duration,
          type: lessonData.type,
          order: lessonData.order,
          completedBy: lessonData.completedBy
        });
        
        console.log(`  Lesson created with ID: ${lessonRef.id}`);
      }
    }
    
    console.log('Course restoration completed successfully!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Course restored successfully',
      modulesCreated: modules.length,
      totalLessons: modules.reduce((sum, m) => sum + m.lessons.length, 0)
    });
    
  } catch (error) {
    console.error('Error restoring course:', error);
    return NextResponse.json(
      { error: 'Failed to restore course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
