
import React, { useMemo } from 'react';
import { Calibration } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList
} from 'recharts';
import { LayoutGrid, Building2, Users, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface CalibrationVisualsProps {
  calibrations: Calibration[];
  selectedYear: number;
  selectedMonth: string;
  selectedCd?: string;
  selectedContractor?: string;
}

const CalibrationVisuals: React.FC<CalibrationVisualsProps> = ({ 
  calibrations, 
  selectedYear, 
  selectedMonth,
  selectedCd = 'all',
  selectedContractor = 'all'
}) => {
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  // Base filtered data (Year + CD + Contractor)
  const baseFilteredData = useMemo(() => {
    return calibrations.filter(c => {
      const matchYear = c.year === selectedYear;
      const matchCd = selectedCd === 'all' || (c.cd && c.cd.toUpperCase().trim() === selectedCd.toUpperCase().trim());
      const matchContractor = selectedContractor === 'all' || (c.contractor && c.contractor.toUpperCase().trim() === selectedContractor.toUpperCase().trim());
      return matchYear && matchCd && matchContractor;
    });
  }, [calibrations, selectedYear, selectedCd, selectedContractor]);

  // Specific month filter for KPIs and single-month charts
  const monthFilteredData = useMemo(() => {
    if (selectedMonth === 'TODOS') return baseFilteredData;
    return baseFilteredData.filter(c => {
      const cMonth = (c.month || "").toUpperCase().trim();
      const sMonth = selectedMonth.toUpperCase().trim();
      return cMonth === sMonth || cMonth.includes(sMonth) || sMonth.includes(cMonth);
    });
  }, [baseFilteredData, selectedMonth]);

  // 1. Cumplimiento mes a mes (uses baseFilteredData)
  const monthlyData = useMemo(() => {
    return months.map(m => {
      const monthCalibrations = baseFilteredData.filter(c => {
         const cMonth = (c.month || "").toUpperCase().trim();
         return cMonth === m || cMonth.includes(m) || m.includes(cMonth);
      });
      const total = monthCalibrations.length;
      const completed = monthCalibrations.filter(c => {
        const est = (c.estado || "").toUpperCase().trim();
        return est === 'COMPLETADO' || est === 'CERRADO' || est === 'REALIZADO' || est === 'OK';
      }).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { name: m.substring(0, 3), percentage, total, completed };
    });
  }, [baseFilteredData]);

  // 2. Cumplimiento por CD (uses monthFilteredData)
  const cdData = useMemo(() => {
    const cds: Record<string, { total: number, completed: number }> = {};
    
    monthFilteredData.forEach(c => {
      const cdRaw = (c.cd || "").trim().toUpperCase();
      const cd = cdRaw && cdRaw !== "GENERAL" ? cdRaw : "CD NO IDENTIFICADO";
      if (!cds[cd]) cds[cd] = { total: 0, completed: 0 };
      cds[cd].total++;
      
      const est = (c.estado || "").toUpperCase().trim();
      if (est === 'COMPLETADO' || est === 'CERRADO' || est === 'REALIZADO' || est === 'OK') {
        cds[cd].completed++;
      }
    });

    return Object.entries(cds).map(([name, data]) => ({
      name,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      total: data.total,
      completed: data.completed
    })).sort((a,b) => b.total - a.total).slice(0, 8);
  }, [monthFilteredData]);

  // 3. Cumplimiento por Contratista (uses monthFilteredData)
  const contractorData = useMemo(() => {
    const contractors: Record<string, { total: number, completed: number }> = {};
    
    monthFilteredData.forEach(c => {
      const cntRaw = (c.contractor || "").trim().toUpperCase();
      const contractor = cntRaw && cntRaw !== "GENERAL" ? cntRaw : "SIN CONTRATISTA";
      if (!contractors[contractor]) contractors[contractor] = { total: 0, completed: 0 };
      contractors[contractor].total++;
      
      const est = (c.estado || "").toUpperCase().trim();
      if (est === 'COMPLETADO' || est === 'CERRADO' || est === 'REALIZADO' || est === 'OK') {
        contractors[contractor].completed++;
      }
    });

    return Object.entries(contractors).map(([name, data]) => ({
      name,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      total: data.total,
      completed: data.completed
    })).sort((a,b) => b.total - a.total).slice(0, 10);
  }, [monthFilteredData]);

  // Global KPIs calculation based on current filters
  const kpiStats = useMemo(() => {
    const total = monthFilteredData.length;
    const completed = monthFilteredData.filter(c => {
        const est = (c.estado || "").toUpperCase().trim();
        return est === 'COMPLETADO' || est === 'CERRADO' || est === 'REALIZADO' || est === 'OK';
    }).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [monthFilteredData]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-xl font-black text-white">{payload[0].value}%</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
              {payload[0].payload.completed} de {payload[0].payload.total} Calibraciones
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80 text-indigo-100">Cumplimiento {selectedMonth === 'TODOS' ? 'Anual' : 'Mensual'}</p>
          <h3 className="text-5xl font-black mb-4">
            {kpiStats.percentage}%
          </h3>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
             <div 
               className="h-full bg-white rounded-full transition-all duration-1000" 
               style={{ width: `${kpiStats.percentage}%` }}
             />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ejecutados</p>
                  <p className="text-2xl font-black text-slate-800">{kpiStats.completed}</p>
               </div>
             </div>
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total realizados en {selectedMonth === 'TODOS' ? selectedYear : selectedMonth}</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertCircle size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
                  <p className="text-2xl font-black text-slate-800">
                    {kpiStats.total - kpiStats.completed}
                  </p>
               </div>
             </div>
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Planificados: {kpiStats.total}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cumplimiento Mes a Mes */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]">
                <LayoutGrid size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cumplimiento Mes a Mes</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Evolución anual de calibraciones</p>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={24}>
                  <LabelList 
                    dataKey="percentage" 
                    position="top" 
                    formatter={(v: number) => v > 0 ? `${v}%` : ''} 
                    style={{ fontSize: 10, fontWeight: 900 }}
                  />
                  {monthlyData.map((entry, index) => {
                    const isSelected = selectedMonth !== 'TODOS' && entry.name === selectedMonth.substring(0,3);
                    const color = entry.percentage >= 90 ? '#10b981' : '#ef4444';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={color}
                        fillOpacity={selectedMonth === 'TODOS' || isSelected ? 1 : 0.3}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumplimiento por CD */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cumplimiento por CD</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rendimiento por centro de distribución</p>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={cdData} margin={{ top: 0, right: 60, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  domain={[0, 100]}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={20}>
                  <LabelList 
                    dataKey="percentage" 
                    position="right" 
                    formatter={(v: number) => `${v}%`} 
                    style={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                    offset={10}
                  />
                  {cdData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumplimiento por Contratista */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.5rem]">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cumplimiento por Contratista</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rendimiento por empresa proveedora</p>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contractorData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={40}>
                  <LabelList 
                    dataKey="percentage" 
                    position="top" 
                    formatter={(v: number) => `${v}%`} 
                    style={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                  />
                  {contractorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalibrationVisuals;
