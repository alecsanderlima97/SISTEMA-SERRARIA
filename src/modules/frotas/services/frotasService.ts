import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/services/firebase";

export interface Veiculo {
  id?: string;
  nome: string;
  placa: string | null;
  categoria: "SERRARIA" | "FLORESTAL" | "TERRAPLANAGEM";
  status: "ATIVO" | "MANUTENCAO" | "INATIVO";
}

export interface Abastecimento {
  id?: string;
  veiculoId: string;
  veiculoNome: string;
  data: any;
  responsavel: string;
  litros: number;
  origem: "INTERNO" | "EXTERNO";
  combustivel: "DIESEL" | "GASOLINA" | "ALCOOL";
  kmHoras?: number;
}

export interface ConsumoLubrificante {
  id?: string;
  veiculoId: string;
  veiculoNome: string;
  data: any;
  tipo: "15W40" | "ISO 68" | "ATF" | "DOT 3" | "DOT 4" | "COMPRESSOR";
  quantidade: number;
  responsavel: string;
}

const VEICULOS_COLLECTION = "veiculos";
const ABASTECIMENTOS_COLLECTION = "abastecimentos";
const LUBRIFICANTES_COLLECTION = "lubrificantes_consumo";

export const frotasService = {
  // Veículos
  async getVeiculos() {
    const q = query(collection(db, VEICULOS_COLLECTION), orderBy("nome"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Veiculo));
  },

  async addVeiculo(veiculo: Omit<Veiculo, "id">) {
    return await addDoc(collection(db, VEICULOS_COLLECTION), veiculo);
  },

  // Abastecimentos
  async addAbastecimento(dados: Omit<Abastecimento, "id">) {
    const docRef = await addDoc(collection(db, ABASTECIMENTOS_COLLECTION), {
      ...dados,
      data: serverTimestamp()
    });
    
    // Se for interno, deveríamos subtrair do tanque (lógica a ser implementada no dashboard/tanque)
    return docRef;
  },

  async getAbastecimentosRecent() {
    const q = query(collection(db, ABASTECIMENTOS_COLLECTION), orderBy("data", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Abastecimento));
  },

  // Lubrificantes
  async addConsumoLubrificante(dados: Omit<ConsumoLubrificante, "id">) {
    return await addDoc(collection(db, LUBRIFICANTES_COLLECTION), {
      ...dados,
      data: serverTimestamp()
    });
  },

  async getConsumoLubrificantesRecent() {
    const q = query(collection(db, LUBRIFICANTES_COLLECTION), orderBy("data", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConsumoLubrificante));
  }
};
