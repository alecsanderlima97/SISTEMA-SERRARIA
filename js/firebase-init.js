import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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

// Helper global para simplificar operações no Firestore em scripts legado
window.FS = {
    async getCollection(collName, queries = []) {
        try {
            let q = collection(db, collName);
            if (queries && queries.length > 0) {
                q = query(q, ...queries);
            }
            const snap = await getDocs(q);
            const results = [];
            snap.forEach(d => results.push({ id: d.id, ...d.data() }));
            return results;
        } catch (err) {
            console.error(`Erro ao obter coleção ${collName}:`, err);
            throw err;
        }
    },
    async getDoc(collName, docId) {
        try {
            const dSnap = await getDoc(doc(db, collName, docId));
            if (dSnap.exists()) return { id: dSnap.id, ...dSnap.data() };
            return null;
        } catch (err) {
            console.error(`Erro ao obter doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async setDoc(collName, docId, data) {
        try {
            await setDoc(doc(db, collName, docId), data);
        } catch (err) {
            console.error(`Erro ao salvar doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async addDoc(collName, data) {
        try {
            const ref = await addDoc(collection(db, collName), data);
            return ref.id;
        } catch (err) {
            console.error(`Erro ao adicionar doc em ${collName}:`, err);
            throw err;
        }
    },
    async updateDoc(collName, docId, data) {
        try {
            await updateDoc(doc(db, collName, docId), data);
        } catch (err) {
            console.error(`Erro ao atualizar doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async deleteDoc(collName, docId) {
        try {
            await deleteDoc(doc(db, collName, docId));
        } catch (err) {
            console.error(`Erro ao excluir doc ${collName}/${docId}:`, err);
            throw err;
        }
    }
};


// Exportar as funcoes para facilitar os imports nos outros arquivos
export { 
    collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, setDoc, onSnapshot,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    GoogleAuthProvider, signInWithRedirect, getRedirectResult
};


