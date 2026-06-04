import React, { useState, useMemo } from 'react';
import { CheckList } from '../types';
import { Search, Filter, Calendar, Truck, User, ClipboardList, Clock, Building2, Hash, ChevronLeft, ChevronRight, TrendingUp, Award, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid } from 'lucide-react';
import { normalizePlate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList, LineChart, Line
} from 'recharts';

interface CheckListModuleProps {
  checkLists: CheckList[];
}

const CheckListModule: React.FC<CheckListModuleProps> = ({ checkLists }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'ARENOSA' | 'GALAPA'>('ARENOSA');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedContractor, setSelectedContractor] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'salida' | 'retorno' | 'fecha' | null, direction: 'asc' | 'desc' }>({ key: 'fecha', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter checkLists by tab
  const tabFilteredCheckLists = useMemo(() => {
    return checkLists.filter(c => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'ARENOSA') return c.source === 'ARENOSA';
      if (activeTab === 'GALAPA') return c.source === 'GALAPA';
      return true;
    });
  }, [checkLists, activeTab]);

  const contractors = useMemo(() => {
    const unique = new Set(tabFilteredCheckLists.map(c => c.contratista).filter(Boolean));
    return Array.from(unique).sort();
  }, [tabFilteredCheckLists]);

  const filteredData = useMemo(() => {
    // Cache dates and normalized values for performance
    const startObj = startDate ? new Date(startDate) : null;
    if (startObj) startObj.setHours(0, 0, 0, 0);
    const endObj = endDate ? new Date(endDate) : null;
    if (endObj) endObj.setHours(0, 0, 0, 0);
    const searchLower = searchTerm.toLowerCase();

    return tabFilteredCheckLists.filter(item => {
      const matchesSearch = searchTerm === '' || 
        normalizePlate(item.vehiculo).includes(normalizePlate(searchTerm)) ||
        item.conductor.toLowerCase().includes(searchLower) ||
        item.contratista.toLowerCase().includes(searchLower) ||
        item.empresa.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
      if (selectedContractor && item.contratista !== selectedContractor) return false;

      if (startObj || endObj) {
        if (!item.fecha) return false;
        const itemDate = new Date(item.fecha);
        itemDate.setHours(0, 0, 0, 0);

        if (startObj && itemDate < startObj) return false;
        if (endObj && itemDate > endObj) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortConfig.key) {
        let valA: any = a[sortConfig.key as keyof CheckList];
        let valB: any = b[sortConfig.key as keyof CheckList];

        if (sortConfig.key === 'salida' || sortConfig.key === 'retorno') {
          valA = parseInt(valA?.replace('%', '') || '0');
          valB = parseInt(valB?.replace('%', '') || '0');
        } else if (sortConfig.key === 'fecha') {
          valA = a.fecha || '';
          valB = b.fecha || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
      
      return (b.fecha || '').localeCompare(a.fecha || '');
    });
  }, [tabFilteredCheckLists, searchTerm, startDate, endDate, selectedContractor, sortConfig]);

  const handleSort = (key: 'salida' | 'retorno' | 'fecha') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: 'salida' | 'retorno' | 'fecha' }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const stats = useMemo(() => {
    let total = 0;
    let salidas100 = 0;
    let retornos100 = 0;
    const driverCounts: Record<string, number> = {};
    const weeklyGeneral: Record<string, { total: number, salida100: number, retorno100: number }> = {};
    const monthlyGeneral: Record<string, { total: number, salida100: number, retorno100: number }> = {};

    // Single pass for all stats
    for (let i = 0; i < filteredData.length; i++) {
      const d = filteredData[i];
      total++;
      if (d.salida === '100%') salidas100++;
      if (d.retorno === '100%') retornos100++;

      // Drivers
      if (d.conductor && d.conductor !== 'sin datos' && d.conductor !== '#N/A') {
        driverCounts[d.conductor] = (driverCounts[d.conductor] || 0) + 1;
      }

      // Weekly
      const week = d.semana ? `S${d.semana}` : 'N/A';
      if (!weeklyGeneral[week]) weeklyGeneral[week] = { total: 0, salida100: 0, retorno100: 0 };
      weeklyGeneral[week].total++;
      if (d.salida === '100%') weeklyGeneral[week].salida100++;
      if (d.retorno === '100%') weeklyGeneral[week].retorno100++;

      // Monthly
      let month = 'N/A';
      if (d.fecha && typeof d.fecha === 'string' && d.fecha.includes('-')) {
        // Optimization: Use string splitting for simple YYYY-MM-DD
        const parts = d.fecha.split('-');
        const monthIndex = parts.length > 1 ? parseInt(parts[1]) - 1 : -1;
        if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
          const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
          month = months[monthIndex];
        }
      }
      if (!monthlyGeneral[month]) monthlyGeneral[month] = { total: 0, salida100: 0, retorno100: 0 };
      monthlyGeneral[month].total++;
      if (d.salida === '100%') monthlyGeneral[month].salida100++;
      if (d.retorno === '100%') monthlyGeneral[month].retorno100++;
    }
    
    const topDrivers = Object.entries(driverCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const weeklyGeneralChartData = Object.entries(weeklyGeneral).map(([week, vals]) => ({
      name: week,
      Salida: Math.round((vals.salida100 / vals.total) * 100),
      Retorno: Math.round((vals.retorno100 / vals.total) * 100)
    })).sort((a, b) => {
      if (a.name === 'N/A') return 1;
      if (b.name === 'N/A') return -1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    const monthlyGeneralChartData = Object.entries(monthlyGeneral).map(([month, vals]) => ({
      name: month,
      Salida: Math.round((vals.salida100 / vals.total) * 100),
      Retorno: Math.round((vals.retorno100 / vals.total) * 100)
    }));

    const aroData = {
      salida: total > 0 ? Math.round((salidas100 / total) * 100) : 0,
      retorno: total > 0 ? Math.round((retornos100 / total) * 100) : 0
    };

    return { total, salidas100, retornos100, topDrivers, weeklyGeneralChartData, monthlyGeneralChartData, aroData };
  }, [filteredData]);

  const DonutChart = ({ value, label, color = "#10b981" }: { value: number, label: string, color?: string }) => {
    const data = [
      { name: 'Cumplió', value: value },
      { name: 'Le faltó', value: 100 - value }
    ];
    return (
      <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full shadow-inner">
        <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">{label}</p>
        <div className="relative w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                startAngle={90}
                endAngle={450}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="#f1f5f9" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-slate-900" style={{ color: color }}>{value}%</span>
          </div>
        </div>
      </div>
    );
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header & Search */}
      <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <ClipboardList className="text-indigo-600" size={28} />
              Check List de Vehículos
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Registro histórico de inspecciones y novedades
            </p>
          </div>

          {/* TAB SELECTOR */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => {
                setActiveTab('ARENOSA');
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'ARENOSA' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-500 hover:bg-white hover:text-indigo-600'
              }`}
            >
              <Building2 size={14} />
              LA ARENOSA
            </button>
            <button
              onClick={() => {
                setActiveTab('GALAPA');
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'GALAPA' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-500 hover:bg-white hover:text-indigo-600'
              }`}
            >
              <Building2 size={14} />
              GALAPA
            </button>
            <button
              onClick={() => {
                setActiveTab('ALL');
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'ALL' 
                ? 'bg-slate-800 text-white shadow-xl' 
                : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} />
              VISTA GENERAL
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Contractor Filter */}
              <div className="relative flex-grow lg:w-48">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-10 pr-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold uppercase tracking-tight transition-all outline-none shadow-inner appearance-none cursor-pointer"
                  value={selectedContractor}
                  onChange={(e) => {
                    setSelectedContractor(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">TODOS LOS CONTRATISTAS</option>
                  {contractors.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex-grow lg:w-40">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  className="w-full pl-10 pr-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-medium transition-all outline-none shadow-inner"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <span className="text-slate-400 font-bold text-xs uppercase">A</span>
              <div className="relative flex-grow lg:w-40">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  className="w-full pl-10 pr-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-medium transition-all outline-none shadow-inner"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              {(startDate || endDate || selectedContractor) && (
                <button 
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedContractor('');
                    setCurrentPage(1);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Limpiar filtros"
                >
                  <Filter size={18} />
                </button>
              )}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por placa, conductor o contratista..."
                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-medium transition-all outline-none shadow-inner"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 shrink-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Viajes</p>
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Truck size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Salidas</p>
              <p className="text-2xl font-black text-slate-800">{stats.salidas100}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <User size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Retornos</p>
              <p className="text-2xl font-black text-slate-800">{stats.retornos100}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 mb-6">
          {/* Weekly General Compliance */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                Cumplimiento Semanal General
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyGeneralChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    unit="%"
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px'}} />
                  <Bar dataKey="Salida" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20}>
                    <LabelList dataKey="Salida" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6366f1' }} formatter={(v: number) => `${v}%`} />
                  </Bar>
                  <Bar dataKey="Retorno" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20}>
                    <LabelList dataKey="Retorno" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} formatter={(v: number) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ARO Charts */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Award size={18} className="text-indigo-600" />
              ADH - Cumplimiento General (ARO)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DonutChart value={stats.aroData.salida} label="ADH SALIDA %" color="#6366f1" />
              <DonutChart value={stats.aroData.retorno} label="ADH RETORNO %" color="#10b981" />
            </div>
          </div>

          {/* Top Performer (Most Active) */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Award size={18} className="text-emerald-600" />
              Top Conductores (Más Activos)
            </h3>
            <div className="space-y-4">
              {stats.topDrivers.map((driver, idx) => (
                <div key={driver.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                      idx === 0 ? 'bg-amber-100 text-amber-600' : 
                      idx === 1 ? 'bg-slate-200 text-slate-600' : 
                      idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{driver.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checklists realizados</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-indigo-600">{driver.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly General Compliance */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Calendar size={18} className="text-indigo-600" />
              Cumplimiento Mensual General (Salida vs Retorno)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyGeneralChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    unit="%"
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px'}} />
                  <Bar dataKey="Salida" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="Salida" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6366f1' }} formatter={(v: number) => `${v}%`} />
                  </Bar>
                  <Bar dataKey="Retorno" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="Retorno" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} formatter={(v: number) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Main Table Section */}
        <div className="px-6 mb-10">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-[#005f73] px-6 py-4">
              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <ClipboardList size={20} />
                Registro de Check List
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#005f73] border-t border-white/10">
                    <th 
                      className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest cursor-pointer hover:bg-[#0a9396] transition-colors"
                      onClick={() => handleSort('fecha')}
                    >
                      <div className="flex items-center gap-2">
                        FECHA <SortIcon column="fecha" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">PLACA</th>
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">CONTRATISTA</th>
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">CONDUCTOR</th>
                    <th 
                      className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-center cursor-pointer hover:bg-[#0a9396] transition-colors"
                      onClick={() => handleSort('salida')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        SALIDA <SortIcon column="salida" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-center cursor-pointer hover:bg-[#0a9396] transition-colors"
                      onClick={() => handleSort('retorno')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        RETORNO <SortIcon column="retorno" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{item.fecha}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-800">{item.vehiculo}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{item.contratista}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 uppercase">{item.conductor}</td>
                      <td className={`px-6 py-4 text-xs font-black text-center ${
                        item.salida === '100%' ? 'bg-[#52b788] text-slate-900' : 
                        item.salida === '0%' ? 'bg-[#e57373] text-slate-900' : 'text-slate-600'
                      }`}>
                        {item.salida}
                      </td>
                      <td className={`px-6 py-4 text-xs font-black text-center ${
                        item.retorno === '100%' ? 'bg-[#52b788] text-slate-900' : 
                        item.retorno === '0%' ? 'bg-[#e57373] text-slate-900' : 'text-slate-600'
                      }`}>
                        {item.retorno}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for Main Table */}
            {totalPages > 1 && (
              <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {currentPage} - {totalPages} de {filteredData.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronRight size={20}/></button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Novedades Table Section */}
        <div className="px-6 mb-10">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-[#005f73] px-6 py-4">
              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <AlertCircle size={20} />
                Tabla de Novedades
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#005f73] border-t border-white/10">
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">FECHA</th>
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">PLACA</th>
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">Contratista1</th>
                    <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">NOVEDADES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData
                    .filter(item => item.novedades && item.novedades.toLowerCase() !== 'ninguna' && item.novedades.trim() !== '')
                    .slice(0, 20) // Show last 20 news
                    .map((item) => (
                    <tr key={`nov-${item.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{item.fecha}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-800 whitespace-nowrap">{item.vehiculo}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{item.contratista}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 italic">{item.novedades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckListModule;
