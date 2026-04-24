"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Receipt, Fuel, 
  Landmark, User, Briefcase, FileText, 
  Calendar, CreditCard, DollarSign, Upload,
  Settings, Users, Tool, Zap
} from "lucide-react";
import Link from "next/link";
import { createContaPagar, ContaPagar } from "@/services/db/financeiro";

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ContaPagar>>({
    descricao: "",
    categoria: "insumos",
    valor: 0,
    dataVencimento: new Date().toISOString().split('T')[0],
    status: "pendente",
    formaPagamento: "boleto",
    fornecedor: "",
    numeroDocumento: "",
    observacoes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await createContaPagar(formData as Omit<ContaPagar, 'id' | 'createdAt'>);
    
    if (result.success) {
      router.push("/financeiro");
    } else {
      alert("Erro ao salvar: " + result.error);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {/* Voltar */}
      <Link 
        href="/financeiro"
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group w-fit"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Voltar para Financeiro
      </Link>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-primary-600/20 to-transparent">
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight">Novo Lançamento</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão detalhada de custos fixos, variáveis e impostos.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Categorias - Seleção Visual Expandida */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <CategoryButton 
              active={formData.categoria === 'insumos'} 
              onClick={() => setFormData({...formData, categoria: 'insumos'})}
              icon={<Receipt size={20} />}
              label="Insumos / NF"
            />
            <CategoryButton 
              active={formData.categoria === 'combustivel'} 
              onClick={() => setFormData({...formData, categoria: 'combustivel'})}
              icon={<Fuel size={20} />}
              label="Combustível"
            />
            <CategoryButton 
              active={formData.categoria === 'imposto'} 
              onClick={() => setFormData({...formData, categoria: 'imposto'})}
              icon={<Landmark size={20} />}
              label="Impostos / Taxas"
            />
            <CategoryButton 
              active={formData.categoria === 'manutencao'} 
              onClick={() => setFormData({...formData, categoria: 'manutencao'})}
              icon={<Settings size={20} />}
              label="Manutenção"
            />
            <CategoryButton 
              active={formData.categoria === 'folha_pagamento'} 
              onClick={() => setFormData({...formData, categoria: 'folha_pagamento'})}
              icon={<Users size={20} />}
              label="Folha de Pagamento"
            />
            <CategoryButton 
              active={formData.categoria === 'utilidades'} 
              onClick={() => setFormData({...formData, categoria: 'utilidades'})}
              icon={<Zap size={20} />}
              label="Energia / Água"
            />
            <CategoryButton 
              active={formData.categoria === 'servico'} 
              onClick={() => setFormData({...formData, categoria: 'servico'})}
              icon={<Tool size={20} />}
              label="Serviços"
            />
            <CategoryButton 
              active={formData.categoria === 'outros'} 
              onClick={() => setFormData({...formData, categoria: 'outros'})}
              icon={<FileText size={20} />}
              label="Diversos"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Esquerda: Dados Principais */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Descrição do Gasto</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Compra de Pregos, Nota do Posto Shell..."
                  className="input-glass w-full"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Valor (R$)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</div>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="input-glass w-full pl-11 font-mono font-bold"
                      value={formData.valor || ""}
                      onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Vencimento</label>
                  <input 
                    required
                    type="date" 
                    className="input-glass w-full"
                    value={formData.dataVencimento}
                    onChange={(e) => setFormData({...formData, dataVencimento: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Fornecedor / Beneficiário</label>
                <input 
                  type="text" 
                  placeholder="Nome da empresa ou pessoa"
                  className="input-glass w-full"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                />
              </div>
            </div>

            {/* Direita: Detalhes e Arquivo */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Forma de Pagamento</label>
                <select 
                  className="input-glass w-full appearance-none"
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({...formData, formaPagamento: e.target.value as any})}
                >
                  <option value="boleto" className="bg-slate-900">Boleto Bancário</option>
                  <option value="pix" className="bg-slate-900">PIX</option>
                  <option value="cartao" className="bg-slate-900">Cartão</option>
                  <option value="dinheiro" className="bg-slate-900">Dinheiro</option>
                  <option value="transferencia" className="bg-slate-900">Transferência</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nº do Documento / Nota</label>
                <input 
                  type="text" 
                  placeholder="Número da NF ou identificação"
                  className="input-glass w-full"
                  value={formData.numeroDocumento}
                  onChange={(e) => setFormData({...formData, numeroDocumento: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Observações Internas</label>
                <textarea 
                  rows={3}
                  className="input-glass w-full resize-none"
                  placeholder="Informações adicionais sobre este lançamento..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex justify-end">
            <button 
              disabled={loading}
              type="submit"
              className="btn-primary w-full md:w-auto px-12"
            >
              {loading ? "Salvando..." : (
                <>
                  <Save size={20} className="inline mr-2" />
                  Confirmar Lançamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryButton({ active, onClick, icon, label }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
        active 
        ? "bg-primary-600/20 border-primary-500 text-white shadow-lg shadow-primary-500/10" 
        : "bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300"
      }`}
    >
      <div className={`${active ? "scale-110 text-primary-400" : "scale-100"} transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter text-center">{label}</span>
    </button>
  );
}
