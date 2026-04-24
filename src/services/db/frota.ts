import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";

export interface Veiculo {
  id?: string;
  identificacao: string; // Placa ou Prefixo
  tipo: 'caminhao' | 'maquina' | 'utilitario' | 'outros' | 'moto' | 'carro';
  modelo: string;
  marca?: string;
  ano?: number;
  tipoCombustivel: 'diesel' | 'gasolina' | 'flex';
  categoria?: 'SERRARIA' | 'FLORESTAL' | 'TERRAPLANAGEM';
  horimetroInicial?: number;
  hodometroInicial?: number;
  horimetroAtual?: number;
  hodometroAtual?: number;
  mediaEsperada?: number; // KM/L ou L/H
  createdAt?: Date;
}

export const getVeiculos = async (): Promise<Veiculo[]> => {
  try {
    const q = query(collection(db, "frota"), orderBy("identificacao", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    } as Veiculo));
  } catch (error) {
    console.error("Erro ao buscar frota:", error);
    return [];
  }
};

export const createVeiculo = async (veiculo: Omit<Veiculo, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, "frota"), {
      ...veiculo,
      horimetroAtual: veiculo.horimetroInicial || 0,
      hodometroAtual: veiculo.hodometroInicial || 0,
      createdAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erro ao cadastrar veículo:", error);
    return { success: false, error };
  }
};
