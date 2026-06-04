import React, { useMemo, useState } from 'react';
import { Preventive } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie, Legend, AreaChart, Area, LabelList
} from 'recharts';
import { 
  Zap, CheckCircle2, AlertCircle, XCircle, Clock, 
  Search, Download, ArrowUpRight, 
  ArrowDownRight, Truck, Activity, Shield, Cpu,
  Globe, Server, BarChart3, Radio, Camera, ImagePlus, Loader2, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { submitPreventiveUpdateToSheet } from '../services/sheetService';

interface Props {
  data: Preventive[];
}

const PreventiveMaintenanceModule: React.FC<Props> = ({ data }) => {
  const [filterCd, setFilterCd] = useState<string>('TODOS');
  const [filterMonth, setFilterMonth] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Preventive | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<Preventive | null>(null);
  const [uploading, setUploading] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image')) return trimmed;

    // Google Drive matching (supports open?id=, file/d/, uc?id=, etc)
    const driveMatch = trimmed.match(/(?:id=|\/d\/|preview\/|uc\?id=)([a-zA-Z0-9_-]{25,})/);
    if (driveMatch && driveMatch[1]) {
      // thumbnail is the most reliable way to bypass most cookie/auth redirect blocks for <img> tags
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=s4000`;
    }
    return trimmed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 6 - capturedImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      filesToProcess.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImages(prev => [...prev, reader.result as string].slice(0, 6));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const createCollage = async (images: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(images[0]);

      // Determine dimensions based on count
      const count = images.length;
      let cols = 2;
      let rows = 2;

      if (count === 1) { cols = 1; rows = 1; }
      else if (count <= 2) { cols = 2; rows = 1; }
      else if (count <= 4) { cols = 2; rows = 2; }
      else if (count <= 6) { cols = 3; rows = 2; }

      const padding = 10;
      const slotW = 800;
      const slotH = 600;

      canvas.width = cols * slotW + (cols + 1) * padding;
      canvas.height = rows * slotH + (rows + 1) * padding;

      const loadedImages: HTMLImageElement[] = [];
      let loadedCount = 0;

      images.forEach((src, idx) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loadedImages[idx] = img;
          loadedCount++;
          if (loadedCount === images.length) {
            ctx.fillStyle = "#ffffff"; // White background for the collage base
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            loadedImages.forEach((image, i) => {
              const r = i % cols;
              const c = Math.floor(i / cols);
              
              const x = r * slotW + (r + 1) * padding;
              const y = c * slotH + (c + 1) * padding;

              // Cover logic to avoid black spaces
              const imgAspect = image.width / image.height;
              const slotAspect = slotW / slotH;
              
              let drawW, drawH, sx, sy, sW, sH;

              if (imgAspect > slotAspect) {
                // Image is wider than slot - crop sides
                sH = image.height;
                sW = image.height * slotAspect;
                sx = (image.width - sW) / 2;
                sy = 0;
              } else {
                // Image is taller than slot - crop top/bottom
                sW = image.width;
                sH = image.width / slotAspect;
                sx = 0;
                sy = (image.height - sH) / 2;
              }

              ctx.drawImage(image, sx, sy, sW, sH, x, y, slotW, slotH);
            });

            resolve(canvas.toDataURL('image/jpeg', 0.85));
          }
        };
        img.src = src;
      });
    });
  };

  const handleUpdateSubmission = async () => {
    if (!selectedItem || capturedImages.length === 0) {
      alert('Por favor cargue al menos una evidencia.');
      return;
    }

    setUploading(true);
    try {
      const finalImage = capturedImages.length > 1 ? await createCollage(capturedImages) : capturedImages[0];
      
      const success = await submitPreventiveUpdateToSheet({
        plate: selectedItem.placa,
        //@ts-ignore
        date: new Date().toISOString().split('T')[0],
        evidence: finalImage
      });

      if (success) {
        alert('Ejecución registrada exitosamente.');
        setSelectedItem(null);
        setCapturedImages([]);
      } else {
        alert('Error al registrar. Verifique la conexión.');
      }
    } catch (error) {
      console.error('Error subiendo evidencia:', error);
      alert('Error en el envío.');
    } finally {
      setUploading(false);
    }
  };

  const months = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(d => d.mes))).filter(Boolean)], [data]);
  const cds = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(d => d.cd))).filter(Boolean)], [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchCd = filterCd === 'TODOS' || d.cd === filterCd;
      const matchMonth = filterMonth === 'TODOS' || d.mes === filterMonth;
      const matchSearch = !searchTerm || d.placa.toLowerCase().includes(searchTerm.toLowerCase()) || d.linea.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCd && matchMonth && matchSearch;
    });
  }, [data, filterCd, filterMonth, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const compliant = filteredData.filter(d => d.validaccionCumplimiento === 1).length;
    const complianceRate = total > 0 ? (compliant / total) * 100 : 0;
    const avgDiff = total > 0 
      ? filteredData.reduce((acc, curr) => acc + curr.diferencia, 0) / total 
      : 0;
    return { total, compliant, complianceRate, avgDiff };
  }, [filteredData]);

  const trendData = useMemo(() => {
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const groups = filteredData.reduce((acc: any, curr) => {
      const m = curr.mes?.toUpperCase() || 'N/A';
      if (!acc[m]) acc[m] = { month: m, compliant: 0, total: 0 };
      acc[m].total++;
      if (curr.validaccionCumplimiento === 1) acc[m].compliant++;
      return acc;
    }, {});
    return Object.values(groups)
      .map((g: any) => ({ ...g, rate: Math.round((g.compliant / g.total) * 100) }))
      .sort((a: any, b: any) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
  }, [filteredData]);

  const weeklyTrendData = useMemo(() => {
    const groups = filteredData.reduce((acc: any, curr) => {
      const w = curr.semEjecucion ? `S${curr.semEjecucion}` : 'N/A';
      if (!acc[w]) acc[w] = { week: w, compliant: 0, total: 0 };
      acc[w].total++;
      if (curr.validaccionCumplimiento === 1) acc[w].compliant++;
      return acc;
    }, {});
    return Object.values(groups)
      .map((g: any) => ({ ...g, rate: Math.round((g.compliant / g.total) * 100) }))
      .sort((a: any, b: any) => {
        const wA = parseInt(a.week.replace('S', '')) || 0;
        const wB = parseInt(b.week.replace('S', '')) || 0;
        return wA - wB;
      }).slice(-12); // Últimas 12 semanas
  }, [filteredData]);

  const complianceRangeData = useMemo(() => {
    const counts = filteredData.reduce((acc: any, curr) => {
      const r = curr.cumplimientoRango?.trim();
      if (!r) return acc;
      
      const lowerR = r.toLowerCase();
      if (lowerR.includes('cumpli') && !lowerR.includes('no')) {
        acc['Cumplió'] = (acc['Cumplió'] || 0) + 1;
      } else if (lowerR.includes('no cumpli')) {
        acc['No cumplió'] = (acc['No cumplió'] || 0) + 1;
      }
      return acc;
    }, {});

    const total = Object.values(counts).reduce((a: any, b: any) => a + (b as number), 0) as number;
    
    return Object.entries(counts).map(([range, count]) => ({
      range,
      count,
      percentage: total > 0 ? Math.round((count as number / total) * 100) : 0
    })).sort((a: any, b: any) => b.count - a.count);
  }, [filteredData]);

  const modelData = useMemo(() => {
    const groups = filteredData.reduce((acc: any, curr) => {
      const l = curr.linea || 'N/A';
      if (!acc[l]) acc[l] = { model: l, compliant: 0, total: 0 };
      acc[l].total++;
      if (curr.validaccionCumplimiento === 1) acc[l].compliant++;
      return acc;
    }, {});
    return Object.values(groups)
      .map((g: any) => ({ ...g, rate: Math.round((g.compliant / g.total) * 100) }))
      .sort((a: any, b: any) => b.total - a.total).slice(0, 8);
  }, [filteredData]);

  const maintenanceTypeData = useMemo(() => {
    const groups = filteredData.reduce((acc: any, curr) => {
      const type = curr.tipo || 'SIN TIPO';
      if (!acc[type]) acc[type] = { name: type, count: 0 };
      acc[type].count++;
      return acc;
    }, {});
    
    const total = filteredData.length;
    return Object.values(groups).map((g: any) => ({
      ...g,
      percentage: total > 0 ? Math.round((g.count / total) * 100) : 0
    })).sort((a: any, b: any) => b.count - a.count);
  }, [filteredData]);

  const NEON = {
    green: '#10F9AC',
    cyan: '#00D1FF',
    blue: '#3B82F6',
    amber: '#F59E0B',
    red: '#FF4D4D',
    bg: '#0F172A',
    panel: '#1E293B'
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 p-4 lg:p-8 space-y-8 font-sans">
      {/* Panel de Encabezado */}
      <header className="relative overflow-hidden bg-[#1E293B]/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D1FF]/5 blur-[100px] -mr-48 -mt-48 pointer-events-none transition-all duration-700 group-hover:bg-[#00D1FF]/10"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 z-10 relative">
          <div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white uppercase italic">
              MTTO <span className="text-[#10F9AC] not-italic">PREVENTIVO</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="BÚSQUEDA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black focus:border-[#00D1FF]/40 focus:bg-white/10 outline-none transition-all w-72 uppercase tracking-widest text-white placeholder:text-slate-600"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <select 
                value={filterCd}
                onChange={(e) => setFilterCd(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase px-4 py-2.5 outline-none text-[#00D1FF] cursor-pointer hover:bg-white/5 rounded-xl transition-all"
              >
                {cds.map(c => <option key={c} value={c} className="bg-[#1E293B] text-white">{c === 'TODOS' ? 'TODOS LOS CD' : c}</option>)}
              </select>
              <div className="w-px h-6 bg-white/10"></div>
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase px-4 py-2.5 outline-none text-[#10F9AC] cursor-pointer hover:bg-white/5 rounded-xl transition-all"
              >
                {months.map(m => <option key={m} value={m} className="bg-[#1E293B] text-white">{m === 'TODOS' ? 'CRONOGRAMA: TODOS' : m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Índice de Cumplimiento', val: `${stats.complianceRate.toFixed(1)}%`, color: NEON.green, icon: Shield, desc: 'Ratio de Éxito Operativo', data: trendData.map(t => t.rate) },
          { label: 'PLACAS PROGRAMADAS', val: stats.total, color: NEON.cyan, icon: Cpu, desc: 'Mantenimientos en Flota Activa', data: trendData.map(t => t.total) },
          { label: 'Desviación Media', val: `${Math.round(stats.avgDiff)} KM`, color: stats.avgDiff > 500 ? NEON.red : NEON.amber, icon: Activity, desc: 'Varianza Predictiva', data: trendData.slice(-6).map(t => t.total) },
          { label: 'Nodos Tácticos', val: Array.from(new Set(filteredData.map(d => d.placa))).length, color: NEON.blue, icon: Server, desc: 'Puntos de Distribución', data: trendData.map(t => t.compliant) }
        ].map((kpi, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative bg-[#1E293B]/30 backdrop-blur-lg border border-white/5 rounded-[2rem] p-7 shadow-xl group hover:bg-[#1E293B]/50 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500" style={{ color: kpi.color }}>
              <kpi.icon size={32} strokeWidth={1.5} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 group-hover:text-slate-400 transition-colors">{kpi.label}</p>
              <h3 className="text-4xl font-black tracking-tighter text-white drop-shadow-2xl" style={{ textShadow: `0 0 30px ${kpi.color}40` }}>{kpi.val}</h3>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-2">{kpi.desc}</p>
              
              <div className="h-14 w-full mt-8 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.data.map((v, i) => ({ v }))}>
                    <defs>
                      <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpi.color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={kpi.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2.5} fill={`url(#grad-${idx})`} dot={false} isAnimationActive={true} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grilla Principal de Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-12 bg-[#111827]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 shadow-3xl overflow-hidden relative"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Evolución de <span className="not-italic text-slate-400">Cumplimiento Mensual</span></h3>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-3 h-3 rounded-full bg-[#10F9AC] shadow-[0_0_10px_#10F9AC]"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta: 85%</span>
            </div>
          </div>

          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10F9AC" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10F9AC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} dy={15} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '20px', fontSize: '11px', fontWeight: 900 }}
                  itemStyle={{ color: '#10F9AC' }}
                  cursor={{ stroke: '#10F9AC', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="rate" stroke="#10F9AC" strokeWidth={5} fillOpacity={1} fill="url(#mainGrad)" dot={{ r: 6, fill: '#10F9AC', strokeWidth: 3, stroke: '#0F172A' }} activeDot={{ r: 10, shadow: '0 0 20px #10F9AC' }}>
                  <LabelList dataKey="rate" position="top" offset={15} fill="#FFFFFF" style={{ fontSize: '10px', fontWeight: 900 }} formatter={(v: any) => `${v}%`} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8 bg-[#111827]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 shadow-3xl"
        >
          <div className="mb-12">
            <h4 className="text-[10px] font-black text-[#10F9AC] uppercase tracking-[0.3em] mb-2">Análisis de Desempeño Semanal</h4>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Cumplimiento <span className="text-slate-400 not-italic">por Semana (Ejecución)</span></h3>
          </div>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 900 }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="rate" radius={[10, 10, 0, 0]} barSize={40}>
                   {weeklyTrendData.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate === 100 ? NEON.green : NEON.red} />
                  ))}
                  <LabelList dataKey="rate" position="top" fill="#FFFFFF" style={{ fontSize: '10px', fontWeight: 900 }} formatter={(v: any) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-4 bg-[#111827]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 shadow-3xl text-center"
        >
          <div className="mb-12">
            <h4 className="text-[10px] font-black text-[#10F9AC] uppercase tracking-[0.3em] mb-2">Métricas de Columna M</h4>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Cumplimiento <span className="text-slate-400 not-italic">por Rango</span></h3>
          </div>
          
          <div className="h-[380px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceRangeData}
                  innerRadius={90}
                  outerRadius={125}
                  paddingAngle={10}
                  dataKey="count"
                  nameKey="range"
                  animationDuration={2000}
                >
                  {complianceRangeData.map((entry: any, index) => {
                    const isCompliant = entry.range === 'Cumplió';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isCompliant ? NEON.green : NEON.red} 
                        stroke="none"
                        className="outline-none"
                      />
                    );
                  })}
                  <LabelList dataKey="percentage" position="outside" fill="#FFFFFF" style={{ fontSize: '11px', fontWeight: 900 }} formatter={(v: any) => `${v}%`} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 900 }} />
                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-4">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Total</span>
              <span className="text-5xl font-black text-white tracking-widest mt-2">{filteredData.length}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-8 bg-[#111827]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 shadow-3xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Análisis de Infraestructura</h4>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Eficiencia de Activos <span className="text-slate-400 not-italic">por Modelo</span></h3>
            </div>
          </div>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1E293B" />
                <XAxis type="number" hide />
                <YAxis dataKey="model" type="category" axisLine={false} tickLine={false} width={130} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#1E293B', borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 900 }} />
                <Bar dataKey="rate" radius={[0, 15, 15, 0]} barSize={26}>
                  {modelData.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate === 100 ? NEON.green : NEON.red} style={{ filter: `drop-shadow(0 0 15px ${entry.rate === 100 ? NEON.green : NEON.red}40)` }} />
                  ))}
                  <LabelList dataKey="rate" position="right" offset={10} fill="#FFFFFF" style={{ fontSize: '9px', fontWeight: 900 }} formatter={(v: any) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-4 bg-[#111827]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 shadow-3xl text-center"
        >
          <div className="mb-12">
            <h4 className="text-[10px] font-black text-[#00D1FF] uppercase tracking-[0.3em] mb-2">Distribución Logística</h4>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Carga <span className="text-slate-400 not-italic">por CD</span></h3>
          </div>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cds.filter(c => c !== 'TODOS').map(c => ({
                    name: c,
                    value: data.filter(d => d.cd === c).length
                  }))}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  nameKey="name"
                >
                  <Cell fill={NEON.cyan} stroke="none" className="outline-none" />
                  <Cell fill={NEON.blue} stroke="none" className="outline-none" />
                  <Cell fill={NEON.green} stroke="none" className="outline-none" />
                  <LabelList dataKey="value" position="outside" fill="#FFFFFF" style={{ fontSize: '11px', fontWeight: 900 }} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 900 }} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="lg:col-span-12 bg-[#111827]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 shadow-3xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-2">Clasificación Operativa</h4>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Distribución por <span className="text-slate-400 not-italic">Tipo de Preventivo</span></h3>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceTypeData} barGap={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 900 }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="count" radius={[15, 15, 15, 15]} barSize={60}>
                  {maintenanceTypeData.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={[NEON.green, NEON.cyan, NEON.blue, NEON.amber, NEON.red][index % 5]} />
                  ))}
                  <LabelList dataKey="percentage" position="top" offset={10} fill="#FFFFFF" style={{ fontSize: '12px', fontWeight: 900 }} formatter={(v: any) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Registro de Control - Grilla de Datos */}
      <motion.section 
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111827]/60 backdrop-blur-3xl rounded-[4rem] border border-white/5 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-t border-t-white/10"
      >
        <div className="p-12 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00D1FF]/5 blur-[80px] -mr-32 -mt-32"></div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 size={18} className="text-[#10F9AC]" />
              <h4 className="text-[11px] font-black text-[#10F9AC] uppercase tracking-[0.4em]">Libro de Operaciones v2.10</h4>
            </div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Torre de Control <span className="text-slate-400 not-italic">en Tiempo Real</span></h3>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-6 py-3 bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_0_20px_rgba(255,77,77,0.1)]">
                <AlertCircle size={16} className="animate-pulse" /> Monitoreo de Integridad de Activos Activo
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Nodo / Clase</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Sector (CD)</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Frecuencia</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Buffer de Ejecución</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Métricas de Log</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Deriva (KM)</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Estado</th>
                <th className="p-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {filteredData.slice(0, 50).map((item) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-white/10 transition-all duration-500 cursor-pointer border-l-2 border-transparent hover:border-l-[#10F9AC]"
                  >
                    <td className="p-10">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-white group-hover:text-[#00D1FF] transition-all tracking-wider">{item.placa}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 border-l border-white/10 pl-3">{item.linea}</span>
                      </div>
                    </td>
                    <td className="p-10">
                      <span className="text-[11px] font-black text-[#00D1FF] uppercase tracking-[0.3em] transition-colors">{item.cd}</span>
                    </td>
                    <td className="p-10">
                      <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-slate-800 rounded-2xl text-[#3B82F6] border border-blue-500/20 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                          <Truck size={14} />
                        </div>
                        <span className="text-[11px] font-black text-slate-300 tracking-widest">{item.frecuencia} KM CICLO</span>
                      </div>
                    </td>
                    <td className="p-10">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-[#10F9AC] uppercase tracking-[0.3em]">{item.mes}</span>
                        <span className="text-[10px] font-black text-slate-600 mt-2 flex items-center gap-2"><Clock size={12} /> {item.fechaEjecucion}</span>
                      </div>
                    </td>
                    <td className="p-10">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-white">{item.kmRegistrado} <span className="text-slate-600 font-bold ml-1">ACTUAL</span></span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-black text-slate-600 tracking-[0.2em]">PRÓX: {item.proximoKm}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-10">
                      <div className="text-[12px] font-black flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/5 bg-white/5 text-slate-300">
                        <Activity size={16} className="opacity-50" />
                        {Math.abs(item.diferencia)} KM
                      </div>
                    </td>
                    <td className="p-10">
                      {item.validaccionCumplimiento === 1 ? (
                        <div className="flex items-center gap-3 text-[#10F9AC] font-black text-[11px] uppercase tracking-[0.3em] bg-[#10F9AC]/5 px-6 py-3 rounded-2xl border border-[#10F9AC]/20 shadow-[0_0_30px_rgba(16,249,172,0.1)] group-hover:shadow-[0_0_40px_rgba(16,249,172,0.2)] transition-all">
                          <div className="w-2 h-2 rounded-full bg-[#10F9AC] shadow-[0_0_10px_#10F9AC]"></div> Cumplió
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-[#FF4D4D] font-black text-[11px] uppercase tracking-[0.3em] bg-[#FF4D4D]/5 px-6 py-3 rounded-2xl border border-[#FF4D4D]/20 shadow-[0_0_30px_rgba(255,77,77,0.1)] group-hover:shadow-[0_0_40px_rgba(255,77,77,0.2)] transition-all">
                           <div className="w-2 h-2 rounded-full bg-[#FF4D4D] shadow-[0_0_10px_#FF4D4D] animate-pulse"></div> No cumplió
                        </div>
                      )}
                    </td>
                    <td className="p-10 text-center">
                      {!item.evidenceUrl ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="p-4 bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20 rounded-2xl hover:bg-[#00D1FF]/20 hover:scale-110 transition-all group/btn flex items-center gap-3 mx-auto"
                        >
                          <Camera size={18} className="group-hover/btn:rotate-12" />
                          <span className="text-[10px] font-black uppercase tracking-widest bg-[#00D1FF] text-black px-2 py-0.5 rounded ml-1">REG</span>
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingEvidence(item);
                          }}
                          className="p-4 bg-[#10F9AC]/10 text-[#10F9AC] border border-[#10F9AC]/20 rounded-2xl hover:bg-[#10F9AC]/20 hover:scale-110 transition-all group/btn flex items-center gap-3 mx-auto"
                        >
                          <ImageIcon size={18} className="group-hover/btn:scale-110" />
                          <span className="text-[10px] font-black uppercase tracking-widest bg-[#10F9AC] text-black px-2 py-0.5 rounded ml-1">VER</span>
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* Modal de Registro de Evidencia */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1E293B] border border-white/10 rounded-[3rem] w-full max-w-xl overflow-hidden shadow-4xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight">REGISTRAR <span className="text-[#10F9AC]">EJECUCIÓN</span></h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Placa: {selectedItem.placa}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-slate-400">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Evidencias Fotográficas ({capturedImages.length}/6)</label>
                    {capturedImages.length > 0 && (
                      <button 
                        onClick={() => setCapturedImages([])}
                        className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                      >
                        Limpiar todos
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {capturedImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/20 group">
                        <img src={img} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 bg-rose-500 text-white rounded-full hover:scale-110 transition-transform"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {capturedImages.length < 6 && (
                      <label className="aspect-video rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#10F9AC]/40 transition-all flex flex-col items-center justify-center cursor-pointer group">
                        <input 
                          type="file" 
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <ImagePlus size={24} className="text-[#10F9AC] mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Añadir Foto</span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    disabled={uploading}
                    onClick={handleUpdateSubmission}
                    className="flex-1 bg-[#10F9AC] hover:bg-[#0fd996] disabled:bg-slate-700 disabled:cursor-not-allowed text-black font-black uppercase py-4 rounded-2xl tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,249,172,0.3)]"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        REGISTRAR EN HOJA
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modal de Visualización de Evidencia */}
      <AnimatePresence>
        {viewingEvidence && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1E293B] border border-white/10 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-4xl max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight">VISUALIZAR <span className="text-[#00D1FF]">EVIDENCIAS</span></h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Placa: {viewingEvidence.placa}</p>
                </div>
                <button onClick={() => setViewingEvidence(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-slate-400">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {viewingEvidence.evidenceUrl?.split(',').filter(url => url && url.trim() !== '').map((url, idx) => {
                    const directUrl = getDirectImageUrl(url);
                    const originalUrl = url.trim();
                    const isError = originalUrl === 'Error Archivo';
                    
                    return (
                      <div key={idx} className="relative aspect-video bg-black/40 rounded-3xl overflow-hidden border border-white/10 group shadow-2xl flex flex-col">
                        {isError ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                            <XCircle size={48} className="text-rose-500 mb-4" />
                            <span className="text-[12px] font-black text-rose-500 uppercase tracking-widest">Error al cargar archivo en el servidor</span>
                          </div>
                        ) : (
                          <>
                            {directUrl && directUrl.trim() !== '' ? (
                              <img 
                                src={directUrl} 
                                className="w-full h-full object-contain" 
                                alt={`Evidencia ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // If thumbnail fails, try direct URL as fallback
                                  if (e.currentTarget.src !== originalUrl) {
                                    e.currentTarget.src = originalUrl;
                                  }
                                }}
                              />
                            ) : null}
                            <div className="absolute top-4 left-4 p-3 bg-black/60 rounded-xl backdrop-blur-md border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                              Imagen {idx + 1}
                            </div>
                            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a 
                                href={originalUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-3 bg-[#00D1FF] text-black rounded-xl hover:scale-110 transition-transform shadow-xl"
                                title="Abrir original"
                              >
                                <Globe size={16} />
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-8 border-t border-white/5 bg-black/20 flex-shrink-0 flex justify-end gap-4">
                 <button 
                   onClick={() => setViewingEvidence(null)}
                   className="px-10 py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all"
                 >
                   Cerrar Vista
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex items-center justify-center p-12 border-t border-white/5 mt-12 bg-gradient-to-t from-black/20 to-transparent">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
          Gerencia de Flota • Barranquilla
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          background: rgba(255,255,255,0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 249, 172, 0.2);
          border-radius: 10px;
        }
        .shadow-3xl {
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
        }
        .shadow-4xl {
          box-shadow: 0 70px 150px -30px rgba(0,0,0,0.7);
        }
      `}} />
    </div>
  );
};

export default PreventiveMaintenanceModule;
