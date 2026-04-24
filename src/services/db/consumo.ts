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
  getDoc,
  setDoc,
  limit
} from "firebase/firestore";

export interface RegistroConsumo {
  id?: string;
  veiculoId: string;
  identificacaoVeiculo: string; // Cache da placa/prefixo
  tipoVeiculo?: string; // caminhão, máquina, etc.
  tipo: 'abastecimento' | 'lubrificante';
  origem: 'tanque_interno' | 'posto_externo';
  produto: string; // Diesel S10, Diesel S500, Óleo Motor 15W40, etc.
  quantidade: number; // Litros
  valorUnitario?: number;
  valorTotal?: number;
  km_horas: number; // Hodômetro ou Horímeter no momento
  km_horas_anterior?: number;
  media?: number; // KM/L ou L/H
  data: string;
  createdAt?: Date;
}

export interface RegistroEntradaTanque {
  id?: string;
  quantidade: number;
  valorTotal?: number;
  fornecedor?: string;
  notaFiscal?: string;
  data: string;
  createdAt?: Date;
}

export interface TanqueInterno {
  capacidade: number;
  saldoAtual: number;
  ultimaAtualizacao: Date;
}

// Configuração do Tanque (ID fixo 'tanque_diesel')
export const getTanqueStatus = async (): Promise<TanqueInterno> => {
  const docRef = doc(db, "configuracao", "tanque_diesel");
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      capacidade: data.capacidade || 3000,
      saldoAtual: data.saldoAtual || 0,
      ultimaAtualizacao: data.ultimaAtualizacao?.toDate() || new Date()
    };
  } else {
    // Inicializa se não existir
    const initial = { capacidade: 3000, saldoAtual: 0, ultimaAtualizacao: new Date() };
    await setDoc(docRef, { ...initial, ultimaAtualizacao: Timestamp.now() });
    return initial;
  }
};

export const updateTanqueSaldo = async (quantidade: number, operacao: 'adicionar' | 'remover') => {
  const docRef = doc(db, "configuracao", "tanque_diesel");
  const tanque = await getTanqueStatus();
  
  const novoSaldo = operacao === 'adicionar' 
    ? tanque.saldoAtual + quantidade 
    : tanque.saldoAtual - quantidade;

  await updateDoc(docRef, {
    saldoAtual: Math.max(0, novoSaldo),
    ultimaAtualizacao: Timestamp.now()
  });
};

export const createRegistroConsumo = async (registro: Omit<RegistroConsumo, 'id' | 'createdAt'>) => {
  try {
    // 1. Debitar saldo se for tanque interno
    if (registro.tipo === 'abastecimento' && registro.origem === 'tanque_interno') {
      await updateTanqueSaldo(registro.quantidade, 'remover');
    }

    // 2. Buscar dados do veículo para calcular média
    const veiculoRef = doc(db, "frota", registro.veiculoId);
    const veiculoSnap = await getDoc(veiculoRef);
    
    let km_horas_anterior = 0;
    let media = 0;

    if (veiculoSnap.exists()) {
      const vData = veiculoSnap.data();
      const isMaquina = vData.tipo === 'maquina';
      const tipoVeiculo = vData.tipo;
      
      km_horas_anterior = isMaquina 
        ? (vData.horimetroAtual || vData.horimetroInicial || 0)
        : (vData.hodometroAtual || vData.hodometroInicial || 0);

      // Atualizar veículo com nova medição
      if (isMaquina) {
        await updateDoc(veiculoRef, { horimetroAtual: registro.km_horas });
      } else {
        await updateDoc(veiculoRef, { hodometroAtual: registro.km_horas });
      }

      // Calcular média se for abastecimento
      if (registro.tipo === 'abastecimento' && registro.quantidade > 0) {
        const diff = registro.km_horas - km_horas_anterior;
        if (diff > 0) {
          media = isMaquina 
            ? registro.quantidade / diff // L/H
            : diff / registro.quantidade; // KM/L
        }
      }
    }

    // 3. Salvar registro com performance
    const docRef = await addDoc(collection(db, "consumo"), {
      ...registro,
      tipoVeiculo: veiculoSnap.exists() ? veiculoSnap.data().tipo : undefined,
      km_horas_anterior,
      media: Number(media.toFixed(2)),
      createdAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erro ao registrar consumo:", error);
    return { success: false, error };
  }
};

export const getHistoricoConsumo = async (limitCount = 50): Promise<RegistroConsumo[]> => {
  try {
    const q = query(
      collection(db, "consumo"), 
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    } as RegistroConsumo));
  } catch (error) {
    console.error("Erro ao buscar histórico de consumo:", error);
    return [];
  }
};

export const createEntradaTanque = async (registro: Omit<RegistroEntradaTanque, 'id' | 'createdAt'>) => {
  try {
    await updateTanqueSaldo(registro.quantidade, 'adicionar');
    
    const docRef = await addDoc(collection(db, "entradas_tanque"), {
      ...registro,
      createdAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erro ao registrar entrada no tanque:", error);
    return { success: false, error };
  }
};

export const getHistoricoEntradasTanque = async (limitCount = 50): Promise<RegistroEntradaTanque[]> => {
  try {
    const q = query(
      collection(db, "entradas_tanque"), 
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    } as RegistroEntradaTanque));
  } catch (error) {
    console.error("Erro ao buscar histórico de entradas:", error);
    return [];
  }
};
