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
      horimetroAtual: veiculo.horimetroAtual || veiculo.horimetroInicial || 0,
      hodometroAtual: veiculo.hodometroAtual || veiculo.hodometroInicial || 0,
      createdAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erro ao cadastrar veículo:", error);
    return { success: false, error };
  }
};

export const importarVeiculosIniciais = async (veiculos: any[]) => {
  try {
    const results = await Promise.all(veiculos.map(v => {
      const identificacao = v.placa || v.nome;
      const isMaquina = v.nome.includes('VALMET') || 
                        v.nome.includes('CATERPILLAR') || 
                        v.nome.includes('FIATALLIS') || 
                        v.nome.includes('GUINCHO') ||
                        v.nome.includes('BERÇO') ||
                        v.nome.includes('RETRO') ||
                        v.nome.includes('ESCAVADEIRA') ||
                        v.nome.includes('EMPILHADEIRA');

      const isMoto = v.nome.includes('HONDA') || v.nome.includes('TITAN') || v.nome.includes('BROS');
      const isCarro = v.nome.includes('KWID') || v.nome.includes('COROLA') || v.nome.includes('HILUX');
      
      const tipo = isMaquina ? 'maquina' : isMoto ? 'moto' : isCarro ? 'carro' : 'caminhao';

      return createVeiculo({
        identificacao,
        modelo: v.nome,
        categoria: v.categoria,
        tipo: tipo as any,
        tipoCombustivel: isCarro && !v.nome.includes('HILUX') ? 'flex' : 'diesel',
        horimetroInicial: 0,
        hodometroInicial: 0
      });
    }));
    return { success: true, count: results.filter(r => r.success).length };
  } catch (error) {
    console.error("Erro na importação em massa:", error);
    return { success: false, error };
  }
};

export const deleteVeiculo = async (id: string) => {
  try {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "frota", id));
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir veículo:", error);
    return { success: false, error };
  }
};

export const updateVeiculo = async (id: string, veiculo: Partial<Veiculo>) => {
  try {
    const docRef = doc(db, "frota", id);
    await updateDoc(docRef, {
      ...veiculo,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar veículo:", error);
    return { success: false, error };
  }
};
