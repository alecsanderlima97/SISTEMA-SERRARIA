import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "estoque_pacotes";

export interface EstoquePacoteInput {
  identificador: string;
  dataProducao: string;
  operador: string;
  status: string;
  espessura: number;
  largura: number;
  comprimento: number;
  altPecas: number;
  larPecas: number;
  amarras: number;
  quantidadeCalculada: number;
  volumeCalculado: number;
}

export async function addEstoquePacote(dados: EstoquePacoteInput) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao adicionar pacote no estoque:", error);
    return { success: false, error: error.message };
  }
}

export async function getEstoquePacotes(): Promise<(EstoquePacoteInput & { id: string })[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (EstoquePacoteInput & { id: string })[];
  } catch (error) {
    console.error("Erro ao listar pacotes do estoque:", error);
    return [];
  }
}

export async function deleteEstoquePacote(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error("Erro ao deletar pacote:", error);
    return false;
  }
}
