"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Truck, 
  User, 
  Calendar,
  Layers,
  Calculator,
  HardDrive
} from 'lucide-react';
import { calcularVolumeFardo, calcularAmarras } from '@/utils/cubagem';
import { createRomaneio, getRomaneios } from '@/services/db/romaneios';

export default function NovoRomaneioPlanilhaPage() {
  const router = useRouter();
  
  // Header Meta
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [numeroCarga, setNumeroCarga] = useState("");
  const [cliente, setCliente] = useState("SPACE PALETES (Sorocaba)");
  const [placa, setPlaca] = useState("EGT-7854");
  const [motorista, setMotorista] = useState("");
  const [cidadeDestino, setCidadeDestino] = useState("Sorocaba");
  
  // Pricing configuration (like the bottom of the Excel)
  const [precos, setPrecos] = useState({
    "MAD. 1": 820.00,
    "MAD. 2": 650.00,
    "OUTROS": 0
  });

  // Rates
  const [freteM3, setFreteM3] = useState(100.00);
  const [taxaVN, setTaxaVN] = useState(9.3); // 9.3% from Excel comment

  // Bundles (Rows)
  const [fardos, setFardos] = useState(Array(18).fill(null).map((_, i) => ({
    id: i,
    categoria: "MAD. 1",
    espessura: 0,
    largura: 0,
    comprimento: 0,
    alturaPecas: 0,
    larguraPecas: 0,
    amarras: 0,
    quantidadePecas: 0,
    volumeM3: 0,
    volumeVendaM3: 0
  })));

  // Load next number on mount
  useEffect(() => {
    async function fetchNextNumber() {
      const all = await getRomaneios();
      const num = all.length > 0 
        ? Math.max(...all.map(r => parseInt(r.numeroCarga) || 0)) + 1 
        : 1;
      setNumeroCarga(num.toString());
    }
    fetchNextNumber();
  }, []);

  // Update a fardo field
  const updateFardo = (index: number, field: string, value: any) => {
    const newFardos = [...fardos];
    const fardo = { ...newFardos[index], [field]: value };
    
    // Auto-calculate Amarras if height changes
    if (field === "alturaPecas") {
      fardo.amarras = calcularAmarras(parseInt(value) || 0);
    }
    
    // Auto-calculate totals for this row
    if (fardo.espessura && fardo.largura && fardo.comprimento && (fardo.alturaPecas || fardo.larguraPecas)) {
      const calc = calcularVolumeFardo(
        fardo.espessura,
        fardo.largura,
        fardo.comprimento,
        fardo.alturaPecas,
        fardo.larguraPecas,
        fardo.amarras
      );
      fardo.quantidadePecas = calc.quantidadeTotal;
      fardo.volumeM3 = calc.volumeTotal;
      fardo.volumeVendaM3 = calc.volumeTotal; // In Excel, usually same or adjusted via compVenda
    }

    newFardos[index] = fardo;
    setFardos(newFardos);
  };

  // Totals calculations
  const totalM3Real = fardos.reduce((acc, f) => acc + f.volumeM3, 0);
  const totalPecas = fardos.reduce((acc, f) => acc + f.quantidadePecas, 0);
  const totalPacotes = fardos.filter(f => f.quantidadePecas > 0).length;

  // Group by category for subtotal calculation
  const totalPorCategoria = fardos.reduce((acc, f) => {
    if (f.volumeM3 > 0) {
      acc[f.categoria] = (acc[f.categoria] || 0) + f.volumeM3;
    }
    return acc;
  }, {} as Record<string, number>);

  const subtotalMadeira = Object.entries(totalPorCategoria).reduce((acc, [cat, vol]) => {
    return acc + (vol * (precos[cat as keyof typeof precos] || 0));
  }, 0);

  const valorVN = subtotalMadeira * (taxaVN / 100);
  const totalFinal = subtotalMadeira + valorVN;
  const totalFrete = totalM3Real * freteM3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validFardos = fardos
      .filter(f => f.volumeM3 > 0)
      .map(({ id, ...f }) => f); // Remove local ID before saving
    
    if (validFardos.length === 0) {
      alert("Adicione pelo menos um fardo válido.");
      return;
    }

    const payload = {
      numeroCarga,
      clienteId: "TEMP_SPACE",
      clienteNome: cliente,
      dataEmissao: data,
      status: 'pendente' as const,
      motorista,
      placaVeiculo: placa,
      cidadeDestino,
      fardos: validFardos,
      totalM3: totalM3Real,
      volumeVendaTotal: totalM3Real,
      totalPecas,
      valorFreteM3: freteM3,
      taxaIva: taxaVN,
      valorImposto: valorVN,
      valorTotal: totalFinal,
      observacoes: ""
    };

    try {
      await createRomaneio(payload);
      router.push('/romaneios');
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button 
              type="button"
              onClick={() => router.back()}
              className="flex items-center text-slate-400 hover:text-white transition-colors mb-2 text-sm"
            >
              <ChevronLeft size={16} /> Voltar
            </button>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="text-primary-500" /> NOVO ROMANEIO <span className="text-primary-500">#{numeroCarga}</span>
            </h1>
            <p className="text-slate-500 text-sm">Espelhamento fiel do modelo Excel Serraria Vanmarte.</p>
          </div>
          
          <div className="flex gap-3">
            <button
               type="submit"
               className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
            >
              <Save size={18} /> SALVAR ROMANEIO
            </button>
          </div>
        </div>

        {/* Info Grid (Sticky Header Style) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#1e293b]/50 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <User size={10} /> Cliente
            </label>
            <input 
              value={cliente} onChange={e => setCliente(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={10} /> Data
            </label>
            <input 
              type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Truck size={10} /> Placa do Veículo
            </label>
            <input 
              value={placa} onChange={e => setPlaca(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none transition-all font-mono" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
               Nº Carga
            </label>
            <input 
              value={numeroCarga} onChange={e => setNumeroCarga(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary-500 outline-none transition-all font-bold text-primary-400" 
            />
          </div>
        </div>

        {/* Main Grid Table */}
        <div className="bg-[#1e293b]/30 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] text-[10px] uppercase font-bold text-slate-500 border-b border-white/10">
                  <th className="px-4 py-4 w-32">Classificação</th>
                  <th className="px-4 py-4 w-48">Medidas (cm x m)</th>
                  <th className="px-4 py-4 text-center">Fiada Alt</th>
                  <th className="px-4 py-4 text-center">Pç Lar</th>
                  <th className="px-4 py-4 text-center bg-primary-500/5">Amarras</th>
                  <th className="px-4 py-4 text-center">Total Pçs</th>
                  <th className="px-4 py-4 text-right">M³ Real</th>
                  <th className="px-4 py-4 text-right">Preço m³</th>
                  <th className="px-4 py-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fardos.map((fardo, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-2 py-1">
                      <select 
                        value={fardo.categoria}
                        onChange={e => updateFardo(index, 'categoria', e.target.value)}
                        className="w-full bg-transparent border-none text-[11px] text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="MAD. 1">MAD. 1</option>
                        <option value="MAD. 2">MAD. 2</option>
                        <option value="OUTROS">OUTROS</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <input 
                           type="number" step="0.1" placeholder="Esp"
                           className="w-12 bg-black/20 border border-white/5 rounded p-1 text-[11px] text-center font-mono"
                           value={fardo.espessura || ''} 
                           onChange={e => updateFardo(index, 'espessura', parseFloat(e.target.value))}
                        />
                        <span className="text-slate-600">x</span>
                        <input 
                           type="number" step="0.1" placeholder="Lar"
                           className="w-12 bg-black/20 border border-white/5 rounded p-1 text-[11px] text-center font-mono"
                           value={fardo.largura || ''} 
                           onChange={e => updateFardo(index, 'largura', parseFloat(e.target.value))}
                        />
                        <span className="text-slate-600">x</span>
                        <input 
                           type="number" step="0.01" placeholder="Comp"
                           className="w-14 bg-black/20 border border-white/5 rounded p-1 text-[11px] text-center font-mono"
                           value={fardo.comprimento || ''} 
                           onChange={e => updateFardo(index, 'comprimento', parseFloat(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input 
                        type="number" 
                        className="w-12 bg-black/40 border border-white/5 rounded p-1 text-[11px] text-center text-white font-bold"
                        value={fardo.alturaPecas || ''} 
                        onChange={e => updateFardo(index, 'alturaPecas', parseInt(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input 
                        type="number" 
                        className="w-12 bg-black/40 border border-white/5 rounded p-1 text-[11px] text-center text-white"
                        value={fardo.larguraPecas || ''} 
                        onChange={e => updateFardo(index, 'larguraPecas', parseInt(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-1 text-center bg-primary-500/5">
                      <input 
                        type="number" 
                        className="w-10 bg-transparent border-none text-[11px] text-center text-primary-400 font-bold"
                        value={fardo.amarras || 0} 
                        onChange={e => updateFardo(index, 'amarras', parseInt(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-1 text-center font-mono text-[11px] text-slate-400">
                      {fardo.quantidadePecas > 0 ? fardo.quantidadePecas : ''}
                    </td>
                    <td className="px-4 py-1 text-right font-mono text-[11px] text-primary-400 font-bold">
                      {fardo.volumeM3 > 0 ? fardo.volumeM3.toFixed(4) : ''}
                    </td>
                    <td className="px-4 py-1 text-right text-[11px] text-slate-500">
                      R$ {precos[fardo.categoria as keyof typeof precos]?.toFixed(2)}
                    </td>
                    <td className="px-4 py-1 text-right text-[11px] text-emerald-400 font-bold">
                       {fardo.volumeM3 > 0 ? `R$ ${(fardo.volumeM3 * precos[fardo.categoria as keyof typeof precos]).toFixed(2)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary (Legacy Excel Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Prices Configuration */}
          <div className="bg-[#1e293b]/40 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-2">
              <Calculator size={14} className="text-primary-500" /> Tabela de Preços (m³)
            </h3>
            <div className="space-y-3">
              {Object.entries(precos).map(([cat, val]) => (
                <div key={cat} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-slate-400">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-[10px]">R$</span>
                    <input 
                      type="number" 
                      value={val} 
                      onChange={e => setPrecos({...precos, [cat]: parseFloat(e.target.value)})}
                      className="w-24 bg-black/30 border border-white/10 rounded p-1.5 text-xs text-right text-white font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/5">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Frete (m³)</span>
                  <input 
                    type="number" value={freteM3} onChange={e => setFreteM3(parseFloat(e.target.value))}
                    className="w-24 bg-black/30 border border-white/10 rounded p-1.5 text-xs text-right text-primary-400 font-mono" 
                  />
               </div>
            </div>
          </div>

          {/* Logic/Notes */}
          <div className="bg-[#1e293b]/40 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-2">
              <HardDrive size={14} className="text-primary-500" /> Lógica de Carregamento
            </h3>
            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <p>• <strong className="text-slate-300">Amarras:</strong> Calculadas automaticamente com base na altura do fardo (Ex: 10 fiadas = 8, 50 = 16).</p>
              <p>• <strong className="text-slate-300">Total Pacotes:</strong> {totalPacotes} unidades detectadas.</p>
              <p>• <strong className="text-slate-300">Cubagem Real:</strong> Considera as dimensões físicas completas para transporte.</p>
            </div>
            <div className="pt-4 border-t border-white/5">
               <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Diferencial Imposto (V.N)</label>
               <div className="flex items-center gap-3">
                 <input 
                    type="number" value={taxaVN} onChange={e => setTaxaVN(parseFloat(e.target.value))}
                    className="w-16 bg-black/30 border border-white/10 rounded p-1.5 text-xs text-center text-white" 
                 />
                 <span className="text-xs text-slate-500">% sobre o Total Madeira</span>
               </div>
            </div>
          </div>

          {/* Calculations Result */}
          <div className="bg-primary-600/10 p-8 rounded-3xl border border-primary-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Calculator size={100} />
            </div>
            
            <div className="relative space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-3">
                <span className="text-xs text-slate-400 uppercase font-bold">Total Madeira:</span>
                <span className="text-xl font-bold text-white font-mono">R$ {subtotalMadeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-3">
                <span className="text-xs text-slate-400 uppercase font-bold">V.N ({taxaVN}%):</span>
                <span className="text-lg font-bold text-slate-300 font-mono">R$ {valorVN.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-3">
                <span className="text-xs text-slate-400 uppercase font-bold">Total Cubagem:</span>
                <span className="text-lg font-black text-primary-400 font-mono">{totalM3Real.toFixed(4)} m³</span>
              </div>
              <div className="pt-4 flex flex-col items-end">
                <span className="text-[10px] uppercase font-black text-primary-500 mb-1">Valor Total Geral</span>
                <span className="text-4xl font-black text-white tracking-tighter shadow-primary-500/20 drop-shadow-lg">
                  R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[9px] text-slate-500 mt-2 italic">* Total Frete Estimado: R$ {totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
}
