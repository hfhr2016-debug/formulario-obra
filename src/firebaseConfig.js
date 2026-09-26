import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA44nrJMcN6zew_2XhhTgWdszcZdsH7SJs",
  authDomain: "saiea-obras.firebaseapp.com",
  projectId: "saiea-obras",
  storageBucket: "saiea-obras.firebasestorage.app",
  messagingSenderId: "244389186658",
  appId: "1:244389186658:web:3f520a09288dd0b629953b",
  measurementId: "G-DP03C2XG5G",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
