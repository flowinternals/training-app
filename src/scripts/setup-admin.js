const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-key.json');
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function setupAdmin(email) {
  try {
    // Find user by email
    const usersRef = db.collection('users');
    const query = await usersRef.where('email', '==', email).get();
    
    if (query.empty) {
      console.log('❌ No user found with that email address');
      return;
    }

    const userDoc = query.docs[0];
    const userId = userDoc.id;
    
    // Update user role to admin
    await usersRef.doc(userId).update({
      role: 'admin',
      updatedAt: new Date()
    });

    console.log(`✅ Successfully updated user ${email} to admin role`);
    console.log(`User ID: ${userId}`);
    
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node setup-admin.js <email>');
  console.log('Example: node setup-admin.js admin@example.com');
  process.exit(1);
}

setupAdmin(email).then(() => {
  process.exit(0);
});
