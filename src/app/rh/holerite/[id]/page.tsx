"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Printer, Download, Banknote, 
  Plus, Trash2, Calculator, Save, User, 
  Calendar, MapPin, Briefcase
} from "lucide-react";
import Link from "next/link";
import { getFuncionarioById, Funcionario } from "@/services/db/rh";

interface ItemHolerite {
  id: string;
  descricao: string;
  tipo: 'provento' | 'desconto';
  valor: number;
}

export default function HoleritePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemHolerite[]>([]);
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    async function loadData() {
      const func = await getFuncionarioById(id);
      if (func) {
        setFuncionario(func);
        // Inicializa com o salário base
        setItens([
          { id: 'salario', descricao: 'Salário Base', tipo: 'provento', valor: func.salarioBase },
          { id: 'inss', descricao: 'INSS (Simplificado)', tipo: 'desconto', valor: func.salarioBase * 0.08 },
        ]);
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  const totalProventos = itens.filter(i => i.tipo === 'provento').reduce((acc, curr) => acc + curr.valor, 0);
  const totalDescontos = itens.filter(i => i.tipo === 'desconto').reduce((acc, curr) => acc + curr.valor, 0);
  const liquido = totalProventos - totalDescontos;

  const addItem = (tipo: 'provento' | 'desconto') => {
    const desc = prompt("Descrição do item:");
    const valorStr = prompt("Valor (R$):");
    if (desc && valorStr) {
      setItens([...itens, {
        id: Math.random().toString(36).substr(2, 9),
        descricao: desc,
        tipo,
        valor: parseFloat(valorStr)
      }]);
    }
  };

  const removeItem = (id: string) => {
    setItens(itens.filter(i => i.id !== id));
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando dados do colaborador...</div>;
  if (!funcionario) return <div className="p-8 text-center text-rose-500">Colaborador não encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Top Actions */}
      <div className="flex items-center justify-between">
        <Link 
          href="/rh"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para RH
        </Link>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl font-bold transition-all border border-white/10"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/20 active:scale-95">
            <Save size={18} />
            Salvar Holerite
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 text-3xl font-black border-2 border-primary-500/20 mb-4">
                {funcionario.nome.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-white">{funcionario.nome}</h2>
              <p className="text-primary-400 text-xs font-black uppercase tracking-widest mt-1">{funcionario.cargo}</p>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-white/5">
              <InfoItem icon={<User size={14} />} label="CPF" value={funcionario.cpf} />
              <InfoItem icon={<Briefcase size={14} />} label="Setor" value={funcionario.departamento} />
              <InfoItem icon={<Calendar size={14} />} label="Admissão" value={new Date(funcionario.dataAdmissao).toLocaleDateString('pt-BR')} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Mês de Referência</label>
            <input 
              type="month" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 transition-all"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
            />
          </div>
        </div>

        {/* Main Holerite Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl print:shadow-none">
            {/* Header Visual */}
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">Demonstrativo de Pagamento</h1>
                <p className="text-slate-400 text-xs mt-1">SERRARIA SANTA RITA - CNPJ: 00.000.000/0001-00</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-black text-primary-400">R$ {liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Valor Líquido a Receber</div>
              </div>
            </div>

            {/* Table Area */}
            <div className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="px-8 py-4 text-left">Descrição</th>
                    <th className="px-8 py-4 text-right">Proventos (+)</th>
                    <th className="px-8 py-4 text-right">Descontos (-)</th>
                    <th className="px-8 py-4 w-12 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itens.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="text-slate-900 font-bold">{item.descricao}</div>
                      </td>
                      <td className="px-8 py-4 text-right font-mono font-medium text-emerald-600">
                        {item.tipo === 'provento' ? `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-8 py-4 text-right font-mono font-medium text-rose-600">
                        {item.tipo === 'desconto' ? `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-8 py-4 text-right print:hidden">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Buttons to Add (Internal) */}
                  <tr className="print:hidden">
                    <td colSpan={4} className="px-8 py-4">
                      <div className="flex gap-4">
                        <button 
                          onClick={() => addItem('provento')}
                          className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest"
                        >
                          <Plus size={14} /> Adicionar Provento
                        </button>
                        <button 
                          onClick={() => addItem('desconto')}
                          className="flex items-center gap-2 text-xs font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest"
                        >
                          <Plus size={14} /> Adicionar Desconto
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Total de Proventos:</span>
                  <span className="text-slate-900 font-mono">R$ {totalProventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Total de Descontos:</span>
                  <span className="text-slate-900 font-mono">R$ {totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex flex-col items-end justify-center">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Valor Líquido</div>
                <div className="text-3xl font-black text-slate-900 font-mono">R$ {liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            
            {/* Signature Area (Print only) */}
            <div className="hidden print:block p-12 mt-8">
              <div className="grid grid-cols-2 gap-20">
                <div className="border-t border-slate-900 pt-4 text-center">
                  <div className="text-[10px] font-bold uppercase">Assinatura da Empresa</div>
                </div>
                <div className="border-t border-slate-900 pt-4 text-center">
                  <div className="text-[10px] font-bold uppercase">Assinatura do Colaborador</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
