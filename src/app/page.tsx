import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1"><span className="text-primary-500">Dashboard</span> Operacional</h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Visão Geral Vanmarte Serraria</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Última atualização: Agora</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Entrada de Toras (Mês)"
          value="450.5 m³"
          trend="+5.2%"
          trendUp={true}
          icon="🪵"
        />
        <MetricCard 
          title="Madeira Serrada Produzida"
          value="210.2 m³"
          trend="-1.4%"
          trendUp={false}
          icon="🏭"
        />
        <MetricCard 
          title="Contas a Pagar (Hoje)"
          value="R$ 14.500"
          trend="3 vencendo"
          trendUp={false}
          icon="💸"
        />
        <MetricCard 
          title="Funcionários Ativos"
          value="84"
          trend="+2 contratados"
          trendUp={true}
          icon="👥"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2">Rendimento de Processamento (Semanal)</h3>
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20">
            <p className="text-slate-500 text-sm">Gráfico de Rendimento (Toras vs Serrada) entrará aqui</p>
          </div>
        </div>
        <div className="glass-panel p-6">
          <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2">Ações Rápidas</h3>
          <div className="flex flex-col gap-3">
            <ActionButton label="Registrar Nova Carga de Toras" href="/toras/nova" />
            <ActionButton label="Emitir Romaneio" href="/logistica/romaneio" />
            <ActionButton label="Registrar Vale Funcionário" href="/rh/vales" />
            <ActionButton label="Pagar Despesa/Boleto" href="/financeiro/contas" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendUp, icon }: { title: string, value: string, trend: string, trendUp: boolean, icon: string }) {
  return (
    <div className="glass-panel p-5 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        {icon}
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-bold text-white">{value}</h4>
        <span className={`text-xs font-medium px-2 py-1 rounded-md ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ActionButton({ label, href }: { label: string, href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/50 hover:bg-primary-500/10 transition-colors group">
      <span className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</span>
      <span className="text-primary-500 transform group-hover:translate-x-1 transition-transform">→</span>
    </Link>
  )
}
