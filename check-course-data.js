// Script to check course data for duplicates
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs } = require('firebase/firestore');

// Firebase config (you'll need to add your config here)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCourseData(courseId) {
  try {
    console.log(`Checking course data for ID: ${courseId}`);
    
    // Get course document
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    if (!courseDoc.exists()) {
      console.log('Course not found');
      return;
    }
    
    const courseData = courseDoc.data();
    console.log('Course data:', courseData);
    
    // Get modules
    const modulesSnapshot = await getDocs(collection(db, 'courses', courseId, 'modules'));
    console.log(`Found ${modulesSnapshot.docs.length} modules`);
    
    for (const moduleDoc of modulesSnapshot.docs) {
      const moduleData = moduleDoc.data();
      console.log(`\nModule: ${moduleData.title}`);
      
      // Get lessons for this module
      const lessonsSnapshot = await getDocs(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons'));
      console.log(`  Found ${lessonsSnapshot.docs.length} lessons`);
      
      const lessons = [];
      for (const lessonDoc of lessonsSnapshot.docs) {
        const lessonData = lessonDoc.data();
        lessons.push({
          id: lessonDoc.id,
          title: lessonData.title,
          type: lessonData.type,
          content: lessonData.content?.substring(0, 100) + '...',
          videoUrl: lessonData.videoUrl
        });
      }
      
      // Check for duplicate lessons
      const lessonTitles = lessons.map(l => l.title);
      const uniqueTitles = [...new Set(lessonTitles)];
      
      if (lessonTitles.length !== uniqueTitles.length) {
        console.log('  ⚠️  DUPLICATE LESSONS FOUND!');
        console.log('  All lesson titles:', lessonTitles);
        console.log('  Unique titles:', uniqueTitles);
      } else {
        console.log('  ✅ No duplicate lessons found');
      }
      
      lessons.forEach((lesson, index) => {
        console.log(`    ${index + 1}. ${lesson.title} (${lesson.type})`);
        if (lesson.videoUrl) {
          console.log(`       Video URL: ${lesson.videoUrl}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error checking course data:', error);
  }
}

// Check the specific course that's showing duplicates
checkCourseData('syh9IAD1C10PeiR5XrCz');
