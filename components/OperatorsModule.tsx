import React, { useState, useMemo } from 'react';
import { OperatorRecord } from '../types';
import { 
  Users, CreditCard, Award, Stethoscope, 
  MapPin, Building2, UserCircle, ShieldCheck, 
  LayoutGrid, List, Search, Filter, 
  ChevronRight, Calendar, Clock, 
  ShieldAlert, AlertCircle, FileText,
  BadgeCheck, ExternalLink,
  ChevronDown, BarChart3, PieChart, LineChart as LineIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LabelList, PieChart as RePieChart, Pie, AreaChart, Area, Line
} from 'recharts';

interface OperatorsModuleProps {
  data: OperatorRecord[];
  onRefresh?: () => void;
}

type ViewType = 'grid' | 'table';
type FilterType = 'ALL' | 'LICENSE' | 'COURSE' | 'EXAM';

const OperatorsModule: React.FC<OperatorsModuleProps> = ({ data, onRefresh }) => {
  const [activeView, setActiveView] = useState<ViewType>('grid');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCD, setFilterCD] = useState('ALL');

  // Filter lists
  const cds = useMemo(() => ['ALL', ...Array.from(new Set(data.map(o => o.cd))).filter(Boolean).sort()], [data]);

  // Experience calculation helper
  const calculateExperience = (hireDate: string) => {
    if (!hireDate || hireDate === 'N/A') return '0';
    try {
      const start = new Date(hireDate);
      const now = new Date();
      if (isNaN(start.getTime())) return '0';
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30);
      if (months < 12) return `${months} Meses`;
      const years = (months / 12).toFixed(1);
      return `${years} Años`;
    } catch {
      return '0';
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           op.identification.includes(searchTerm);
      const matchesCD = filterCD === 'ALL' || op.cd === filterCD;
      
      let matchesAlert = true;
      if (activeFilter === 'LICENSE') matchesAlert = op.licenseDaysPending < 30;
      else if (activeFilter === 'COURSE') matchesAlert = op.courseDaysPending < 30;
      else if (activeFilter === 'EXAM') matchesAlert = op.examDaysPending < 30;

      return matchesSearch && matchesCD && matchesAlert;
    });
  }, [data, searchTerm, filterCD, activeFilter]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const licenseWarning = filteredData.filter(o => o.licenseDaysPending < 30).length;
    const courseWarning = filteredData.filter(o => o.courseDaysPending < 30).length;
    const examWarning = filteredData.filter(o => o.examDaysPending < 30).length;
    const allValid = filteredData.filter(o => 
      o.licenseDaysPending >= 30 && 
      o.courseDaysPending >= 30 && 
      o.examDaysPending >= 30 && 
      (!o.opmDaysPending || o.opmDaysPending >= 30)
    ).length;

    return { total, licenseWarning, courseWarning, examWarning, allValid };
  }, [filteredData]);

  const cdStats = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(op => {
      const cd = op.cd || 'SIN CD';
      counts[cd] = (counts[cd] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const alertStats = useMemo(() => {
    return [
      { name: 'VIGENTE', value: data.filter(o => o.licenseDaysPending >= 30 && o.courseDaysPending >= 30 && o.examDaysPending >= 30).length, color: '#10b981' },
      { name: 'RIESGO', value: data.filter(o => (o.licenseDaysPending < 30 && o.licenseDaysPending >= 0) || (o.courseDaysPending < 30 && o.courseDaysPending >= 0) || (o.examDaysPending < 30 && o.examDaysPending >= 0)).length, color: '#f59e0b' },
      { name: 'VENCIDO', value: data.filter(o => o.licenseDaysPending < 0 || o.courseDaysPending < 0 || o.examDaysPending < 0).length, color: '#f43f5e' },
    ].filter(s => s.value > 0);
  }, [data]);

  const weeklyProjection = useMemo(() => {
    const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    const total = data.length || 1;
    
    return weeks.map((w, i) => {
      const daysAhead = i * 7;
      const validCount = data.filter(o => 
        o.licenseDaysPending >= daysAhead && 
        o.courseDaysPending >= daysAhead && 
        o.examDaysPending >= daysAhead
      ).length;
      return { 
        name: w, 
        percentage: Math.round((validCount / total) * 100) 
      };
    });
  }, [data]);

  const getStatusInfo = (days: number) => {
    if (days < 0) return { label: 'VENCIDO', color: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-100', icon: ShieldAlert, progressColor: 'bg-rose-500' };
    if (days < 30) return { label: 'POR VENCER', color: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-100', icon: Clock, progressColor: 'bg-amber-500' };
    return { label: 'VIGENTE', color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-100', icon: BadgeCheck, progressColor: 'bg-emerald-500' };
  };

  const kpis = [
    { id: 'ALL' as const, label: 'TOTAL OPERADORES', value: stats.total, icon: Users, color: 'indigo' },
    { id: 'LICENSE' as const, label: 'VENCE LICENCIA', value: stats.licenseWarning, icon: CreditCard, color: 'amber' },
    { id: 'COURSE' as const, label: 'VENCE DEFENSIVO', value: stats.courseWarning, icon: Award, color: 'orange' },
    { id: 'EXAM' as const, label: 'VENCEN MÉDICOS', value: stats.examWarning, icon: Stethoscope, color: 'rose' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-20 space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight uppercase">
            Directorio de Operadores
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <BadgeCheck size={12} className="text-indigo-500" />
            Gestión Integral de Personal y Documentación Logística
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100">
          <button 
            onClick={() => setActiveView('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'grid' ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={14} />
            Cuadrícula
          </button>
          <button 
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'table' ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List size={14} />
            Tabla
          </button>
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.concat([{ id: 'ALL' as any, label: 'TODO VIGENTE', value: stats.allValid, icon: ShieldCheck, color: 'emerald' }]).map((kpi, index) => (
          <motion.div
            key={`${kpi.id}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => {
              if (kpi.label === 'TODO VIGENTE') {
                setActiveFilter('ALL');
                setSearchTerm('');
              } else {
                setActiveFilter(kpi.id as FilterType);
              }
            }}
            className={`relative p-6 rounded-[2rem] border transition-all cursor-pointer group overflow-hidden ${
              activeFilter === kpi.id && kpi.label !== 'TODO VIGENTE'
                ? 'bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] border-transparent shadow-xl shadow-purple-500/20 ring-4 ring-purple-500/10' 
                : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
            }`}
          >
            {activeFilter === kpi.id && kpi.label !== 'TODO VIGENTE' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            )}
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-all duration-500 ${
                activeFilter === kpi.id && kpi.label !== 'TODO VIGENTE'
                  ? 'bg-white/20 text-white' 
                  : `bg-${kpi.color}-50 text-${kpi.color}-500 group-hover:scale-110`
              }`}>
                <kpi.icon size={20} />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 leading-tight ${
                activeFilter === kpi.id && kpi.label !== 'TODO VIGENTE' ? 'text-purple-100/70' : 'text-slate-400'
              }`}>
                {kpi.label}
              </span>
              <span className={`text-3xl font-black tracking-tighter ${
                activeFilter === kpi.id && kpi.label !== 'TODO VIGENTE' ? 'text-white' : 'text-slate-800'
              }`}>
                {kpi.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                <BarChart3 size={18} className="text-purple-500" />
                Operadores por CD
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Distribución demográfica</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cdStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} onClick={(data) => setFilterCD(data.name)}>
                  {cdStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#7C3AED' : '#3B82F6'} fillOpacity={0.8} className="cursor-pointer" />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                <PieChart size={18} className="text-blue-500" />
                Vigencia Global
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cumplimiento de flota</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={alertStats}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: '10px', fontWeight: '900', fill: '#64748b' }}
                  >
                    {alertStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full mt-4">
               {alertStats.map((s, i) => (
                 <div key={i} className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: s.color }} />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">{s.name}</span>
                    <span className="text-sm font-black text-slate-800 tracking-tighter mt-1">{s.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                <LineIcon size={18} className="text-emerald-500" />
                Cumplimiento Semanal (%)
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Proyección de vigencia 4 semanas</p>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProjection} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(val: number) => [`${val}%`, 'Cumplimiento']}
                />
                <Area 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPct)" 
                >
                  <LabelList 
                    dataKey="percentage" 
                    position="top" 
                    offset={10} 
                    content={(props: any) => {
                      const { x, y, value } = props;
                      return (
                        <text x={x} y={y - 10} fill="#059669" fontSize={10} fontWeight={900} textAnchor="middle">
                          {value}%
                        </text>
                      );
                    }}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-grow min-w-[250px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o identificación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-bold placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 min-w-[180px]">
             <MapPin size={16} className="text-slate-400" />
             <select 
               value={filterCD} 
               onChange={(e) => setFilterCD(e.target.value)}
               className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer w-full"
             >
               {cds.map(cd => <option key={cd} value={cd}>{cd === 'ALL' ? 'CENTRO DISTRIBUCIÓN' : cd}</option>)}
             </select>
          </div>
          
          {searchTerm || filterCD !== 'ALL' || activeFilter !== 'ALL' ? (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterCD('ALL');
                setActiveFilter('ALL');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              LIMPIAR
            </button>
          ) : null}
        </div>
      </div>

      {/* CONTENT VIEW */}
      <div className="space-y-12">
        {activeView === 'grid' ? (
          <div className="space-y-10">
            {filteredData.length === 0 ? (
              <NoResults onRefresh={onRefresh} />
            ) : (
              filteredData.map((op, index) => (
                <OperatorCard key={op.id} op={op} calculateExperience={calculateExperience} getStatusInfo={getStatusInfo} setFilterCD={setFilterCD} />
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operador</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">CD / Cargo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Licencia</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">M. Defensivo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">E. Médicos</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cert. OPM</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredData.map(op => (
                     <tr key={op.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                             {op.photoUrl ? (
                               <img src={op.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             ) : <UserCircle size={20} className="text-slate-400" />}
                           </div>
                           <div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{op.name}</p>
                             <p className="text-[10px] font-bold text-slate-400">{op.identification}</p>
                           </div>
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{op.cd}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{op.position}</p>
                       </td>
                       <td className="px-8 py-6">
                         <StatusBadge days={op.licenseDaysPending} expiry={op.licenseExpiry} />
                       </td>
                       <td className="px-8 py-6">
                         <StatusBadge days={op.courseDaysPending} expiry={op.courseExpiry} />
                       </td>
                       <td className="px-8 py-6">
                         <StatusBadge days={op.examDaysPending} expiry={op.examExpiry} />
                       </td>
                       <td className="px-8 py-6">
                         <StatusBadge days={op.opmDaysPending} expiry={op.opmExpiry} />
                       </td>
                       <td className="px-8 py-6 text-right">
                         <button 
                           onClick={() => {
                             setActiveView('grid');
                             setSearchTerm(op.identification);
                           }}
                           className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all border border-transparent hover:border-purple-100"
                         >
                           <ChevronRight size={18} />
                         </button>
                       </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ days: number; expiry: string }> = ({ days, expiry }) => {
  const isVencido = days < 0;
  const isWarning = days < 30;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border w-fit ${
      isVencido ? 'bg-rose-50 border-rose-100 text-rose-500' :
      isWarning ? 'bg-amber-50 border-amber-100 text-amber-500' :
      'bg-emerald-50 border-emerald-100 text-emerald-500'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        isVencido ? 'bg-rose-500' :
        isWarning ? 'bg-amber-500' :
        'bg-emerald-500'
      }`} />
      <span className="text-[9px] font-black uppercase tracking-widest">{expiry}</span>
    </div>
  );
};

interface OperatorCardProps {
  op: OperatorRecord;
  calculateExperience: (hireDate: string) => string;
  getStatusInfo: (days: number) => any;
  setFilterCD: (cd: string) => void;
}

const OperatorCard: React.FC<OperatorCardProps> = ({ op, calculateExperience, getStatusInfo, setFilterCD }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 min-h-[450px] transition-transform hover:scale-[1.005] duration-500"
    >
      {/* LEFT PANEL: PROFILE */}
      <div className="lg:w-[320px] bg-[#0F172A] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
        
        <div className="relative mb-8 group">
          <div className="relative z-10 w-40 h-40 rounded-[2.5rem] bg-slate-800/50 border-4 border-slate-700 p-1 group-hover:scale-105 transition-transform duration-500">
            <div className="w-full h-full rounded-[2.2rem] bg-slate-700 overflow-hidden flex items-center justify-center">
              {op.photoUrl ? (
                <img 
                  src={op.photoUrl} 
                  alt={op.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle size={80} strokeWidth={1} className="text-slate-500" />
              )}
            </div>
          </div>
          {/* Active Badge */}
          <div className="absolute -bottom-2 -right-2 z-20 px-4 py-1.5 bg-emerald-500 rounded-2xl border-4 border-[#0F172A] flex items-center gap-2 shadow-lg">
             <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
             <span className="text-[9px] font-black text-white uppercase tracking-widest">Activo</span>
          </div>
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
          {op.name}
        </h2>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl mb-8">
           <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{op.identification}</span>
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left">
             <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Building2 size={16} />
             </div>
             <div>
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Empresa</span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider">{op.provider}</span>
             </div>
          </div>
          <div 
            onClick={() => setFilterCD(op.cd)}
            className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left cursor-pointer group/cd"
          >
             <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover/cd:bg-blue-400 group-hover/cd:text-white transition-all">
                <MapPin size={16} />
             </div>
             <div>
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 group-hover/cd:text-blue-300 transition-all">Ubicación</span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider group-hover/cd:text-blue-100 transition-all">{op.cd}</span>
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: INFO & DOCUMENTS */}
      <div className="flex-grow p-10 lg:p-12 space-y-12">
        {/* Laboral Info Grid */}
        <div className="space-y-8">
          <div className="flex justify-between items-center pb-6 border-b border-slate-100">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
               <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
               Información Laboral
             </h3>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ingreso: <span className="text-slate-800">{op.hireDate}</span>
             </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-y-8 gap-x-12 mb-12">
                  <div className="space-y-1 group/cd cursor-pointer" onClick={() => setFilterCD(op.cd)}>
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 group-hover/cd:text-indigo-500 transition-colors">
                      <MapPin size={10} /> Centro Dist.
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover/cd:text-indigo-600 transition-colors">{op.cd}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                       <Building2 size={10} /> Cargo
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.position}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                       <Clock size={10} /> Experiencia
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{calculateExperience(op.hireDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                       <Award size={10} /> Categoría
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.category}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                       <FileText size={10} /> Comparendos
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.fines || 'Sin deudas'}</p>
                  </div>
          </div>
        </div>

        {/* DOCUMENTS SECTION */}
        <div className="space-y-6">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             Tarjetas de Documentos
           </h3>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <DocumentCard 
               title="LICENCIA CONDUCCIÓN" 
               icon={CreditCard} 
               days={op.licenseDaysPending} 
               expiry={op.licenseExpiry} 
               url={op.licenseUrl}
               getStatusInfo={getStatusInfo}
             />
             <DocumentCard 
               title="MANEJO DEFENSIVO" 
               icon={Award} 
               days={op.courseDaysPending} 
               expiry={op.courseExpiry} 
               url={op.courseUrl}
               getStatusInfo={getStatusInfo}
             />
             <DocumentCard 
               title="EXÁMENES MÉDICOS" 
               icon={Stethoscope} 
               days={op.examDaysPending} 
               expiry={op.examExpiry} 
               url={op.examUrl}
               getStatusInfo={getStatusInfo}
             />
             <DocumentCard 
               title="CERTIFICADO OPM" 
               icon={ShieldCheck} 
               days={op.opmDaysPending} 
               expiry={op.opmExpiry} 
               url={op.opmUrl}
               getStatusInfo={getStatusInfo}
             />
           </div>
        </div>
      </div>
    </motion.div>
  );
};

const InfoItem: React.FC<{ icon: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
       <Icon size={12} className="text-indigo-400" />
       {label}
    </div>
    <div className="text-sm font-black text-slate-800 uppercase tracking-tight truncate" title={value}>
       {value}
    </div>
  </div>
);

interface DocumentCardProps {
  title: string;
  icon: any;
  days: number;
  expiry: string;
  url?: string;
  getStatusInfo: (days: number) => any;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, icon: Icon, days, expiry, url, getStatusInfo }) => {
  const status = getStatusInfo(days);
  const StatusIcon = status.icon;

  // Progress logic (0 to 100 based on status)
  const progress = Math.max(0, Math.min(100, (days / 60) * 100));

  return (
    <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 relative flex flex-col justify-between min-h-[220px]">
       <div className="space-y-6">
          <div className="flex justify-between items-start">
             <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-500">
                <Icon size={24} />
             </div>
             <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-current bg-opacity-10 text-[8px] font-bold tracking-widest ${status.color ? status.color : 'text-slate-400'}`}>
                <StatusIcon size={10} />
                {status.label}
             </div>
          </div>

          <div>
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</h4>
             <div className="flex items-end justify-between gap-4">
                <div className="text-lg font-black text-slate-800 tracking-tighter">{expiry}</div>
                <div className={`text-[10px] font-black ${status.color}`}>{days} DIAS</div>
             </div>
          </div>
       </div>

       <div className="space-y-4 pt-4">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
               transition={{ duration: 1, ease: "easeOut" }}
               className={`h-full ${status.bg}`}
             />
          </div>

          {url ? (
            <a 
              href={url} 
              target="_blank" 
              referrerPolicy="no-referrer"
              className="group/btn flex items-center justify-center gap-2 w-full py-3 bg-slate-50 hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300"
            >
               VER DOCUMENTO
               <ExternalLink size={12} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
            </a>
          ) : (
            <button disabled className="w-full py-3 bg-slate-50 text-slate-300 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] cursor-not-allowed">
               NO DISPONIBLE
            </button>
          )}
       </div>
    </div>
  );
};

const NoResults: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
     <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Users size={40} className="text-slate-200" />
     </div>
     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">Sin resultados</h3>
     <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">
       No hemos encontrado operadores con los filtros actuales. Intenta ajustar tu búsqueda.
     </p>
     {onRefresh && (
       <button 
         onClick={onRefresh}
         className="mt-8 px-8 py-3 bg-[#7C3AED] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:bg-[#6D28D9] transition-all"
       >
         Actualizar Datos
       </button>
     )}
  </div>
);

export default OperatorsModule;
