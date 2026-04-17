"use client";
import Link from "next/link";
import { useState } from "react";
import { calcularVolumePecas, calcularFrete } from "@/utils/cubagem";

export default function NovaCargaToraPage() {
  const [cubagemForm, setCubagemForm] = useState({ esp: 0, lar: 0, comp: 0, qtd: 1 });
  const [volumeUnitario, setVolumeUnitario] = useState(0);
  const [volumeTotal, setVolumeTotal] = useState(0);

  const handleCalcularCubagem = () => {
    const { volumeUnitario, volumeTotal } = calcularVolumePecas(
      cubagemForm.esp,
      cubagemForm.lar,
      cubagemForm.comp,
      cubagemForm.qtd
    );
    setVolumeUnitario(volumeUnitario);
    setVolumeTotal(volumeTotal);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <Link href="/toras" className="text-primary-500 hover:text-primary-400 text-sm font-medium mb-4 inline-flex items-center gap-2">
            <span>←</span> Voltar para Entradas
          </Link>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">Registrar <span className="text-primary-500">Carga ou Tora</span></h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Lance os romaneios de matéria prima</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Principal de Registro de Romaneio */}
        <div className="glass-panel p-8 border-t-4 border-t-primary-500 lg:col-span-2">
          <form className="space-y-8">
            <section>
              <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-primary-500">1.</span> Dados Básicos (Romaneio)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fornecedor / Matão</label>
                  <input type="text" placeholder="Nome da Fazenda/Fornecedor" className="input-glass" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data do Recebimento</label>
                  <input type="date" className="input-glass" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Motorista</label>
                  <input type="text" placeholder="Nome do motorista" className="input-glass" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Placa do Veículo</label>
                  <input type="text" placeholder="XXX-0000" className="input-glass font-mono uppercase" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-primary-500">2.</span> Totais Calculados e Frete
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume Total da Carga (M³)</label>
                  <input type="number" 
                         value={volumeTotal > 0 ? volumeTotal : ''} 
                         readOnly
                         placeholder="Calculado ao lado ->" 
                         className="input-glass bg-primary-500/10 border-primary-500/30 text-white font-bold" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor do Frete (R$)</label>
                  <input type="number" placeholder="0.00" className="input-glass" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo Matéria Prima (R$)</label>
                  <input type="number" placeholder="0.00" className="input-glass" />
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <button type="button" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-8 rounded-lg transition-colors shadow-lg shadow-primary-500/30 w-full md:w-auto">
                Salvar Romaneio
              </button>
            </div>
          </form>
        </div>

        {/* Ferramenta Lateral: Calculadora de Cubagem Rápida */}
        <div className="glass-panel p-6 h-fit bg-black/40">
           <h3 className="text-md font-heading font-semibold text-primary-400 mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
             <i className="fa-solid fa-calculator"></i> Assistente de Cubagem
           </h3>
           <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Espessura (cm)</label>
                <input type="number" 
                  value={cubagemForm.esp} 
                  onChange={(e) => setCubagemForm({...cubagemForm, esp: parseFloat(e.target.value)})}
                  className="input-glass" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Largura (cm)</label>
                <input type="number" 
                  value={cubagemForm.lar} 
                  onChange={(e) => setCubagemForm({...cubagemForm, lar: parseFloat(e.target.value)})}
                  className="input-glass" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comprimento (metros)</label>
                <input type="number" 
                  value={cubagemForm.comp} 
                  onChange={(e) => setCubagemForm({...cubagemForm, comp: parseFloat(e.target.value)})}
                  className="input-glass" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantidade (Peças/Toras)</label>
                <input type="number" 
                  value={cubagemForm.qtd} 
                  onChange={(e) => setCubagemForm({...cubagemForm, qtd: parseInt(e.target.value)})}
                  className="input-glass" />
              </div>
              
              <button onClick={handleCalcularCubagem} type="button" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg border border-white/10 transition-colors mt-2">
                Calcular Volume M³
              </button>

              {volumeTotal > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-center animate-pulse-slow">
                  <p className="text-xs text-primary-300 font-semibold uppercase mb-1">Volume Resultante</p>
                  <p className="text-3xl font-bold text-white">{volumeTotal.toFixed(4)} <span className="text-lg">m³</span></p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
