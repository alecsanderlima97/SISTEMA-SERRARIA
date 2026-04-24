"use client";

import { useState, useEffect } from "react";
import { Plus, Tag, Package, PenTool, Zap, Settings, Users, Fuel, Landmark, ArrowUpRight, ArrowDownRight, Clock, FileText, Receipt } from "lucide-react";
import Link from "next/link";
import { getContasPagar, ContaPagar } from "@/services/db/financeiro";

export default function FinanceiroPage() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getContasPagar();
      setContas(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const totais = {
    pendente: contas.filter(c => c.status === 'pendente').reduce((acc, curr) => acc + curr.valor, 0),
    pago: contas.filter(c => c.status === 'concluido').reduce((acc, curr) => acc + curr.valor, 0),
    atrasado: contas.filter(c => c.status === 'atrasado').reduce((acc, curr) => acc + curr.valor, 0),
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header com Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Financeiro</h1>
          <p className="text-slate-400">Contas a pagar, impostos e despesas operacionais.</p>
        </div>
        <Link 
          href="/financeiro/novo"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/20 active:scale-95 w-fit"
        >
          <Plus size={20} />
          Lançar Despesa
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Pendente" 
          value={totais.pendente} 
          icon={<Clock className="text-amber-400" />} 
          color="amber"
          subtitle="Aguardando vencimento"
        />
        <StatCard 
          title="Atrasados" 
          value={totais.atrasado} 
          icon={<ArrowDownRight className="text-rose-500" />} 
          color="rose"
          subtitle="Atenção necessária"
        />
        <StatCard 
          title="Pago (Mês)" 
          value={totais.pago} 
          icon={<Landmark className="text-emerald-400" />} 
          color="emerald"
          subtitle="Fluxo de caixa realizado"
        />
      </div>

      {/* Tabela de Lançamentos Recentes */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-lg text-white">Últimos Lançamentos</h3>
          <button className="text-xs text-primary-400 hover:text-primary-300 font-bold uppercase tracking-wider transition-colors">
            Ver Tudo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Carregando dados...</td>
                </tr>
              ) : contas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <Receipt size={48} />
                      <p>Nenhum lançamento encontrado.</p>
                      <Link href="/financeiro/novo" className="text-primary-400 underline text-sm">Lançar primeira nota</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                contas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white group-hover:text-primary-300 transition-colors">{conta.descricao}</div>
                      <div className="text-xs text-slate-500">{conta.fornecedor || 'Geral'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-sm text-slate-300">
                        {getCategoryIcon(conta.categoria)}
                        {getCategoryLabel(conta.categoria)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {conta.dataVencimento ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white">
                      R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <StatusBadge status={conta.status} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: any) {
  const colors: any = {
    amber: "from-amber-500/20 to-transparent border-amber-500/20",
    rose: "from-rose-500/20 to-transparent border-rose-500/20",
    emerald: "from-emerald-500/20 to-transparent border-emerald-500/20",
    primary: "from-primary-500/20 to-transparent border-primary-500/20",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border backdrop-blur-md p-6 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform cursor-default group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-black/20 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 group-hover:text-white transition-colors">Acompanhamento</span>
      </div>
      <div>
        <div className="text-3xl font-mono font-black text-white">
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div className="text-sm font-bold text-white/80 mt-1">{title}</div>
        <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">{subtitle}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    concluido: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pendente: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    atrasado: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    cancelado: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${configs[status]}`}>
      {status}
    </span>
  );
}

function getCategoryIcon(categoria: string) {
  switch (categoria) {
    case 'venda': return <Tag size={16} className="text-emerald-400" />;
    case 'servico': return <PenTool size={16} className="text-blue-400" />;
    case 'imposto': return <Landmark size={16} className="text-purple-400" />;
    case 'combustivel': return <Fuel size={16} className="text-orange-400" />;
    case 'manutencao': return <Settings size={16} className="text-slate-400" />;
    case 'folha_pagamento': return <Users size={16} className="text-indigo-400" />;
    case 'insumos': return <Package size={16} className="text-amber-400" />;
    case 'utilidades': return <Zap size={16} className="text-yellow-400" />;
    default: return <FileText size={16} className="text-slate-400" />;
  }
}
function getCategoryLabel(categoria: string) {
  const labels: any = {
    venda: "Venda",
    servico: "Serviço",
    imposto: "Imposto",
    combustivel: "Combustível",
    manutencao: "Manutenção",
    folha_pagamento: "Folha de Pagto",
    insumos: "Insumos / NF",
    utilidades: "Energia / Água",
    outros: "Outros"
  };
  return labels[categoria] || categoria;
}
