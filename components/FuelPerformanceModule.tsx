import React, { useState, useMemo } from 'react';
import { FuelPerformance } from '../types';
import { Search, Filter, Calendar, Truck, User, Fuel, TrendingUp, Award, Building2, ChevronLeft, ChevronRight, Gauge, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { normalizePlate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList, LineChart, Line, ComposedChart, ReferenceLine,
  Scatter
} from 'recharts';

interface FuelPerformanceModuleProps {
  fuelData: FuelPerformance[];
}

const TARGETS: Record<string, Record<string, number>> = {
  'LA ARENOSA': {
    'ENERO': 10.57, 'FEBRERO': 10.57, 'MARZO': 10.42, 'ABRIL': 10.42,
    'MAYO': 10.37, 'JUNIO': 10.37, 'JULIO': 12.18, 'AGOSTO': 10.36,
    'SEPTIEMBRE': 10.28, 'OCTUBRE': 10.21, 'NOVIEMBRE': 10.27, 'DICIEMBRE': 10.27
  },
  'GALAPA': {
    'ENERO': 10.57, 'FEBRERO': 10.57, 'MARZO': 10.42, 'ABRIL': 10.42,
    'MAYO': 10.37, 'JUNIO': 10.37, 'JULIO': 12.18, 'AGOSTO': 10.36,
    'SEPTIEMBRE': 10.28, 'OCTUBRE': 10.21, 'NOVIEMBRE': 10.27, 'DICIEMBRE': 10.27
  },
  'GALPAA': {
    'ENERO': 10.57, 'FEBRERO': 10.57, 'MARZO': 10.42, 'ABRIL': 10.42,
    'MAYO': 10.37, 'JUNIO': 10.37, 'JULIO': 12.18, 'AGOSTO': 10.36,
    'SEPTIEMBRE': 10.28, 'OCTUBRE': 10.21, 'NOVIEMBRE': 10.27, 'DICIEMBRE': 10.27
  }
};

const getTarget = (cd: string, month: string): number => {
  const cdKey = cd.toUpperCase();
  const monthKey = month.toUpperCase();
  return TARGETS[cdKey]?.[monthKey] || 10.27; // Default target
};

const FuelPerformanceModule: React.FC<FuelPerformanceModuleProps> = ({ fuelData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedContractor, setSelectedContractor] = useState('');
  const [selectedCd, setSelectedCd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedContractor('');
    setSelectedCd('');
    setSelectedMonth('');
    setSelectedWeek('');
    setCurrentPage(1);
  };

  const contractors = useMemo(() => {
    const unique = new Set(fuelData.map(c => c.contractor).filter(Boolean));
    return Array.from(unique).sort();
  }, [fuelData]);

  const cds = useMemo(() => {
    const unique = new Set(fuelData.map(c => c.cd).filter(Boolean));
    return Array.from(unique).sort();
  }, [fuelData]);

  const filteredData = useMemo(() => {
    return fuelData.filter(item => {
      const matchesSearch = normalizePlate(item.plate).includes(normalizePlate(searchTerm)) ||
        item.contractor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cd.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedContractor && item.contractor !== selectedContractor) return false;
      if (selectedCd && item.cd !== selectedCd) return false;
      if (selectedMonth && item.month !== selectedMonth) return false;
      if (selectedWeek && item.week !== selectedWeek) return false;

      return true;
    }).map(item => {
      const target = getTarget(item.cd, item.month);
      return {
        ...item,
        targetKmpg: target,
        compliance: target > 0 ? (item.kmpg / target) * 100 : 0
      };
    });
  }, [fuelData, searchTerm, selectedContractor, selectedCd]);

  const stats = useMemo(() => {
    const totalMileage = filteredData.reduce((acc, curr) => acc + curr.mileage, 0);
    const totalGallons = filteredData.reduce((acc, curr) => acc + curr.gallons, 0);
    const totalSpeeding = filteredData.reduce((acc, curr) => acc + curr.speeding, 0);
    const totalIdling = filteredData.reduce((acc, curr) => acc + curr.idlingCount, 0);
    const avgKmpg = totalGallons > 0 ? totalMileage / totalGallons : 0;
    
    // Monthly KMPG
    const monthlyKmpg: Record<string, { mileage: number, gallons: number }> = {};
    filteredData.forEach(d => {
      const month = d.month || 'N/A';
      if (!monthlyKmpg[month]) monthlyKmpg[month] = { mileage: 0, gallons: 0 };
      monthlyKmpg[month].mileage += d.mileage;
      monthlyKmpg[month].gallons += d.gallons;
    });

    const monthlyChartData = Object.entries(monthlyKmpg).map(([month, vals]) => ({
      name: month,
      KMPG: vals.gallons > 0 ? parseFloat((vals.mileage / vals.gallons).toFixed(2)) : 0
    }));

    // Compliance stats
    const avgCompliance = filteredData.length > 0 
      ? filteredData.reduce((acc, curr) => acc + curr.compliance, 0) / filteredData.length 
      : 0;

    // Weekly KMPG by CD
    const weeklyCdKmpg: Record<string, Record<string, { mileage: number, gallons: number }>> = {};
    filteredData.forEach(d => {
      const week = d.week || 'N/A';
      const cd = d.cd || 'N/A';
      if (!weeklyCdKmpg[week]) weeklyCdKmpg[week] = {};
      if (!weeklyCdKmpg[week][cd]) weeklyCdKmpg[week][cd] = { mileage: 0, gallons: 0 };
      weeklyCdKmpg[week][cd].mileage += d.mileage;
      weeklyCdKmpg[week][cd].gallons += d.gallons;
    });

    const weeklyCdChartData = Object.entries(weeklyCdKmpg).map(([week, cds]) => {
      const entry: any = { name: week };
      let totalTarget = 0;
      let count = 0;
      Object.entries(cds).forEach(([cd, vals]) => {
        entry[cd] = vals.gallons > 0 ? parseFloat((vals.mileage / vals.gallons).toFixed(2)) : 0;
        const sample = filteredData.find(d => d.week === week && d.cd === cd);
        if (sample) {
          totalTarget += sample.targetKmpg;
          count++;
        }
      });
      entry.meta = count > 0 ? totalTarget / count : 10.27;
      return entry;
    }).sort((a, b) => {
      const numA = parseInt((a.name as string).replace(/\D/g, '')) || 0;
      const numB = parseInt((b.name as string).replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    // Monthly KMPG by CD
    const monthlyCdKmpg: Record<string, Record<string, { mileage: number, gallons: number }>> = {};
    filteredData.forEach(d => {
      const month = d.month || 'N/A';
      const cd = d.cd || 'N/A';
      if (!monthlyCdKmpg[month]) monthlyCdKmpg[month] = {};
      if (!monthlyCdKmpg[month][cd]) monthlyCdKmpg[month][cd] = { mileage: 0, gallons: 0 };
      monthlyCdKmpg[month][cd].mileage += d.mileage;
      monthlyCdKmpg[month][cd].gallons += d.gallons;
    });

    const MONTH_ORDER = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

    const monthlyCdChartData = Object.entries(monthlyCdKmpg).map(([month, cds]) => {
      const entry: any = { name: month };
      let totalTarget = 0;
      let count = 0;
      Object.entries(cds).forEach(([cd, vals]) => {
        entry[cd] = vals.gallons > 0 ? parseFloat((vals.mileage / vals.gallons).toFixed(2)) : 0;
        const sample = filteredData.find(d => d.month === month && d.cd === cd);
        if (sample) {
          totalTarget += sample.targetKmpg;
          count++;
        }
      });
      entry.meta = count > 0 ? parseFloat((totalTarget / count).toFixed(2)) : 10.27;
      return entry;
    }).sort((a, b) => {
      return MONTH_ORDER.indexOf(a.name.toUpperCase()) - MONTH_ORDER.indexOf(b.name.toUpperCase());
    });

    // Top Plates by Idling
    const topIdlingPlates = [...filteredData]
      .sort((a, b) => b.idlingCount - a.idlingCount)
      .slice(0, 10)
      .map(d => ({ name: d.plate, value: d.idlingCount }));

    // Top Plates by Mileage
    const topMileagePlates = [...filteredData]
      .sort((a, b) => b.mileage - a.mileage)
      .slice(0, 10)
      .map(d => ({ name: d.plate, value: d.mileage }));

    // Performance by Contractor per CD
    const contractorCdKmpg: Record<string, Record<string, { mileage: number, gallons: number }>> = {};
    filteredData.forEach(d => {
      const contractor = d.contractor || 'N/A';
      const cd = d.cd || 'N/A';
      if (!contractorCdKmpg[contractor]) contractorCdKmpg[contractor] = {};
      if (!contractorCdKmpg[contractor][cd]) contractorCdKmpg[contractor][cd] = { mileage: 0, gallons: 0 };
      contractorCdKmpg[contractor][cd].mileage += d.mileage;
      contractorCdKmpg[contractor][cd].gallons += d.gallons;
    });

    const contractorChartData = Object.entries(contractorCdKmpg).map(([name, cdsData]) => {
      const entry: any = { name };
      let totalMileage = 0;
      let totalGallons = 0;
      let totalTarget = 0;
      let count = 0;
      
      Object.entries(cdsData).forEach(([cd, vals]) => {
        entry[cd] = vals.gallons > 0 ? parseFloat((vals.mileage / vals.gallons).toFixed(2)) : 0;
        totalMileage += vals.mileage;
        totalGallons += vals.gallons;
        
        const samples = filteredData.filter(d => d.contractor === name && d.cd === cd);
        if (samples.length > 0) {
          const avgTarget = samples.reduce((acc, s) => acc + s.targetKmpg, 0) / samples.length;
          totalTarget += avgTarget;
          count++;
        }
      });
      
      entry.KMPG = totalGallons > 0 ? parseFloat((totalMileage / totalGallons).toFixed(2)) : 0;
      entry.meta = count > 0 ? parseFloat((totalTarget / count).toFixed(2)) : 10.27;
      return entry;
    }).sort((a, b) => b.KMPG - a.KMPG);

    return { 
      totalMileage, totalGallons, totalSpeeding, totalIdling, avgKmpg, 
      monthlyChartData, avgCompliance, weeklyCdChartData, monthlyCdChartData,
      topIdlingPlates, topMileagePlates, contractorChartData
    };
  }, [filteredData]);

  const matrixData = useMemo(() => {
    const plates = Array.from(new Set(filteredData.map(d => d.plate))).sort();
    const weeks = Array.from(new Set(filteredData.map(d => d.week))).sort((a, b) => {
      const numA = parseInt((a as string).replace(/\D/g, '')) || 0;
      const numB = parseInt((b as string).replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    const rows = plates.map(plate => {
      const plateRows = filteredData.filter(d => d.plate === plate);
      const weekData: Record<string, { kmpg: number, target: number }> = {};
      
      plateRows.forEach(d => {
        weekData[d.week] = { kmpg: d.kmpg, target: d.targetKmpg };
      });

      return { plate, weekData };
    });

    return { weeks, rows };
  }, [filteredData]);

  const totalPages = Math.ceil(matrixData.rows.length / itemsPerPage);
  const paginatedRows = matrixData.rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const RenderTarget = (props: any) => {
    const { cx, cy } = props;
    if (!cy) return null;
    return (
      <line 
        x1={cx - 25} 
        y1={cy} 
        x2={cx + 25} 
        y2={cy} 
        stroke="#ef4444" 
        strokeWidth={4} 
        strokeDasharray="none"
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <Fuel className="text-orange-600" size={28} />
              Rendimiento de Combustible
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Seguimiento de consumo y eficiencia por unidad
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
            {(selectedCd || selectedContractor || searchTerm || selectedMonth || selectedWeek) && (
              <button 
                onClick={clearFilters}
                className="px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2"
              >
                <AlertTriangle size={14} />
                Limpiar Filtros
              </button>
            )}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-grow lg:w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-10 pr-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold uppercase tracking-tight transition-all outline-none shadow-inner appearance-none cursor-pointer"
                  value={selectedCd}
                  onChange={(e) => {
                    setSelectedCd(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">TODOS LOS CD</option>
                  {cds.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

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
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por placa o contratista..."
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

      <div className="flex-grow overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">KM Totales</p>
              <p className="text-xl font-black text-slate-800">{stats.totalMileage.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Fuel size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Galones Totales</p>
              <p className="text-xl font-black text-slate-800">{stats.totalGallons.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Gauge size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Promedio KM/GAL</p>
              <p className="text-xl font-black text-slate-800">{stats.avgKmpg.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Excesos Velocidad</p>
              <p className="text-xl font-black text-slate-800">{stats.totalSpeeding.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Ralentí {'>'} 5 min</p>
              <p className="text-xl font-black text-slate-800">{stats.totalIdling.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Building2 size={18} className="text-indigo-600" />
              Rendimiento por Contratista (KM/GAL)
            </h3>
            <div className="h-72 overflow-x-auto">
              <div style={{ minWidth: stats.contractorChartData.length > 5 ? `${stats.contractorChartData.length * 150}px` : '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={stats.contractorChartData}
                    onClick={(data) => {
                      if (data && data.activeLabel) {
                        setSelectedContractor(data.activeLabel);
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend />
                    {cds.map((cd, index) => (
                      <Bar key={cd} dataKey={cd} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey={cd} position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }} />
                      </Bar>
                    ))}
                    <Scatter dataKey="meta" shape={<RenderTarget />} name="Meta" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-indigo-600" />
              Rendimiento Semanal por CD (KM/GAL)
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: stats.weeklyCdChartData.length > 8 ? `${stats.weeklyCdChartData.length * 80}px` : '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={stats.weeklyCdChartData}
                    onClick={(data) => {
                      if (data && data.activeLabel) {
                        setSelectedWeek(data.activeLabel);
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend />
                    {cds.map((cd, index) => (
                      <Bar key={cd} dataKey={cd} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey={cd} position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }} />
                      </Bar>
                    ))}
                    <Scatter 
                      dataKey="meta" 
                      shape={<RenderTarget />} 
                      name="Meta"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-emerald-600" />
              Rendimiento Mensual por CD (KM/GAL)
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: stats.monthlyCdChartData.length > 6 ? `${stats.monthlyCdChartData.length * 120}px` : '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={stats.monthlyCdChartData}
                    onClick={(data) => {
                      if (data && data.activeLabel) {
                        setSelectedMonth(data.activeLabel);
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend />
                    {cds.map((cd, index) => (
                      <Bar key={cd} dataKey={cd} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey={cd} position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }} />
                      </Bar>
                    ))}
                    <Scatter 
                      dataKey="meta" 
                      shape={<RenderTarget />} 
                      name="Meta"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 text-rose-600">
              <AlertTriangle size={18} />
              Top 10 Placas con más Ralentí
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: '400px', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topIdlingPlates} layout="vertical" margin={{ left: 30, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} width={80} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f43f5e' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 text-blue-600">
              <TrendingUp size={18} />
              Top 10 Placas con más KM Recorridos
            </h3>
            <div className="h-64 overflow-x-auto">
              <div style={{ minWidth: '400px', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topMileagePlates} layout="vertical" margin={{ left: 30, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} width={80} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} formatter={(v: number) => v.toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-[#005f73] px-6 py-4">
            <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Fuel size={20} />
              Matriz de Rendimiento Semanal (KM/GAL)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#005f73] border-t border-white/10">
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest sticky left-0 bg-[#005f73] z-20">PLACA</th>
                  {matrixData.weeks.map(week => (
                    <th key={week} className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-center min-w-[120px]">
                      Semana {week}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.plate} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100">
                      {row.plate}
                    </td>
                    {matrixData.weeks.map(week => {
                      const data = row.weekData[week];
                      if (!data) return <td key={week} className="px-6 py-4 text-center text-slate-300">-</td>;
                      
                      const isAdhered = data.kmpg >= data.target;
                      return (
                        <td 
                          key={week} 
                          className={`px-6 py-4 text-xs font-black text-center transition-all ${
                            isAdhered ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {data.kmpg.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronRight size={20}/></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FuelPerformanceModule;
