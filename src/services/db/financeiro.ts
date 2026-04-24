import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, getDoc, deleteDoc, updateDoc, query, orderBy, where } from "firebase/firestore";

const COLLECTION_NAME = "lancamentos";

export interface Lancamento {
  id?: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  categoria: 'venda' | 'servico' | 'imposto' | 'combustivel' | 'manutencao' | 'folha_pagamento' | 'insumos' | 'utilidades' | 'outros';
  valor: number;
  data: string;
  dataVencimento?: string;
  status: 'pendente' | 'concluido' | 'atrasado' | 'cancelado';
  fornecedor?: string;
  cliente?: string;
  numeroDocumento?: string;
  formaPagamento?: 'pix' | 'boleto' | 'cartao' | 'dinheiro' | 'transferencia';
  observacoes?: string;
  createdAt: string;
}

export type ContaPagar = Lancamento;

export async function createLancamento(dados: Omit<Lancamento, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...dados,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao criar lançamento:", error);
    return { success: false, error: error.message };
  }
}

export const createContaPagar = createLancamento;

export async function getLancamentos(filtros?: { tipo?: Lancamento['tipo'], status?: Lancamento['status'] }) {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy("data", "desc"));
    
    if (filtros?.tipo) {
      q = query(q, where("tipo", "==", filtros.tipo));
    }
    if (filtros?.status) {
      q = query(q, where("status", "==", filtros.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lancamento));
  } catch (error) {
    console.error("Erro ao listar lançamentos:", error);
    return [];
  }
}

// Para manter retrocompatibilidade se outros arquivos usarem
export const getContasPagar = () => getLancamentos({ tipo: 'despesa' });

export async function updateStatusLancamento(id: string, status: Lancamento['status']) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { status });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do lançamento:", error);
    return false;
  }
}

export async function deleteLancamento(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error("Erro ao deletar lançamento:", error);
    return false;
  }
}
