import React, { useState, useMemo } from 'react';
import { PlateAdherence } from '../types';
import { Search, CheckCircle2, XCircle, BarChart3, PieChart, LayoutGrid, ListFilter, ChevronLeft, ChevronRight, ClipboardCheck, TrendingUp, Users, CalendarDays, Calendar } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList, ReferenceLine } from 'recharts';
import { getWeekNumber } from '../utils';

interface PlateAdherenceModuleProps {
  data: PlateAdherence[];
}

const PlateAdherenceModule: React.FC<PlateAdherenceModuleProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('TODOS');
  const [selectedDay, setSelectedDay] = useState('TODOS');

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMonth('TODOS');
    setSelectedDay('TODOS');
  };

  const filteredData = useMemo(() => {
    const monthOrder = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    
    return data.filter(item => {
      const matchesSearch = item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.driverName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (selectedMonth === 'TODOS' && selectedDay === 'TODOS') return true;

      if (!item.date) return false;
      // Use UTC to avoid timezone shifts
      const d = new Date(item.date + 'T12:00:00');
      if (isNaN(d.getTime())) return false;

      const itemMonth = monthOrder[d.getMonth()];
      const itemDay = d.getDate().toString();

      const matchesMonth = selectedMonth === 'TODOS' || itemMonth === selectedMonth;
      const matchesDay = selectedDay === 'TODOS' || itemDay === selectedDay;

      return matchesMonth && matchesDay;
    });
  }, [data, searchTerm, selectedMonth, selectedDay]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const adhered = filteredData.filter(item => item.isValid).length;
    const notAdhered = total - adhered;
    const compliance = total > 0 ? (adhered / total) * 100 : 0;

    return { total, adhered, notAdhered, compliance };
  }, [filteredData]);

  const chartData = [
    { name: 'ADHERIDOS', value: stats.adhered, color: '#10b981' },
    { name: 'NO ADHERIDOS', value: stats.notAdhered, color: '#f43f5e' }
  ];

  const dailyData = useMemo(() => {
    const days: Record<string, { total: number, adhered: number, rawDate: number }> = {};
    filteredData.forEach(item => {
      if (!item.date) return;
      const d = new Date(item.date + 'T12:00:00');
      if (isNaN(d.getTime())) return;
      
      const dayNum = d.getDate().toString().padStart(2, '0');
      const monthOrder = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      const monthName = monthOrder[d.getMonth()];
      const label = `${dayNum}-${monthName}`;
      
      if (!days[label]) {
        days[label] = { total: 0, adhered: 0, rawDate: d.getTime() };
      }
      days[label].total++;
      if (item.isValid) days[label].adhered++;
    });
    return Object.entries(days)
      .map(([name, vals]) => ({
        name,
        compliance: parseFloat(((vals.adhered / vals.total) * 100).toFixed(1)),
        rawDate: vals.rawDate
      }))
      .sort((a, b) => a.rawDate - b.rawDate)
      .slice(-15); // Last 15 days
  }, [filteredData]);

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { total: number, adhered: number }> = {};
    filteredData.forEach(item => {
      if (!item.date) return;
      const d = new Date(item.date + 'T12:00:00');
      if (isNaN(d.getTime())) return;
      const week = `Sem ${getWeekNumber(d)}`;
      if (!weeks[week]) weeks[week] = { total: 0, adhered: 0 };
      weeks[week].total++;
      if (item.isValid) weeks[week].adhered++;
    });
    return Object.entries(weeks).map(([name, vals]) => ({
      name,
      compliance: parseFloat(((vals.adhered / vals.total) * 100).toFixed(1))
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { total: number, adhered: number }> = {};
    filteredData.forEach(item => {
      if (!item.date) return;
      const d = new Date(item.date + 'T12:00:00');
      if (isNaN(d.getTime())) return;
      const monthOrder = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      const month = monthOrder[d.getMonth()];
      if (!months[month]) months[month] = { total: 0, adhered: 0 };
      months[month].total++;
      if (item.isValid) months[month].adhered++;
    });
    const monthOrder = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return Object.entries(months).map(([name, vals]) => ({
      name,
      compliance: parseFloat(((vals.adhered / vals.total) * 100).toFixed(1))
    })).sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
  }, [filteredData]);

  const driverData = useMemo(() => {
    const drivers: Record<string, { total: number, adhered: number }> = {};
    filteredData.forEach(item => {
      const name = item.driverName?.trim();
      if (!name || name.toUpperCase() === 'DESCONOCIDO' || name === '#N/A') return;
      
      if (!drivers[name]) drivers[name] = { total: 0, adhered: 0 };
      drivers[name].total++;
      if (item.isValid) drivers[name].adhered++;
    });
    return Object.entries(drivers)
      .map(([name, vals]) => ({
        name,
        compliance: parseFloat(((vals.adhered / vals.total) * 100).toFixed(1)),
        total: vals.total
      }))
      .sort((a, b) => b.compliance - a.compliance)
      .slice(0, 10); // Top 10 drivers
  }, [filteredData]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <ClipboardCheck className="text-indigo-600" size={28} />
              ADH DE PLACAS
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Control de adherencia de placas y validación
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar placa o conductor..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm font-medium transition-all outline-none shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shadow-inner">
              <div className="flex items-center gap-1 px-2">
                <ListFilter size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Filtros</span>
              </div>
              
              <select
                className="bg-white border-none text-xs font-bold py-1.5 px-3 rounded-lg outline-none shadow-sm text-slate-700"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {['TODOS', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].map(m => (
                  <option key={m} value={m}>{m === 'TODOS' ? 'MES: TODOS' : m}</option>
                ))}
              </select>

              <select
                className="bg-white border-none text-xs font-bold py-1.5 px-3 rounded-lg outline-none shadow-sm text-slate-700"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                <option value="TODOS">DÍA: TODOS</option>
                {Array.from({ length: 31 }, (_, i) => (i + 1).toString()).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {(searchTerm || selectedMonth !== 'TODOS' || selectedDay !== 'TODOS') && (
                <button
                  onClick={clearFilters}
                  className="bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors shadow-sm"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <LayoutGrid size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">PLACAS</p>
              <p className="text-xl font-black text-slate-800">{stats.total}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">ADHERIDOS</p>
              <p className="text-xl font-black text-slate-800">{stats.adhered}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">NO ADHERIDOS</p>
              <p className="text-xl font-black text-slate-800">{stats.notAdhered}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">% CUMPLIMIENTO</p>
              <p className="text-xl font-black text-slate-800">{stats.compliance.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Calendar size={18} className="text-blue-600" />
              Cumplimiento Diario (%)
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: dailyData.length > 10 ? `${dailyData.length * 50}px` : '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={dailyData}
                    onClick={(data: any) => {
                      if (data && data.activeLabel) {
                        const day = String(data.activeLabel).split('-')[0];
                        setSelectedDay(parseInt(day).toString());
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 100]} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" label={{ value: 'Meta 80%', position: 'right', fill: 'red', fontSize: 10, fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="compliance" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }}>
                      <LabelList dataKey="compliance" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <CalendarDays size={18} className="text-indigo-600" />
              Cumplimiento Semanal (%)
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: weeklyData.length > 8 ? `${weeklyData.length * 80}px` : '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 100]} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" label={{ value: 'Meta 80%', position: 'right', fill: 'red', fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="compliance" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                      <LabelList dataKey="compliance" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6366f1' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-emerald-600" />
              Cumplimiento Mensual (%)
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: monthlyData.length > 6 ? `${monthlyData.length * 100}px` : '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={monthlyData}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        setSelectedMonth(data.activePayload[0].payload.name);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 100]} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" label={{ value: 'Meta 80%', position: 'right', fill: 'red', fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="compliance" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                      <LabelList dataKey="compliance" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 w-full">
              <PieChart size={18} className="text-indigo-600" />
              Distribución de Adherencia
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Users size={18} className="text-amber-600" />
              Top 10 Conductores (%)
            </h3>
            <div className="h-[400px] overflow-x-auto">
              <div style={{ minWidth: '500px', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={driverData} 
                    layout="vertical" 
                    margin={{ left: 40, right: 40 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        setSearchTerm(data.activePayload[0].payload.name);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} width={120} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <ReferenceLine x={80} stroke="red" strokeDasharray="3 3" label={{ value: 'Meta 80%', position: 'top', fill: 'red', fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="compliance" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={25}>
                      <LabelList dataKey="compliance" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f59e0b' }} formatter={(v: number) => `${v}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlateAdherenceModule;
