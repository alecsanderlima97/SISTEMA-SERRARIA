"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  TrendingUp, TrendingDown, Users, DollarSign, 
  Package, Truck, ArrowRight, Zap, 
  BarChart3, Activity, Clock, Bell, Layers
} from "lucide-react";
import { getLancamentos } from "@/services/db/financeiro";
import { getFuncionarios } from "@/services/db/rh";
import { getEstoquePacotes } from "@/services/db/estoque";

export default function Home() {
  const [stats, setStats] = useState({
    receita: 0,
    despesa: 0,
    funcionarios: 0,
    producaoVolume: 0,
    estoquePacotes: 0
  });

  useEffect(() => {
    async function loadStats() {
      // Financeiro
      const lancamentos = await getLancamentos();
      const receita = lancamentos.filter(l => l.tipo === 'receita').reduce((acc, curr) => acc + curr.valor, 0);
      const despesa = lancamentos.filter(l => l.tipo === 'despesa').reduce((acc, curr) => acc + curr.valor, 0);
      
      // RH
      const funcs = await getFuncionarios();
      
      // Estoque
      const pacotes = await getEstoquePacotes();
      const volumeTotal = pacotes.reduce((acc, p) => acc + (Number(p.volumeCalculado) || 0), 0);
      
      setStats({
        receita,
        despesa,
        funcionarios: funcs.length,
        producaoVolume: volumeTotal,
        estoquePacotes: pacotes.length
      });
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-primary-500/20 text-primary-400 uppercase tracking-widest border border-primary-500/30">
              SISTEMA SERRARIA V3.0
            </span>
            <span className="text-slate-500 text-xs font-medium">Dashboard Executivo Global</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Painel <span className="text-primary-500">Executivo</span></h1>
          <p className="text-slate-400 mt-1">Visão 360º da operação: Financeiro, Produção e RH.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-white font-bold text-sm">Orquestracs Sistemas</div>
            <div className="text-emerald-400 text-xs flex items-center justify-end gap-1">
              <Zap size={10} fill="currentColor" /> Sistema Online
            </div>
          </div>
          <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-white/10">
            <Bell size={20} />
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIItem 
          label="Receita Bruta" 
          value={`R$ ${stats.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          trend="+12%" 
          icon={<DollarSign size={24} />} 
          color="emerald"
        />
        <KPIItem 
          label="Custos & Despesas" 
          value={`R$ ${stats.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          trend="-5%" 
          icon={<TrendingDown size={24} />} 
          color="rose"
        />
        <KPIItem 
          label="Estoque em m³" 
          value={`${stats.producaoVolume.toFixed(2)} m³`} 
          trend={`${stats.estoquePacotes} pacotes`} 
          icon={<Layers size={24} />} 
          color="primary"
        />
        <KPIItem 
          label="Colaboradores" 
          value={stats.funcionarios.toString()} 
          trend="Ativos" 
          icon={<Users size={24} />} 
          color="indigo"
        />
      </div>

      {/* Analytics & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Analytics */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BarChart3 size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white">Rendimento Industrial</h3>
                  <p className="text-slate-400 text-sm">Aproveitamento de madeira serrada vs toras processadas</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-white border border-white/10">META: 45%</span>
                  <span className="px-3 py-1 bg-primary-500/20 rounded-full text-[10px] text-primary-400 border border-primary-500/20">ATUAL: 48.2%</span>
                </div>
              </div>

              {/* Fake Graph Visual */}
              <div className="h-64 flex items-end justify-between gap-2 px-2">
                {[45, 60, 55, 75, 65, 85, 70, 90, 80, 95, 85, 100].map((h, i) => (
                  <div key={i} className="flex-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {h}%
                    </div>
                    <div 
                      style={{ height: `${h}%` }} 
                      className={`w-full rounded-t-lg transition-all duration-1000 ${i % 2 === 0 ? 'bg-primary-500/60 group-hover:bg-primary-400' : 'bg-primary-500/20 group-hover:bg-primary-500/40'}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 px-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                <span>Janeiro</span>
                <span>Fevereiro</span>
                <span>Março</span>
                <span>Abril</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-white font-bold">Fluxo de Caixa</div>
                <div className="text-emerald-400 text-xs font-medium">Saudável: Saldo positivo projetado</div>
              </div>
            </div>
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-3xl p-6 flex items-center gap-4 text-primary-400">
               <Zap size={24} fill="currentColor" />
               <div>
                 <div className="text-white font-bold">Alertas de Manutenção</div>
                 <div className="text-primary-400 text-xs font-medium">Nenhum equipamento crítico parado</div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Feeds */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Zap size={18} className="text-primary-400" />
              Acesso Rápido
            </h3>
            
            <div className="space-y-3">
              <QuickActionLink href="/romaneios/novo" label="Novo Romaneio" icon={<Truck size={16} />} />
              <QuickActionLink href="/financeiro/novo" label="Lançar Despesa" icon={<DollarSign size={16} />} />
              <QuickActionLink href="/estoque" label="Ver Inventário" icon={<Package size={16} />} />
              <QuickActionLink href="/frota" label="Gestão de Frotas" icon={<Truck size={16} />} />
              <QuickActionLink href="/rh" label="Gestão de Pessoal" icon={<Users size={16} />} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
             <h3 className="text-lg font-bold text-white mb-4">Notificações Operacionais</h3>
             <div className="space-y-4">
               <ActivityItem text="Estoque de Diesel baixo (200L restantes)" time="Há 5 min" />
               <ActivityItem text="Funcionário João Silva registrou entrada" time="Há 15 min" />
               <ActivityItem text="Carga carregada: Destino Curitiba/PR" time="Há 1 hora" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIItem({ label, value, trend, icon, color }: any) {
  const colorMap: any = {
    primary: "from-primary-500/20 to-transparent text-primary-400",
    emerald: "from-emerald-500/20 to-transparent text-emerald-400",
    rose: "from-rose-500/20 to-transparent text-rose-400",
    indigo: "from-indigo-500/20 to-transparent text-indigo-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} backdrop-blur-md border border-white/10 rounded-3xl p-6 relative group overflow-hidden`}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
        {icon && <div className="w-24 h-24">{icon}</div>}
      </div>
      <div className="relative z-10">
        <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center justify-between">
          {label}
          <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-white">{trend}</span>
        </div>
        <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
      </div>
    </div>
  );
}

function QuickActionLink({ href, label, icon }: any) {
  return (
    <Link 
      href={href}
      className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/10 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary-400 transition-colors">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
      </div>
      <ArrowRight size={14} className="text-slate-600 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shadow-[0_0_8px_rgba(var(--primary-500),0.5)]" />
      <div>
        <div className="text-sm text-slate-300 leading-tight">{text}</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{time}</div>
      </div>
    </div>
  );
}
