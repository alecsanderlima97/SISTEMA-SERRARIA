import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "funcionarios";

export interface FuncionarioInput {
  nomeComp: string;
  cpf: string;
  funcao: string;
  dataAdmissao: string;
  cargaHoraria: string;
  status: string;
}

export async function addFuncionario(dados: FuncionarioInput) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao adicionar funcionário:", error);
    return { success: false, error: error.message };
  }
}

export async function getFuncionarios() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("nomeComp", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao listar funcionários:", error);
    return [];
  }
}

export async function deleteFuncionario(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error("Erro ao deletar funcionário:", error);
    return false;
  }
}
