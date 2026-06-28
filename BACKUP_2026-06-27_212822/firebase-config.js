// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA8VLC_AA4VGsigpY1m_2KLKKPicAWYdd4",
  authDomain: "slfp-fiches-90178.firebaseapp.com",
  projectId: "slfp-fiches-90178",
  storageBucket: "slfp-fiches-90178.firebasestorage.app",
  messagingSenderId: "1077013776356",
  appId: "1:1077013776356:web:fec833419b0c2bf95be9f1"
};

// Configuration Google Drive Picker
const googleDriveConfig = {
  clientId: 'VOTRE_CLIENT_ID.apps.googleusercontent.com',
  apiKey: 'VOTRE_GOOGLE_API_KEY',
  appId: 'VOTRE_GOOGLE_APP_ID'
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);

// Références Firestore
const db = firebase.firestore();
const storage = firebase.storage();
const fichesRef = db.collection('fiches');
