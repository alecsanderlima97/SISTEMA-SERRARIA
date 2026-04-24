"use client";

import { useState, useEffect } from "react";
import { getContasPagar, ContaPagar } from "@/services/db/financeiro";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function FinanceiroRelatorios() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const data = await getContasPagar();
      setContas(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Processar dados para os gráficos
  const totalGeral = contas.reduce((acc, c) => acc + c.valor, 0);
  const totalPago = contas.filter(c => c.status === 'concluido').reduce((acc, c) => acc + c.valor, 0);
  const totalPendente = totalGeral - totalPago;

  const porCategoria = contas.reduce((acc: any, c) => {
    acc[c.categoria] = (acc[c.categoria] || 0) + c.valor;
    return acc;
  }, {});

  const dataPie = Object.keys(porCategoria).map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
    value: porCategoria[cat]
  }));

  // Agrupar por mês
  const porMes = contas.reduce((acc: any, c) => {
    const mes = c.dataVencimento ? c.dataVencimento.substring(0, 7) : 'Sem data'; // YYYY-MM ou 'Sem data'
    acc[mes] = (acc[mes] || 0) + c.valor;
    return acc;
  }, {});

  const dataBar = Object.keys(porMes).sort().map(mes => ({
    name: mes,
    total: porMes[mes]
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-2">
          Relatórios <span className="text-primary-500">Financeiros</span>
        </h1>
        <p className="text-slate-400">Análise detalhada de custos, impostos e despesas operacionais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="Gasto Total" value={totalGeral} icon="💰" trend="+5.2%" />
        <SummaryCard title="Total Pago" value={totalPago} icon="✅" trend="Regular" color="text-emerald-400" />
        <SummaryCard title="A Pagar / Pendente" value={totalPendente} icon="⏳" trend="-2.1%" color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Barras - Evolução Mensal */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Evolução de Custos Mensal</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff20", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza - Distribuição por Categoria */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Distribuição por Categoria</h3>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff20", borderRadius: "8px" }}
                   itemStyle={{ color: "#fff" }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada de Itens a Pagar */}
      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Detalhamento de Contas e Documentos</h3>
          <button className="text-sm text-primary-400 hover:text-primary-300 font-medium">Exportar PDF</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Data Venc.</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contas.slice(0, 10).map((conta) => (
                <tr key={conta.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-slate-400 text-sm">{conta.dataVencimento ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-6 py-4 text-white font-medium">{conta.descricao}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-slate-800 rounded-md text-slate-300">
                      {conta.categoria.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">
                    {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
                      ${conta.status === 'concluido' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        conta.status === 'atrasado' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {conta.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{conta.numeroDocumento || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, trend, color = "text-white" }: any) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 text-6xl opacity-5 grayscale group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-400">{trend}</span>
      </div>
      <h4 className={`text-2xl font-bold font-mono ${color}`}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </h4>
    </div>
  );
}
