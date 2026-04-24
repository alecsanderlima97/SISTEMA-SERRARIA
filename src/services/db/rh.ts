import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, getDoc, deleteDoc, updateDoc, query, orderBy, where } from "firebase/firestore";

const COLL_FUNCIONARIOS = "funcionarios";
const COLL_HOLERITES = "holerites";

export interface Funcionario {
  id?: string;
  nome: string;
  cpf: string;
  cargo: string;
  dataAdmissao: string;
  salarioBase: number;
  status: 'ativo' | 'afastado' | 'desligado';
  tipoContrato: 'CLT' | 'PJ' | 'Diarista';
  pix?: string;
  contato?: string;
  createdAt: string;
}

export interface Holerite {
  id?: string;
  funcionarioId: string;
  funcionarioNome: string;
  mesReferencia: string; // "2024-04"
  dataEmissao: string;
  salarioBase: number;
  diasTrabalhados: number;
  horasExtras?: number;
  bonus?: number;
  descontos?: number;
  valorLiquido: number;
  status: 'pendente' | 'pago';
  observacoes?: string;
  createdAt: string;
}

// Funções para Funcionários
export async function createFuncionario(dados: Omit<Funcionario, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, COLL_FUNCIONARIOS), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao cadastrar funcionário:", error);
    return { success: false, error: error.message };
  }
}

export async function getFuncionarios(status: Funcionario['status'] = 'ativo') {
  try {
    const q = query(collection(db, COLL_FUNCIONARIOS), where("status", "==", status), orderBy("nome", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Funcionario));
  } catch (error) {
    console.error("Erro ao listar funcionários:", error);
    return [];
  }
}

export async function getFuncionarioById(id: string) {
  try {
    const docRef = doc(db, COLL_FUNCIONARIOS, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Funcionario;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar funcionário:", error);
    return null;
  }
}

// Funções para Holerites
export async function createHolerite(dados: Omit<Holerite, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, COLL_HOLERITES), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    
    // IMPORTANTE: Ao criar um holerite pendente, poderíamos também lançar 
    // automaticamente no "Contas a Pagar" para o financeiro saber da dívida.
    
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao gerar holerite:", error);
    return { success: false, error: error.message };
  }
}

export async function getHolerites(mes?: string) {
  try {
    let q = query(collection(db, COLL_HOLERITES), orderBy("createdAt", "desc"));
    if (mes) {
      q = query(q, where("mesReferencia", "==", mes));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holerite));
  } catch (error) {
    console.error("Erro ao listar holerites:", error);
    return [];
  }
}
