import Link from "next/link";

export default function NewEmployeePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <Link href="/rh" className="text-primary-500 hover:text-primary-400 text-sm font-medium mb-4 inline-flex items-center gap-2">
            <span>←</span> Voltar para Listagem
          </Link>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">Cadastrar <span className="text-primary-500">Funcionário</span></h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Preencha os dados do novo colaborador</p>
        </div>
      </div>

      <div className="glass-panel p-8 border-t-4 border-t-primary-500">
        <form className="space-y-8">
          
          {/* Seção Dados Pessoais */}
          <section>
            <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-primary-500">1.</span> Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome Completo</label>
                <input type="text" placeholder="Ex: João da Silva" className="input-glass" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CPF</label>
                <input type="text" placeholder="000.000.000-00" className="input-glass" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data de Nascimento</label>
                <input type="date" className="input-glass text-slate-300" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefone / WhatsApp</label>
                <input type="tel" placeholder="(00) 00000-0000" className="input-glass" />
              </div>
            </div>
          </section>

          {/* Seção Contrato e Admissão */}
          <section>
            <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-primary-500">2.</span> Contrato e Ocupação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data de Admissão</label>
                <input type="date" className="input-glass text-slate-300" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departamento</label>
                <select className="input-glass text-slate-300 appearance-none bg-black/20">
                  <option value="">Selecione...</option>
                  <option value="producao">Produção (Serra)</option>
                  <option value="logistica">Logística e Pátio</option>
                  <option value="manutencao">Manutenção / Terraplanagem</option>
                  <option value="administracao">Administração</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cargo</label>
                <input type="text" placeholder="Ex: Operador de Serra" className="input-glass" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salário Base (R$)</label>
                <input type="number" placeholder="2000.00" className="input-glass" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Inicial</label>
                <select className="input-glass text-slate-300 appearance-none bg-black/20">
                  <option value="ativo">Ativo</option>
                  <option value="experiencia">Período de Experiência</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
            <Link href="/rh" className="px-6 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-medium">
              Cancelar
            </Link>
            <button type="button" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-8 rounded-lg transition-colors shadow-lg shadow-primary-500/30">
              Salvar Registro
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
