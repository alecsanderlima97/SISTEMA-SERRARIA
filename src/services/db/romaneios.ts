import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, getDoc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "romaneios_madeira";

export interface RomaneioFardo {
  categoria: string; // MAD 1, MAD 2, etc.
  espessura: number;
  largura: number;
  comprimento: number;
  comprimentoVenda?: number;
  alturaPecas: number;
  larguraPecas: number;
  amarras: number;
  quantidadePecas: number;
  volumeM3: number;
  volumeVendaM3: number;
}

export interface RomaneioInput {
  numeroCarga: string;
  clienteId: string;
  clienteNome: string;
  dataEmissao: string;
  status: 'pendente' | 'pago' | 'cancelado';
  transportadora?: string;
  motorista?: string;
  placaVeiculo?: string;
  cidadeDestino?: string;
  tipoFrete?: 'CIF' | 'FOB';
  formaPagamento?: string;
  fardos: RomaneioFardo[];
  totalM3: number;
  volumeVendaTotal: number;
  totalPecas: number;
  valorFreteM3?: number;
  valorImposto?: number;
  taxaIva?: number; // V.N 9.3%
  valorTotal: number;
  observacoes?: string;
}

export async function createRomaneio(dados: RomaneioInput) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao criar romaneio:", error);
    return { success: false, error: error.message };
  }
}

export async function getRomaneios() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RomaneioInput & { id: string }));
  } catch (error) {
    console.error("Erro ao listar romaneios:", error);
    return [];
  }
}

export async function getRomaneioById(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as RomaneioInput & { id: string };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar romaneio:", error);
    return null;
  }
}

export async function updateRomaneioStatus(id: string, status: RomaneioInput['status']) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { status });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do romaneio:", error);
    return false;
  }
}
