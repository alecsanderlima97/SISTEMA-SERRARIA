import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJBUSmLTTvBriPk4R_Mt4zQq4w9CoP-pk",
  authDomain: "serraria-bcf36.firebaseapp.com",
  projectId: "serraria-bcf36",
  storageBucket: "serraria-bcf36.firebasestorage.app",
  messagingSenderId: "355769974863",
  appId: "1:355769974863:web:68db0137d160ef3a63ea3a",
  measurementId: "G-4RQ1ENFE9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Exportar as funcoes para facilitar os imports nos outros arquivos
export { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
};

