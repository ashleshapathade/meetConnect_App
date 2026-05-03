import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


 const firebaseConfig = {
  apiKey: "AIzaSyC88iDvtzHd6tvylwmE1ksLrzGlRiP8fyM",
  authDomain: "meetconnect-app.firebaseapp.com",
  projectId: "meetconnect-app",
  storageBucket: "meetconnect-app.firebasestorage.app",
  messagingSenderId: "132830017715",
  appId: "1:132830017715:web:7408fb2a718889adad18c6",
  measurementId: "G-YQVB52TQE3"

};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();