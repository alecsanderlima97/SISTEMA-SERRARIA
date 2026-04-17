"use client";
import Link from "next/link";
import { useState } from "react";
import { calcularVolumeFardo } from "@/utils/cubagem";
import { addEstoquePacote } from "@/services/db/estoque";
import { useRouter } from "next/navigation";

export default function NovoPacotePage() {
  const router = useRouter();
  const [fardoForm, setFardoForm] = useState({ 
    espessura: 0, 
    largura: 0, 
    comprimento: 0, 
    altPecas: 0, 
    larPecas: 0, 
    amarras: 0 
  });
  
  const [mainForm, setMainForm] = useState({
    identificador: "",
    dataProducao: "",
    operador: "",
    status: "Liberado"
  });

  const [qtdCalculada, setQtdCalculada] = useState(0);
  const [volumeCalculado, setVolumeCalculado] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalcularFardo = () => {
    const { quantidadeTotal, volumeTotal } = calcularVolumeFardo(
      fardoForm.espessura,
      fardoForm.largura,
      fardoForm.comprimento,
      fardoForm.altPecas,
      fardoForm.larPecas,
      fardoForm.amarras
    );
    setQtdCalculada(quantidadeTotal);
    setVolumeCalculado(volumeTotal);
  };

  const handleSalvar = async () => {
    if (!mainForm.identificador || volumeCalculado <= 0) {
      alert("Preencha o identificador do pacote e calcule o volume antes de salvar!");
      return;
    }
    
    setIsLoading(true);
    const result = await addEstoquePacote({
      ...mainForm,
      ...fardoForm,
      quantidadeCalculada: qtdCalculada,
      volumeCalculado: volumeCalculado
    });

    setIsLoading(false);
    if (result.success) {
      alert("Pacote registrado com sucesso no estoque!");
      router.push("/estoque");
    } else {
      alert("Erro ao salvar: " + result.error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <Link href="/estoque" className="text-primary-500 hover:text-primary-400 text-sm font-medium mb-4 inline-flex items-center gap-2">
            <span>←</span> Voltar para Estoque
          </Link>
          <h1 className="text-3xl font-heading font-bold text-white mb-1"><span className="text-primary-500">Produzir</span> Novo Pacote</h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Amarrados / Fardos de Madeira Serrada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário Principal do Pacote */}
        <div className="glass-panel p-8 border-t-4 border-t-primary-500 lg:col-span-2">
          <form className="space-y-8">
            <section>
              <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-primary-500">1.</span> Dados de Origem
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identificador (Lote/Pacote)</label>
                  <input type="text" value={mainForm.identificador} onChange={(e) => setMainForm({...mainForm, identificador: e.target.value})} placeholder="Ex: PAC-005" className="input-glass font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data de Produção</label>
                  <input type="date" value={mainForm.dataProducao} onChange={(e) => setMainForm({...mainForm, dataProducao: e.target.value})} className="input-glass" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operador / Máquina</label>
                  <input type="text" value={mainForm.operador} onChange={(e) => setMainForm({...mainForm, operador: e.target.value})} placeholder="Nome do responsável" className="input-glass" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status do Material</label>
                  <select value={mainForm.status} onChange={(e) => setMainForm({...mainForm, status: e.target.value})} className="input-glass">
                    <option value="Liberado">Madeira Verde (Liberado)</option>
                    <option value="Secagem">Em Secagem (Estufa/Pátio)</option>
                    <option value="Separado">Separado para Pedido</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-heading font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-primary-500">2.</span> Validação e Etiquetagem
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Peças neste Fardo</label>
                  <input type="number" 
                         value={qtdCalculada > 0 ? qtdCalculada : ''} 
                         readOnly
                         placeholder="Use a calculadora ao lado ->" 
                         className="input-glass bg-black/40 text-white font-bold" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume Real (M³)</label>
                  <input type="number" 
                         value={volumeCalculado > 0 ? volumeCalculado : ''} 
                         readOnly
                         placeholder="Usa a calculadora ao lado ->" 
                         className="input-glass bg-primary-500/10 border-primary-500/30 text-primary-400 font-bold" />
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <input type="checkbox" id="printEtiqueta" className="w-5 h-5 accent-primary-500 bg-black/40 border-white/20 rounded cursor-pointer" />
                <label htmlFor="printEtiqueta" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Imprimir etiqueta do pacote após salvar (Gera arquivo PDF Dymo/Zebra)
                </label>
              </div>
            </section>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <button onClick={handleSalvar} disabled={isLoading} type="button" className={`bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-8 rounded-lg transition-colors shadow-lg shadow-primary-500/30 w-full md:w-auto ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isLoading ? "Salvando..." : "Salvar Pacote no Estoque"}
              </button>
            </div>
          </form>
        </div>

        {/* Ferramenta Lateral: Calculadora de Fardo */}
        <div className="glass-panel p-6 h-fit bg-black/40">
           <h3 className="text-md font-heading font-semibold text-primary-400 mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
             <i className="fa-solid fa-cube"></i> Dimensões do Fardo
           </h3>
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Esp (cm)</label>
                  <input type="number" 
                    value={fardoForm.espessura} 
                    onChange={(e) => setFardoForm({...fardoForm, espessura: parseFloat(e.target.value)})}
                    className="input-glass text-center" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Lar (cm)</label>
                  <input type="number" 
                    value={fardoForm.largura} 
                    onChange={(e) => setFardoForm({...fardoForm, largura: parseFloat(e.target.value)})}
                    className="input-glass text-center" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comprimento (metros)</label>
                <input type="number" 
                  value={fardoForm.comprimento} 
                  onChange={(e) => setFardoForm({...fardoForm, comprimento: parseFloat(e.target.value)})}
                  className="input-glass" />
              </div>
              
              <div className="border-t border-white/10 my-4 pt-4">
                <h4 className="text-xs font-bold text-white mb-3 uppercase opacity-70">Disposição (Opcional)</h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Alt (Lonas)</label>
                    <input type="number" 
                      value={fardoForm.altPecas} 
                      onChange={(e) => setFardoForm({...fardoForm, altPecas: parseInt(e.target.value) || 0})}
                      className="input-glass text-center" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Lar (Lonas)</label>
                    <input type="number" 
                      value={fardoForm.larPecas} 
                      onChange={(e) => setFardoForm({...fardoForm, larPecas: parseInt(e.target.value) || 0})}
                      className="input-glass text-center" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amarras / Sobras</label>
                  <input type="number" 
                    value={fardoForm.amarras} 
                    onChange={(e) => setFardoForm({...fardoForm, amarras: parseInt(e.target.value) || 0})}
                    className="input-glass" />
                </div>
              </div>
              
              <button onClick={handleCalcularFardo} type="button" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg border border-white/10 transition-colors mt-2">
                Calcular M³ e Peças
              </button>

              {volumeCalculado > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-center animate-pulse-slow">
                  <div className="p-3 rounded-lg bg-black/60 border border-white/5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Total Peças</p>
                    <p className="text-xl font-bold text-white">{qtdCalculada} <span className="text-sm font-normal">un</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                    <p className="text-[10px] text-primary-300 font-semibold uppercase mb-1">Vol Final</p>
                    <p className="text-xl font-bold text-primary-400">{volumeCalculado.toFixed(3)} <span className="text-sm font-normal">m³</span></p>
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
