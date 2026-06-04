import React, { useMemo, useState } from 'react';
import { AvailabilityRecord, FleetListRecord } from '../types';
import { 
  Activity, 
  Truck, 
  Wrench, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

interface AvailabilityDashboardProps {
  availability: AvailabilityRecord[];
  fleetBase: FleetListRecord[];
}

const AvailabilityModule: React.FC<AvailabilityDashboardProps> = ({ availability, fleetBase }) => {
  const [filterCd, setFilterCd] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');
  const [systemView, setSystemView] = useState<'all' | 'GALAPA' | 'ARENOSA'>('all');
  
  // Default to current month or range of data
  const initialRange = useMemo(() => {
    if (availability.length === 0) return { start: '2026-01-01', end: new Date().toISOString().split('T')[0] };
    const dates = availability.map(r => r.fecha).filter(d => d && d >= '2026-01-01').sort();
    return { 
      start: dates[0] || '2026-01-01', 
      end: dates[dates.length - 1] || new Date().toISOString().split('T')[0] 
    };
  }, [availability]);

  const [dateRange, setDateRange] = useState(initialRange);

  const processedData = useMemo(() => {
    // 1. Filter Availability Records by CD, Contractor, and DATE RANGE
    let filtered = availability.filter(r => {
      if (!r.fecha) return false;
      const isWithinDate = r.fecha >= dateRange.start && r.fecha <= dateRange.end;
      const matchCd = filterCd === 'all' || 
                      (r.cdRegistro && r.cdRegistro.toUpperCase().includes(filterCd.toUpperCase())) ||
                      (r.cdOriginal && r.cdOriginal.toUpperCase().includes(filterCd.toUpperCase()));
      const matchContractor = filterContractor === 'all' || 
                              (r.contratista && r.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
      return isWithinDate && matchCd && matchContractor;
    });

    // 2. Discover Fleet Bases for the priority CDs
    // We try to find the 'totalVH' reported in the sheet for these CDs
    const getReportedBase = (cdKey: string) => {
      const records = availability.filter(r => 
        (r.cdRegistro?.toUpperCase().includes(cdKey) || r.cdOriginal?.toUpperCase().includes(cdKey)) &&
        (filterContractor === 'all' || r.contratista?.toUpperCase().includes(filterContractor.toUpperCase()))
      );
      // Take the most frequent totalVH or the max
      const bases = records.map(r => r.totalVH).filter(v => v > 0);
      if (bases.length > 0) {
        // Return most common value (mode)
        const counts: any = {};
        bases.forEach(b => counts[b] = (counts[b] || 0) + 1);
        return parseFloat(Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0][0]);
      }
      
      // Fallback to fleetBase sheet
      return fleetBase.filter(v => 
        v.cd?.toUpperCase().includes(cdKey) &&
        (filterContractor === 'all' || v.contratista?.toUpperCase().includes(filterContractor.toUpperCase()))
      ).length || (cdKey === 'GALAPA' ? 122 : 105);
    };

    const baseGalapa = getReportedBase('GALAPA');
    const baseArenosa = getReportedBase('ARENOSA');
    
    const parseDate = (dStr: string) => {
      if (!dStr || typeof dStr !== 'string') return new Date(0);
      return new Date(dStr);
    };

    // Sort by date for tendencies
    const sortedByDate = [...filtered].sort((a, b) => a.fecha.localeCompare(b.fecha));

    // --- KPI CALCULATION (Latest Day in Filtered Set) ---
    const latestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].fecha : null;
    const latestRecords = filtered.filter(r => r.fecha === latestDate);
    
    const uGT = new Set(latestRecords.filter(r => 
      (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) &&
      r.vehiculoIndisponible === 1
    ).map(r => r.placasKey)).size;
    
    const uAT = new Set(latestRecords.filter(r => 
      (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) &&
      r.vehiculoIndisponible === 1
    ).map(r => r.placasKey)).size;
    
    const dispoGalapaToday = ((baseGalapa - uGT) / baseGalapa) * 100;
    const dispoArenosaToday = ((baseArenosa - uAT) / baseArenosa) * 100;
    const indispTotalToday = uGT + uAT;

    // Highest frequency system in range
    const rangeSystemMap: Record<string, number> = {};
    filtered.forEach(r => {
      if (r.sistema) rangeSystemMap[r.sistema] = (rangeSystemMap[r.sistema] || 0) + 1;
    });
    const topSystemRange = Object.entries(rangeSystemMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // --- CHARTS DATA ---
    // Generate ALL dates in the selected range
    const allDates: string[] = [];
    const dateStart = new Date(dateRange.start);
    const dateEnd = new Date(dateRange.end);
    const curr = new Date(dateStart);
    while(curr <= dateEnd) {
      allDates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // A. Daily Tendency
    const dailyTendency = allDates.map(dateStr => {
      const dayRecs = filtered.filter(r => r.fecha === dateStr);
      const uG = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      const uA = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      
      return {
        name: dateStr,
        galapa: Math.round(((baseGalapa - uG) / baseGalapa) * 1000) / 10,
        arenosa: Math.round(((baseArenosa - uA) / baseArenosa) * 1000) / 10
      };
    }).slice(-60); // Show last 60 days for better perspective

    // B. Weekly Availability
    const getWeekNumber = (d: Date) => {
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const weeklyMap: Record<string, { galapa: number, arenosa: number, label: string, sumG: number, sumA: number, count: number }> = {};
    allDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const w = getWeekNumber(d);
      const y = d.getFullYear();
      const key = `${y}-W${w}`;
      
      if (!weeklyMap[key]) {
        const start = new Date(d);
        start.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const label = `Sem ${w}`;
        weeklyMap[key] = { label, galapa: 0, arenosa: 0, sumG: 0, sumA: 0, count: 0 };
      }

      const dayRecs = filtered.filter(r => r.fecha === dateStr);
      const uG = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      const uA = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      
      weeklyMap[key].sumG += ((baseGalapa - uG) / baseGalapa) * 100;
      weeklyMap[key].sumA += ((baseArenosa - uA) / baseArenosa) * 100;
      weeklyMap[key].count += 1;
    });

    const weeklyChart = Object.values(weeklyMap).map(w => ({
      name: w.label,
      galapa: Math.round((w.sumG / w.count) * 10) / 10,
      arenosa: Math.round((w.sumA / w.count) * 10) / 10
    })).slice(-12); // Show last 12 weeks

    // C. Monthly Availability
    const monthlyMap: Record<string, { galapa: number, arenosa: number, sumG: number, sumA: number, count: number, monthRecs: any[] }> = {};
    allDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
      
      if (!monthlyMap[label]) {
        monthlyMap[label] = { galapa: 0, arenosa: 0, sumG: 0, sumA: 0, count: 0, monthRecs: [] };
      }

      const dayRecs = filtered.filter(r => r.fecha === dateStr);
      const uG = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      const uA = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      
      monthlyMap[label].sumG += ((baseGalapa - uG) / baseGalapa) * 100;
      monthlyMap[label].sumA += ((baseArenosa - uA) / baseArenosa) * 100;
      monthlyMap[label].count += 1;
      monthlyMap[label].monthRecs.push(...dayRecs);
    });

    const calcAvgTaller = (recs: any[]) => {
      if (recs.length === 0) return 0;
      const uniqueEvents = new Set(recs.map(r => `${r.placa}-${r.fechaIngreso}`)).size;
      const sum = recs.reduce((acc, row) => {
        if (!row.fechaIngreso || !row.fecha) return acc;
        const fR = new Date(row.fecha).getTime();
        const fI = new Date(row.fechaIngreso).getTime();
        return acc + Math.max(0, (fR - fI) / (1000 * 60 * 60 * 24));
      }, 0);
      return Math.round((sum / (uniqueEvents || 1)) * 10) / 10;
    };

    const monthlyChart = Object.entries(monthlyMap).map(([name, data]) => {
      return {
        name,
        galapa: Math.round((data.sumG / data.count) * 10) / 10,
        arenosa: Math.round((data.sumA / data.count) * 10) / 10,
        sumDaysG: calcAvgTaller(data.monthRecs.filter(row => row.cdRegistro?.toUpperCase().includes('GALAPA') || row.cdOriginal?.toUpperCase().includes('GALAPA'))),
        sumDaysA: calcAvgTaller(data.monthRecs.filter(row => row.cdRegistro?.toUpperCase().includes('ARENOSA') || row.cdOriginal?.toUpperCase().includes('ARENOSA'))),
        baseG: baseGalapa,
        baseA: baseArenosa
      };
    });

    // D. Top Fallas
    const systemFilter = systemView === 'all' ? filtered : filtered.filter(r => r.cdRegistro?.toUpperCase().includes(systemView.toUpperCase()));
    const systemCounts: Record<string, number> = {};
    systemFilter.forEach(r => {
      systemCounts[r.sistema] = (systemCounts[r.sistema] || 0) + 1;
    });
    const topFailures = Object.entries(systemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // E. Workshop Participation
    const workshopCounts: Record<string, number> = {};
    filtered.forEach(r => {
      const w = r.taller || 'SIN ESPECIFICAR';
      workshopCounts[w] = (workshopCounts[w] || 0) + 1;
    });
    const workshopDistribution = Object.entries(workshopCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }));

    // F. Top 10 Critical Vehicles
    const criticalMap: Record<string, { cd: string, dist: string, novedades: number, dias: number, systems: Record<string, number> }> = {};
    filtered.forEach(r => {
      const plate = r.placasKey || 'N/A';
      if (!criticalMap[plate]) {
        const baseInfo = fleetBase.find(v => v.placa === plate);
        criticalMap[plate] = {
          cd: r.cdRegistro || 'N/A',
          dist: baseInfo?.distribuidor || 'N/A',
          novedades: 0,
          dias: 0,
          systems: {}
        };
      }
      criticalMap[plate].novedades += 1;
      criticalMap[plate].dias += (r.diasIndisponible || 0);
      criticalMap[plate].systems[r.sistema] = (criticalMap[plate].systems[r.sistema] || 0) + 1;
    });

    const criticalVehicles = Object.entries(criticalMap)
      .sort((a, b) => b[1].dias - a[1].dias)
      .slice(0, 10)
      .map(([plate, data]) => ({
        plate,
        cd: data.cd,
        dist: data.dist,
        novedades: data.novedades,
        dias: data.dias,
        topSystem: Object.entries(data.systems).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      }));

    return {
      kpis: { 
        dispoGalapaToday, 
        dispoArenosaToday, 
        indispTotalToday, 
        topSystemMonth: topSystemRange 
      },
      dailyTendency,
      weeklyChart,
      monthlyChart,
      topFailures,
      workshopDistribution,
      monthlySummary: [...monthlyChart].reverse().map(m => ({
        name: m.name,
        galapaDispo: m.galapa,
        arenosaDispo: m.arenosa,
        galapaAvgDays: m.sumDaysG,
        arenosaAvgDays: m.sumDaysA,
        baseG: m.baseG,
        baseA: m.baseA
      })),
      criticalVehicles,
      dateRange: {
        min: sortedByDate[0]?.fecha || 'N/A',
        max: sortedByDate[sortedByDate.length - 1]?.fecha || 'N/A'
      }
    };
  }, [availability, fleetBase, filterCd, filterContractor, systemView]);

  const contractors = useMemo(() => {
    const fromBase = fleetBase.map(v => v.contratista).filter(Boolean);
    const fromAvail = availability.map(v => v.contratista).filter(Boolean);
    return Array.from(new Set([...fromBase, ...fromAvail])).sort();
  }, [fleetBase, availability]);

  const getEfficiencyColor = (val: number) => {
    if (val < 70) return 'text-rose-500';
    if (val < 85) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const COLORS = ['#3B82F6', '#F97316', '#10B981', '#A855F7', '#F43F5E', '#EC4899', '#6366F1'];

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] p-4 md:p-8 font-sans animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-2xl shadow-indigo-600/30">
              <Activity size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Dashboard Disponibilidad</h1>
              <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-2">
                Periodo: {processedData.dateRange.min} → {processedData.dateRange.max}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
           <div className="bg-[#1E293B] p-2 rounded-2xl border border-slate-700/50 flex items-center gap-4 shadow-xl">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-700/50">
                <Calendar size={16} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">INICIO</span>
              </div>
              <input 
                type="date"
                className="bg-transparent text-sm font-black uppercase outline-none cursor-pointer"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
           </div>

           <div className="bg-[#1E293B] p-2 rounded-2xl border border-slate-700/50 flex items-center gap-4 shadow-xl">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-700/50">
                <Calendar size={16} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FIN</span>
              </div>
              <input 
                type="date"
                className="bg-transparent text-sm font-black uppercase outline-none cursor-pointer"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
           </div>

           <div className="bg-[#1E293B] p-2 rounded-2xl border border-slate-700/50 flex items-center gap-4 shadow-xl">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-700/50">
                <Filter size={16} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CD</span>
              </div>
              <select 
                className="bg-transparent text-sm font-black uppercase outline-none pr-6 cursor-pointer"
                value={filterCd}
                onChange={e => setFilterCd(e.target.value)}
              >
                <option value="all" className="bg-[#1E293B]">AMBOS CD</option>
                <option value="GALAPA" className="bg-[#1E293B]">GALAPA</option>
                <option value="ARENOSA" className="bg-[#1E293B]">LA ARENOSA</option>
              </select>
           </div>

           <div className="bg-[#1E293B] p-2 rounded-2xl border border-slate-700/50 flex items-center gap-4 shadow-xl">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-700/50">
                <Truck size={16} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CONTRATISTA</span>
              </div>
              <select 
                className="bg-transparent text-sm font-black uppercase outline-none pr-6 cursor-pointer max-w-[200px]"
                value={filterContractor}
                onChange={e => setFilterContractor(e.target.value)}
              >
                <option value="all" className="bg-[#1E293B]">TODOS</option>
                {contractors.map(c => (
                  <option key={c} value={c} className="bg-[#1E293B]">{c.toUpperCase()}</option>
                ))}
              </select>
           </div>
           
           <div className="bg-[#1E293B] px-8 py-4 rounded-2xl border border-slate-700/50 shadow-2xl">
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-indigo-400 uppercase mb-1">GENERADO EL</span>
               <span className="text-sm font-black">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</span>
             </div>
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative group">
          <div className="relative z-10 space-y-4">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div> DISPO GALAPA
            </div>
            <h2 className={`text-5xl font-black ${getEfficiencyColor(processedData.kpis.dispoGalapaToday)}`}>
              {Math.round(processedData.kpis.dispoGalapaToday)}%
            </h2>
          </div>
        </div>
        <div className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative group">
          <div className="relative z-10 space-y-4">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div> DISPO ARENOSA
            </div>
            <h2 className={`text-5xl font-black ${getEfficiencyColor(processedData.kpis.dispoArenosaToday)}`}>
              {Math.round(processedData.kpis.dispoArenosaToday)}%
            </h2>
          </div>
        </div>
        <div className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative group">
          <div className="relative z-10 space-y-4">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div> INDISPONIBLES HOY
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black text-rose-500">{processedData.kpis.indispTotalToday}</h2>
              <span className="text-xs font-black text-slate-500 uppercase">VH</span>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative group">
          <div className="relative z-10 space-y-4">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div> SISTEMA CRÍTICO (MES)
            </div>
            <h2 className="text-2xl font-black text-amber-500 uppercase break-words leading-tight">{processedData.kpis.topSystemMonth}</h2>
          </div>
        </div>
      </div>

      {/* Daily Tendency */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <div className="xl:col-span-2 bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 border-b border-slate-700/50 pb-6">
            <div>
              <h3 className="text-lg font-black uppercase flex items-center gap-3">
                <TrendingUp size={20} className="text-indigo-400" /> Tendencia Diaria
              </h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase mt-1">META 85%</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div><span className="text-[10px] font-black text-slate-400 uppercase">GALAPA</span></div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F97316]"></div><span className="text-[10px] font-black text-slate-400 uppercase">ARENOSA</span></div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData.dailyTendency} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => v ? v.split('-').slice(1).join('/') : ''}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px', fontSize: '10px', fontWeight: 900 }} />
                <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="10 10" />
                <Line type="monotone" dataKey="galapa" stroke="#3B82F6" strokeWidth={5} dot={false} />
                <Line type="monotone" dataKey="arenosa" stroke="#F97316" strokeWidth={5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Failures */}
        <div className="bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between mb-10 border-b border-slate-700/50 pb-6">
            <h3 className="text-lg font-black uppercase flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400" /> Top 8 Fallas
            </h3>
            <div className="flex gap-1 bg-[#0F172A] p-1 rounded-xl">
              {(['all', 'GALAPA', 'ARENOSA'] as const).map(v => (
                <button key={v} onClick={() => setSystemView(v)} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${systemView === v ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{v === 'all' ? 'MIX' : v}</button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={processedData.topFailures} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#F1F5F9', fontSize: 9, fontWeight: 900 }} width={90}/>
                <XAxis type="number" hide />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                <Bar dataKey="count" fill="#F97316" radius={[0, 6, 6, 0]} barSize={15}>
                  {processedData.topFailures.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly & Monthly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-700/50">
            <BarChart3 size={20} className="text-indigo-400" /> Disponibilidad Semanal
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.weeklyChart} margin={{ top: 20, right: 10, left: -25, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 8, fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                  <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="5 5" />
                  <Bar dataKey="galapa" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="arenosa" fill="#F97316" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-700/50">
            <Calendar size={20} className="text-purple-400" /> Disponibilidad Mensual
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.monthlyChart} margin={{ top: 20, right: 10, left: -25, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 900 }} tickFormatter={v => v ? v.split(' ')[0] : ''} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                  <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="5 5" />
                  <Bar dataKey="galapa" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={35} />
                  <Bar dataKey="arenosa" fill="#F97316" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl overflow-x-auto">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-700/50">Resumen Mensual</h3>
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-slate-700 uppercase">
                <th className="p-4">MES</th>
                <th className="p-4">CD</th>
                <th className="p-4">FLOTA</th>
                <th className="p-4">% DISPO</th>
                <th className="p-4">AVG TALLER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {processedData.monthlySummary.map((row, i) => (
                <React.Fragment key={i}>
                  <tr>
                    <td rowSpan={2} className="p-4 font-black border-r border-slate-800">{row.name}</td>
                    <td className="p-4 font-black text-blue-400">GALAPA</td>
                    <td className="p-4">{row.baseG}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full font-black ${row.galapaDispo >= 85 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{row.galapaDispo}%</span></td>
                    <td className="p-4">{row.galapaAvgDays} d</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-black text-orange-400">ARENOSA</td>
                    <td className="p-4">{row.baseA}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full font-black ${row.arenosaDispo >= 85 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{row.arenosaDispo}%</span></td>
                    <td className="p-4">{row.arenosaAvgDays} d</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl overflow-x-auto">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-700/50">Top 10 Críticos</h3>
          <table className="w-full text-left text-[9px] uppercase">
             <thead>
               <tr className="border-b border-slate-700">
                 <th className="pb-4 pr-4">PLACA</th>
                 <th className="pb-4 px-4">CD</th>
                 <th className="pb-4 px-4">DISTRIBUIDOR</th>
                 <th className="pb-4 px-4">DÍAS</th>
                 <th className="pb-4 pl-4 text-right">SISTEMA TOP</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
                {processedData.criticalVehicles.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-all">
                    <td className="py-4 pr-4 font-black font-mono">{v.plate}</td>
                    <td className="py-4 px-4 font-black text-slate-500">{v.cd}</td>
                    <td className="py-4 px-4 font-black text-slate-400">{v.dist}</td>
                    <td className="py-4 px-4 font-black text-rose-500">{v.dias}</td>
                    <td className="py-4 pl-4 font-black text-indigo-400 text-right italic">{v.topSystem}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 text-center pb-20">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Fuente: DISPONIBILIDAD.xlsx | Sistema v4.0</p>
      </div>
    </div>
  );
};

export default AvailabilityModule;


