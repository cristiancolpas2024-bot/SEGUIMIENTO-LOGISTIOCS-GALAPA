import React, { useState, useMemo } from 'react';
import { UnavailabilityRecord } from '../types';
import { 
  Search, Filter, AlertTriangle, Calendar, MapPin, Building2, 
  Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, History,
  ChevronDown, ChevronUp, Store, Plus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import UnavailabilityForm from './UnavailabilityForm';

interface UnavailabilityModuleProps {
  data: UnavailabilityRecord[];
  onRefresh?: () => void;
}

const UnavailabilityModule: React.FC<UnavailabilityModuleProps> = ({ data, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('TODOS');
  const [selectedCD, setSelectedCD] = useState('TODOS');
  const [selectedCriticidad, setSelectedCriticidad] = useState('TODOS');
  const [selectedSistema, setSelectedSistema] = useState('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UnavailabilityRecord; direction: 'asc' | 'desc' } | null>(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<string | null>(null);

  const cds = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.cd).filter(Boolean))).sort()], [data]);
  const estados = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.estado).filter(Boolean))).sort()], [data]);
  const criticidades = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.criticidad).filter(Boolean))).sort()], [data]);
  const sistemas = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.sistema).filter(Boolean))).sort()], [data]);

  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      const matchesSearch = item.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.novedad.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = selectedEstado === 'TODOS' || item.estado === selectedEstado;
      const matchesCD = selectedCD === 'TODOS' || item.cd === selectedCD;
      const matchesCriticidad = selectedCriticidad === 'TODOS' || item.criticidad === selectedCriticidad;
      const matchesSistema = selectedSistema === 'TODOS' || item.sistema === selectedSistema;
      
      const itemDate = new Date(item.fecha);
      const matchesStartDate = !startDate || itemDate >= new Date(startDate);
      const matchesEndDate = !endDate || itemDate <= new Date(endDate);

      return matchesSearch && matchesEstado && matchesCD && matchesCriticidad && matchesSistema && matchesStartDate && matchesEndDate;
    });

    if (sortConfig) {
      const { key, direction } = sortConfig;
      filtered.sort((a, b) => {
        const aValue = a[key] ?? '';
        const bValue = b[key] ?? '';
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by date descending
      filtered.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }

    return filtered;
  }, [data, searchTerm, selectedEstado, selectedCD, selectedCriticidad, selectedSistema, startDate, endDate, sortConfig]);

  const stats = useMemo(() => {
    const active = filteredData.filter(d => d.estado?.toUpperCase() === 'ACTIVO').length;
    const avgDays = filteredData.length > 0 
      ? Math.round(filteredData.reduce((acc, curr) => acc + (curr.diasTaller || 0), 0) / filteredData.length) 
      : 0;
    
    const byCrit: Record<string, number> = {};
    const bySys: Record<string, number> = {};
    
    filteredData.forEach(d => {
      if (d.criticidad) byCrit[d.criticidad] = (byCrit[d.criticidad] || 0) + 1;
      if (d.sistema) bySys[d.sistema] = (bySys[d.sistema] || 0) + 1;
    });

    const critData = Object.entries(byCrit).map(([name, value]) => ({ name, value }));
    const sysData = Object.entries(bySys).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    return { active, avgDays, critData, sysData };
  }, [filteredData]);

  const handleSort = (key: keyof UnavailabilityRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getCriticidadColor = (crit: string) => {
    const c = crit?.toString().toUpperCase();
    if (c === '1' || c === 'CRITICO' || c === 'CRÍTICO') return 'text-rose-600 bg-rose-50 border-rose-100';
    if (c === '2' || c === 'MEDIO') return 'text-amber-600 bg-amber-50 border-amber-100';
    if (c === '3' || c === 'BAJA') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (c === '0' || c === 'NULO') return 'text-slate-400 bg-slate-50 border-slate-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  const getCriticidadLabel = (crit: string) => {
    const c = crit?.toString().trim();
    if (c === '1') return '1 CRÍTICO';
    if (c === '2') return '2 MEDIO';
    if (c === '3') return '3 BAJA';
    if (c === '0') return '0 NULO';
    
    // Fallback for existing string data in sheet
    const upper = c?.toUpperCase();
    if (upper === 'CRITICO' || upper === 'CRÍTICO') return '1 CRÍTICO';
    if (upper === 'MEDIO') return '2 MEDIO';
    if (upper === 'BAJA') return '3 BAJA';
    if (upper === 'NULO') return '0 NULO';
    
    return c || 'N/A';
  };

  const getEstadoColor = (estado: string) => {
    const e = estado?.toUpperCase();
    if (e === 'ACTIVO') return 'text-rose-600 bg-rose-50 border-rose-100';
    if (e === 'CERRADO') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  const vehicleHistory = useMemo(() => {
    if (!selectedVehicleHistory) return [];
    return data.filter(d => d.placa === selectedVehicleHistory)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [data, selectedVehicleHistory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header & Dashboard */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4">
              <AlertTriangle className="text-rose-600" size={32} />
              Gestión de Indisponibilidad
            </h2>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              Seguimiento de flota fuera de servicio
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-rose-50 px-6 py-4 rounded-3xl border border-rose-100 text-center min-w-[140px]">
              <span className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Activos</span>
              <span className="text-3xl font-black text-rose-600 tracking-tighter">{stats.active}</span>
            </div>
            <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 text-center min-w-[140px]">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prom. Días</span>
              <span className="text-3xl font-black text-slate-600 tracking-tighter">{stats.avgDays}</span>
            </div>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 px-8 py-4 rounded-3xl text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"
            >
              <Plus size={20} />
              Nuevo Reporte
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-12">
            <UnavailabilityForm 
              onCancel={() => setShowForm(false)}
              onSuccess={() => {
                setShowForm(false);
                onRefresh?.();
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} /> Criticidad del Impacto
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.critData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={40}>
                    {stats.critData.map((entry, index) => {
                      const c = entry.name.toUpperCase();
                      let color = '#94a3b8'; // Default slate for Nulo/Other
                      if (c === '1' || c === 'CRITICO' || c === 'CRÍTICO') color = '#e11d48';
                      if (c === '2' || c === 'MEDIO') color = '#d97706';
                      if (c === '3' || c === 'BAJA') color = '#059669';
                      return <Cell key={index} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History size={14} /> Top Sistemas Afectados
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sysData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '16px' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por placa o novedad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <select 
            value={selectedEstado} 
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {estados.map(e => <option key={e} value={e}>{e === 'TODOS' ? 'ESTADO: TODOS' : e}</option>)}
          </select>

          <select 
            value={selectedCD} 
            onChange={(e) => setSelectedCD(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {cds.map(cd => <option key={cd} value={cd}>{cd === 'TODOS' ? 'CD: TODOS' : cd}</option>)}
          </select>

          <select 
            value={selectedCriticidad} 
            onChange={(e) => setSelectedCriticidad(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {criticidades.map(c => <option key={c} value={c}>{c === 'TODOS' ? 'CRITICIDAD: TODOS' : c}</option>)}
          </select>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0" title="Fecha Inicial" />
            <span className="text-slate-300">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0" title="Fecha Final" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('fecha')}>
                  <div className="flex items-center gap-2">Fecha {sortConfig?.key === 'fecha' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                </th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('placa')}>
                  <div className="flex items-center gap-2">Placa {sortConfig?.key === 'placa' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                </th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">CD / Contratista</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Novedad</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('criticidad')}>
                  <div className="flex items-center gap-2">Criticidad {sortConfig?.key === 'criticidad' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                </th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Taller / Ingreso</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors text-right" onClick={() => handleSort('diasTaller')}>
                  <div className="flex items-center gap-2 justify-end">Días {sortConfig?.key === 'diasTaller' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-700 tracking-tighter">{item.fecha}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">SEM {item.semana}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <button 
                      onClick={() => setSelectedVehicleHistory(item.placa)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-black tracking-widest border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                    >
                      {item.placa}
                    </button>
                    <div className={`mt-2 block w-fit items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getEstadoColor(item.estado)}`}>
                      {item.estado}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-600">
                        <MapPin size={12} className="text-slate-400" /> {item.cd}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        <Building2 size={12} className="text-slate-400" /> {item.contratista}
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="max-w-[200px]">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">
                        {item.sistema}
                      </span>
                      <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed" title={item.novedad}>
                        {item.novedad}
                      </p>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCriticidadColor(item.criticidad)}`}>
                      <AlertCircle size={10} />
                      {getCriticidadLabel(item.criticidad)}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-700 uppercase tracking-tight">
                        <Store size={12} className="text-slate-400" /> {item.taller}
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ingreso</span>
                            <span className="text-[10px] font-bold text-slate-600">{item.fechaIngreso || '--'}</span>
                         </div>
                         {item.fechaSalida && (
                           <div className="flex flex-col border-l border-slate-100 pl-3">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Salida</span>
                              <span className="text-[10px] font-bold text-emerald-600">{item.fechaSalida}</span>
                           </div>
                         )}
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`text-xl font-black tracking-tighter ${item.diasTaller > 10 ? 'text-rose-600' : item.diasTaller > 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {item.diasTaller}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Días</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle History Modal */}
      {selectedVehicleHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-800">
                  {selectedVehicleHistory}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Historial de Indisponibilidad</h3>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Total Ciclos: {vehicleHistory.length}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVehicleHistory(null)}
                className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <XCircle size={32} />
              </button>
            </div>

            <div className="p-8 h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                {vehicleHistory.map((h, i) => (
                  <div key={i} className="relative pl-10 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100 last:before:hidden">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${h.estado?.toUpperCase() === 'ACTIVO' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{h.sistema}</span>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">{h.novedad}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-700 tracking-tighter">{h.diasTaller} Días</span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.fecha}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getEstadoColor(h.estado)}`}>{h.estado}</span>
                        </div>
                        <div>
                           <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Criticidad</span>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCriticidadColor(h.criticidad)}`}>{getCriticidadLabel(h.criticidad)}</span>
                        </div>
                        <div>
                           <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Taller</span>
                           <span className="text-xs font-bold text-slate-600">{h.taller}</span>
                        </div>
                        <div className="text-right">
                           <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ciclo Taller</span>
                           <span className="text-xs font-bold text-slate-600">{h.fechaIngreso} / {h.fechaSalida || 'ACTIVO'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Tiempo Total en Taller</span>
                <span className="text-xl font-black text-indigo-600 tracking-tighter">
                  {vehicleHistory.reduce((acc, curr) => acc + (curr.diasTaller || 0), 0)} Días
                </span>
              </div>
              <button 
                onClick={() => setSelectedVehicleHistory(null)}
                className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-3"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnavailabilityModule;
