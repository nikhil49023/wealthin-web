
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "studio-7694557123-a611b",
  "appId": "1:7694557123:web:a611b123456789",
  "apiKey": "AIzaSyBgHs-SMz1uWVineex7tjZBWy9steLQiCc",
  "authDomain": "studio-7694557123-a611b.firebaseapp.com",
  "storageBucket": "studio-7694557123-a611b.appspot.com",
  "messagingSenderId": "7694557123",
  "measurementId": "G-XXXXXXXXXX"
};


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, storage, googleProvider };
