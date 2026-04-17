import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "toras_romaneios";

export interface ToraRomaneioInput {
  fornecedor: string;
  dataRecebimento: string;
  motorista: string;
  placa: string;
  volumeTotal: number;
  valorFrete: number;
  custoMateriaPrima: number;
  status: string;
}

export async function addToraRomaneio(dados: ToraRomaneioInput) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao adicionar romaneio de toras:", error);
    return { success: false, error: error.message };
  }
}

export async function getTorasRomaneios() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao listar romaneios de toras:", error);
    return [];
  }
}

export async function deleteToraRomaneio(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error("Erro ao deletar romaneio:", error);
    return false;
  }
}
