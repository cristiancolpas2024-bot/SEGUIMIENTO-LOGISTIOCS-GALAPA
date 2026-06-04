import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Clock, Truck, 
  Search, Filter, Calendar, Activity, 
  ChevronDown, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronLeft,
  ShieldAlert, MoreVertical, Download, TrendingUp, LayoutGrid, Link as LinkIcon, AlertCircle, Wrench, Camera, Image as ImageIcon, X, Plus, ArrowLeftCircle, ArrowRightCircle
} from 'lucide-react';
import { ControlTowerRecord, Vehicle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getDriveDirectLink } from '../utils';

interface ControlTowerModuleProps {
  data: ControlTowerRecord[];
  vehicles: Vehicle[];
}

const COLORS = {
  CRITICAL: '#ef4444', // Red
  HIGH: '#f97316',     // Orange
  MEDIUM: '#facc15',   // Yellow
  LOW: '#22c55e',      // Green
  PRIMARY: '#3b82f6',  // Blue
  SECONDARY: '#a855f7', // Purple
  NEUTRAL: '#94a3b8'    // Slate
};

const CRITICIDAD_COLORS: Record<string, string> = {
  '1': COLORS.CRITICAL,
  '2': COLORS.HIGH,
  '3': COLORS.MEDIUM,
  '4': COLORS.LOW,
  'ALTA': COLORS.CRITICAL,
  'MEDIA': COLORS.HIGH,
  'BAJA': COLORS.LOW
};

const ControlTowerModule: React.FC<ControlTowerModuleProps> = ({ data, vehicles }) => {
  // Join data with vehicles
  const dataWithVehicles = useMemo(() => {
    return data.map(item => {
      const v = vehicles.find(vh => vh.plate === item.plate);
      return {
        ...item,
        brand: v?.brand || 'DESCONOCIDO'
      };
    });
  }, [data, vehicles]);

  // Filters
  const [filters, setFilters] = useState({
    cd: 'ALL',
    contractor: 'ALL',
    month: 'ALL',
    week: 'ALL',
    status: 'ALL',
    criticality: 'ALL',
    system: 'ALL',
    search: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedRecord, setSelectedRecord] = useState<ControlTowerRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [viewingRecord, setViewingRecord] = useState<ControlTowerRecord | null>(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'before' | 'after'>('before');

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const generateCollage = async (images: string[]): Promise<string> => {
    if (images.length === 0) return '';
    if (images.length === 1) return images[0];

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return resolve(images[0]);

      // Smarter sizing for collage
      let cols = 1;
      if (images.length === 2 || images.length === 4) cols = 2;
      else if (images.length === 3 || images.length >= 5) cols = 3;
      
      const rows = Math.ceil(images.length / cols);
      const imgWidth = 800; 
      const imgHeight = 600;
      
      canvas.width = cols * imgWidth;
      canvas.height = rows * imgHeight;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let loadedCount = 0;
      images.forEach((src, index) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const x = (index % cols) * imgWidth;
          const y = Math.floor(index / cols) * imgHeight;
          
          const padding = 8;
          const targetW = imgWidth - (padding * 2);
          const targetH = imgHeight - (padding * 2);
          
          const scale = Math.min(targetW / img.width, targetH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const offsetX = x + padding + (targetW - w) / 2;
          const offsetY = y + padding + (targetH - h) / 2;

          ctx.drawImage(img, offsetX, offsetY, w, h);
          
          loadedCount++;
          if (loadedCount === images.length) {
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === images.length) {
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        img.src = src;
      });
    });
  };

  const handleUpdateEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setIsSubmitting(true);
    try {
      const finalBefore = beforeImages.length > 0 ? await generateCollage(beforeImages) : selectedRecord.evidenceBefore;
      const finalAfter = afterImages.length > 0 ? await generateCollage(afterImages) : selectedRecord.evidenceAfter;

      const { submitControlTowerUpdateToSheet } = await import('../services/sheetService');
      const success = await submitControlTowerUpdateToSheet({
        plate: selectedRecord.plate,
        reportDate: selectedRecord.reportDate,
        novelty: selectedRecord.novelty,
        evidenceBefore: finalBefore,
        evidenceAfter: finalAfter
      });

      if (success) {
        alert('Evidencias registradas correctamente.');
        setSelectedRecord(null);
        setBeforeImages([]);
        setAfterImages([]);
      } else {
        alert('Error al registrar las evidencias.');
      }
    } catch (error) {
      console.error(error);
      alert('Error en la conexión o procesamiento de imágenes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const limit = 6;
    const selectedFiles = files.slice(0, limit);

    const promises = selectedFiles.map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      if (type === 'before') setBeforeImages(prev => [...prev, ...results].slice(0, 6));
      else setAfterImages(prev => [...prev, ...results].slice(0, 6));
    });
    
    // Reset input
    e.target.value = '';
  };

  // Filtered data
  const filteredData = useMemo(() => {
    return dataWithVehicles.filter(item => {
      const matchCd = filters.cd === 'ALL' || item.cd === filters.cd;
      const matchContractor = filters.contractor === 'ALL' || item.contractor === filters.contractor;
      const matchMonth = filters.month === 'ALL' || item.month === filters.month;
      const matchWeek = filters.week === 'ALL' || item.week === filters.week;
      const matchStatus = filters.status === 'ALL' || item.status === filters.status;
      const matchCriticality = filters.criticality === 'ALL' || item.criticality === filters.criticality;
      const matchSystem = filters.system === 'ALL' || item.system === filters.system;
      const matchSearch = !filters.search || 
        item.plate.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.novelty.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchCd && matchContractor && matchMonth && matchWeek && matchStatus && matchCriticality && matchSystem && matchSearch;
    });
  }, [dataWithVehicles, filters]);

  // Unique values for filters
  const filterOptions = useMemo(() => ({
    cds: Array.from(new Set(data.map(item => item.cd))).filter(Boolean).sort(),
    contractors: Array.from(new Set(data.map(item => item.contractor))).filter(Boolean).sort(),
    months: Array.from(new Set(data.map(item => item.month))).filter(Boolean).sort(),
    weeks: Array.from(new Set(data.map(item => item.week))).filter(Boolean).sort(),
    statuses: Array.from(new Set(data.map(item => item.status))).filter(Boolean).sort(),
    criticalities: Array.from(new Set(data.map(item => item.criticality))).filter(Boolean).sort(),
    systems: Array.from(new Set(data.map(item => item.system))).filter(Boolean).sort(),
  }), [data]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredData.length;
    const closed = filteredData.filter(item => item.status.toUpperCase() === 'CERRADO' || item.status.toUpperCase() === 'SOLUCIONADO').length;
    const open = total - closed;
    const avgClosureTime = filteredData.length > 0 
      ? filteredData.reduce((acc, curr) => acc + (curr.closureDays || 0), 0) / filteredData.length 
      : 0;
    const compliance = filteredData.filter(item => item.maintenanceCompliance?.toUpperCase() === 'CUMPLIO').length;
    const complianceRate = total > 0 ? (compliance / total) * 100 : 0;
    
    // SLAs overdue (daysToClose < 0 logic)
    const overdue = filteredData.filter(item => item.status.toUpperCase() !== 'CERRADO' && item.daysToClose < 0).length;
    const criticalPlates = Array.from(new Set(filteredData.filter(item => item.criticality === '1' || item.criticality?.toUpperCase() === 'URGENTE').map(item => item.plate))).length;

    return { total, open, closed, avgClosureTime, complianceRate, overdue, criticalPlates };
  }, [filteredData]);

  // Charts data
  const chartsData = useMemo(() => {
    // Trend by week
    const trendMap: Record<string, { week: string, total: number, closed: number }> = {};
    filteredData.forEach(item => {
      if (!trendMap[item.week]) trendMap[item.week] = { week: item.week, total: 0, closed: 0 };
      trendMap[item.week].total++;
      if (item.status.toUpperCase() === 'CERRADO' || item.status.toUpperCase() === 'SOLUCIONADO') {
        trendMap[item.week].closed++;
      }
    });
    const trend = Object.values(trendMap).sort((a, b) => Number(a.week) - Number(b.week)).map(t => ({
      ...t,
      percentage: t.total > 0 ? (t.closed / t.total) * 100 : 0
    }));

    // Criticality
    const criticalityMap: Record<string, { name: string, value: number }> = {};
    filteredData.forEach(item => {
      const crit = item.criticality || 'SIN INFO';
      if (!criticalityMap[crit]) criticalityMap[crit] = { name: crit, value: 0 };
      criticalityMap[crit].value++;
    });
    const criticality = Object.values(criticalityMap);

    // Systems
    const systemMap: Record<string, { name: string, count: number }> = {};
    filteredData.forEach(item => {
      if (!systemMap[item.system]) systemMap[item.system] = { name: item.system, count: 0 };
      systemMap[item.system].count++;
    });
    const systems = Object.values(systemMap).sort((a, b) => b.count - a.count).slice(0, 10);

    // Top Plates
    const plateMap: Record<string, { plate: string, count: number }> = {};
    filteredData.forEach(item => {
      if (!plateMap[item.plate]) plateMap[item.plate] = { plate: item.plate, count: 0 };
      plateMap[item.plate].count++;
    });
    const topPlates = Object.values(plateMap).sort((a, b) => b.count - a.count).slice(0, 10);

    // Brands
    const brandMap: Record<string, { name: string, count: number }> = {};
    filteredData.forEach(item => {
      if (!brandMap[item.brand]) brandMap[item.brand] = { name: item.brand, count: 0 };
      brandMap[item.brand].count++;
    });
    const brands = Object.values(brandMap).sort((a, b) => b.count - a.count);

    return { trend, criticality, systems, topPlates, brands };
  }, [filteredData]);

  // New Metrics from user request 
  const dashboardChartsData = useMemo(() => {
    const monthlyMap: Record<string, { month: string, total: number, conformant: number, maintenanceGoal: number, workshopResponse: number, workshopTotal: number, workshopGoal: number, closureDaysTotal: number, closureDaysCount: number }> = {};
    const statusMap: Record<string, { name: string, value: number }> = {};
    
    filteredData.forEach(item => {
      // Estado
      const stat = item.status || 'SIN ESTADO';
      const statUpper = stat.toUpperCase().trim();
      if (!statusMap[statUpper]) statusMap[statUpper] = { name: statUpper, value: 0 };
      statusMap[statUpper].value++;

      // Monthly metrics
      const m = item.month || 'S/M';
      if (!monthlyMap[m]) {
        monthlyMap[m] = { month: m, total: 0, conformant: 0, maintenanceGoal: 0, workshopResponse: 0, workshopTotal: 0, workshopGoal: 0, closureDaysTotal: 0, closureDaysCount: 0 };
      }
      
      // Robust compliance check for Column O (maintenanceCompliance)
      const compValue = item.maintenanceCompliance?.toString().toUpperCase().trim() || '';
      const isCompliant = compValue.includes('CUMPLE') || 
                         compValue.includes('CUMPLIO') || 
                         compValue === 'SI' || 
                         compValue === 'SÍ' || 
                         compValue === '1' || 
                         compValue === '100%' || 
                         compValue === 'OK';
      
      monthlyMap[m].total++;
      if (isCompliant) {
        monthlyMap[m].conformant++;
      }
      
      // Maintenance Goal from Column P (maintenanceGoal)
      if (item.maintenanceGoal > 0) {
        // If meta is provided as a fraction (e.g., 0.95), we store it as is or normalize
        // But we handle normalization in the display mapping below
        monthlyMap[m].maintenanceGoal = item.maintenanceGoal;
      }
      
      // Workshop Response from Column R (workshopResponsePercentage)
      if (typeof item.workshopResponsePercentage === 'number' && !isNaN(item.workshopResponsePercentage)) {
        monthlyMap[m].workshopResponse += item.workshopResponsePercentage;
        monthlyMap[m].workshopTotal++;
      }
      
      // Workshop Goal from Column Q (workshopGoal)
      if (item.workshopGoal > 0) {
        monthlyMap[m].workshopGoal = item.workshopGoal;
      }

      if (typeof item.closureDays === 'number' && !isNaN(item.closureDays)) {
        monthlyMap[m].closureDaysTotal += item.closureDays;
        monthlyMap[m].closureDaysCount++;
      }
    });

    const statusDistribution = Object.values(statusMap);

    const monthlyMetrics = Object.values(monthlyMap).map(m => {
      const avgResponse = m.workshopTotal > 0 ? (m.workshopResponse / m.workshopTotal) : 0;
      return {
        month: m.month,
        compliancePercent: Number((m.total > 0 ? (m.conformant / m.total) * 100 : 0).toFixed(1)),
        // meta scale: if 0.95 -> 95, if 95 -> 95
        maintenanceGoal: m.maintenanceGoal > 0 ? (m.maintenanceGoal <= 1.05 ? m.maintenanceGoal * 100 : m.maintenanceGoal) : 95, 
        // response scale: if 0.8 -> 80, if 80 -> 80
        workshopAvgResponse: Number((avgResponse <= 1.05 && avgResponse > 0 ? avgResponse * 100 : avgResponse).toFixed(1)),
        workshopGoal: m.workshopGoal > 0 ? (m.workshopGoal <= 1.05 ? m.workshopGoal * 100 : m.workshopGoal) : 80,
        avgClosureDays: Number((m.closureDaysCount > 0 ? (m.closureDaysTotal / m.closureDaysCount) : 0).toFixed(1))
      };
    }).sort((a, b) => a.month.localeCompare(b.month));

    return { monthlyMetrics, statusDistribution };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('CERRADO') || s.includes('SOLUCIONADO')) return COLORS.LOW;
    if (s.includes('PROCESO') || s.includes('PENDIENTE')) return COLORS.MEDIUM;
    return COLORS.CRITICAL;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            CIERRE DE NOVEDADES DEL CHECK LIST
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar placa o novedad..."
              className="bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 w-64 transition-all"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
        <FilterSelect 
          label="CD" 
          value={filters.cd} 
          options={filterOptions.cds} 
          onChange={(v) => setFilters(f => ({ ...f, cd: v }))} 
        />
        <FilterSelect 
          label="TRANSPORTISTA" 
          value={filters.contractor} 
          options={filterOptions.contractors} 
          onChange={(v) => setFilters(f => ({ ...f, contractor: v }))} 
        />
        <FilterSelect 
          label="MES" 
          value={filters.month} 
          options={filterOptions.months} 
          onChange={(v) => setFilters(f => ({ ...f, month: v }))} 
        />
        <FilterSelect 
          label="SEMANA" 
          value={filters.week} 
          options={filterOptions.weeks} 
          onChange={(v) => setFilters(f => ({ ...f, week: v }))} 
        />
        <FilterSelect 
          label="ESTADO" 
          value={filters.status} 
          options={filterOptions.statuses} 
          onChange={(v) => setFilters(f => ({ ...f, status: v }))} 
        />
        <FilterSelect 
          label="CRITICIDAD" 
          value={filters.criticality} 
          options={filterOptions.criticalities} 
          onChange={(v) => setFilters(f => ({ ...f, criticality: v }))} 
        />
        <FilterSelect 
          label="SISTEMA" 
          value={filters.system} 
          options={filterOptions.systems} 
          onChange={(v) => setFilters(f => ({ ...f, system: v }))} 
        />
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        <KPICard label="Total Novedades" value={kpis.total} icon={Activity} color={COLORS.PRIMARY} />
        <KPICard label="Abiertas" value={kpis.open} icon={AlertTriangle} color={COLORS.HIGH} subtext="Pendientes Gestión" />
        <KPICard label="Cerradas" value={kpis.closed} icon={CheckCircle} color={COLORS.LOW} subtext={`${((kpis.closed/kpis.total)*100 || 0).toFixed(1)}% Eficacia`} />
        <KPICard label="Prom. Cierre" value={`${kpis.avgClosureTime.toFixed(1)}`} unit="Días" icon={Clock} color={COLORS.SECONDARY} />
        <KPICard label="% Cumplimiento" value={`${kpis.complianceRate.toFixed(1)}`} unit="%" icon={Truck} color={COLORS.PRIMARY} />
        <KPICard label="SLAs Vencidos" value={kpis.overdue} icon={ShieldAlert} color={COLORS.CRITICAL} subtext="Acción Requerida" />
        <KPICard label="Placas Críticas" value={kpis.criticalPlates} icon={Truck} color={COLORS.NEUTRAL} subtext="Múltiples Fallas" />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Trend Total Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Novedades Semanales
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }}>
                  <LabelList dataKey="total" position="top" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Percentage Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            % Eficacia Cierre Semanal
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }}>
                  <LabelList dataKey="percentage" position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Criticality Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Distribución Criticidad
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartsData.criticality} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {chartsData.criticality.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CRITICIDAD_COLORS[entry.name] || COLORS.PRIMARY} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Systems Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Sistemas Afectados
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.systems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={80} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill={COLORS.SECONDARY} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Plates Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-400" />
            Top Placas Recurrentes
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.topPlates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="plate" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill={COLORS.HIGH} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Brands Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            Novedades por Marca
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.brands}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Dashboard Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Cierre de Novedades Mensual vs Meta */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Cierre de Novedades Mensual (Cumplimiento vs Meta)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dashboardChartsData.monthlyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="compliancePercent" name="% Cumplimiento" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  <LabelList dataKey="compliancePercent" position="top" formatter={(v: number) => `${v}%`} style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
                <Line type="step" dataKey="maintenanceGoal" name="Meta" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado Distribution */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            Distribución por Estado
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={dashboardChartsData.statusDistribution} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {dashboardChartsData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name.toUpperCase() === 'CERRADO' || entry.name.toUpperCase() === 'SOLUCIONADO' ? COLORS.LOW : (entry.name.toUpperCase() === 'ABIERTO' || entry.name.toUpperCase() === 'PROCESO' ? COLORS.HIGH : COLORS.MEDIUM)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Respuesta de Taller Mensual */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-400" />
            Respuesta Taller vs Meta (% Mensual)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dashboardChartsData.monthlyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="workshopAvgResponse" name="% Respuesta Taller" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  <LabelList dataKey="workshopAvgResponse" position="top" formatter={(v: number) => `${v}%`} style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
                <Line type="step" dataKey="workshopGoal" name="Meta Taller" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Días de Cierre Promedio Mensual */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Promedio de Días de Cierre (Mensual)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardChartsData.monthlyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="avgClosureDays" name="Días Promedio" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }}>
                  <LabelList dataKey="avgClosureDays" position="top" formatter={(v: number) => v.toFixed(1)} style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Data Table */}
      <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-lg">Detalle Torre de Control</h3>
          
          {/* Pagination Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-900/50 rounded-xl px-3 py-1.5 border border-slate-700/50 space-x-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-slate-700/50 rounded-md disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-300" />
              </button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages || 1}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 hover:bg-slate-700/50 rounded-md disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Info Vehículo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reporte</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistema</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Criticidad</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">SLA</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Solución</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Evidencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-400">{item.plate}</span>
                      <span className="text-xs text-slate-500">{item.cd} | {item.contractor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col max-w-xs">
                      <span className="text-sm line-clamp-1">{item.novelty}</span>
                      <span className="text-xs text-slate-500">{item.reportDate} | {item.source}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-slate-700/50 text-xs border border-slate-600">
                      {item.system}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{ 
                        backgroundColor: `${CRITICIDAD_COLORS[item.criticality] || COLORS.NEUTRAL}20`,
                        color: CRITICIDAD_COLORS[item.criticality] || COLORS.NEUTRAL,
                        border: `1px solid ${CRITICIDAD_COLORS[item.criticality] || COLORS.NEUTRAL}40`
                      }}
                    >
                      {item.criticality}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium border"
                      style={{ 
                        backgroundColor: `${getStatusColor(item.status)}15`,
                        color: getStatusColor(item.status),
                        borderColor: `${getStatusColor(item.status)}30`
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${item.daysToClose < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {item.daysToClose}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">Días</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-medium">{item.solutionDate || '--'}</span>
                      <span className="text-xs text-slate-500">{item.closureDays ? `${item.closureDays} d` : ''}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      {/* Register Button - Only show if one of them is missing */}
                      {!(item.evidenceBefore && item.evidenceAfter) && (
                        <button 
                          onClick={() => {
                            setSelectedRecord(item);
                            setBeforeImages([]);
                            setAfterImages([]);
                          }}
                          className={`p-2 rounded-xl transition-all shadow-lg border ${
                            item.evidenceBefore || item.evidenceAfter 
                              ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700' 
                              : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 border-indigo-500/30'
                          }`}
                          title={item.evidenceBefore || item.evidenceAfter ? "Completar Evidencias" : "Registrar Evidencias"}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}

                      {/* Unified View Button - Gallery Icon */}
                      {(item.evidenceBefore || item.evidenceAfter) && (
                        <button 
                          onClick={() => {
                            setViewingRecord(item);
                            setActiveEvidenceTab(item.evidenceBefore ? 'before' : 'after');
                          }}
                          className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/40 border border-emerald-500/30 transition-all shadow-lg"
                          title="Ver Galería de Evidencias"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No se encontraron registros que coincidan con los filtros.</p>
            </div>
          )}
        </div>
      </div>
      {/* Evidence Registration Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Registrar Evidencias
                </h3>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <ChevronDown className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <form onSubmit={handleUpdateEvidence} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Vehículo</span>
                    <span className="text-sm font-black text-indigo-400">{selectedRecord.plate}</span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {selectedRecord.novelty}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Evidencia Antes */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Evidencia Antes (Max 6 fotos)
                      </label>
                      <button 
                        type="button"
                        onClick={() => document.getElementById('before-input')?.click()}
                        className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <input 
                        id="before-input"
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImagePick(e, 'before')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {beforeImages.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                          <img src={getDriveDirectLink(src)} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setBeforeImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {beforeImages.length === 0 && !selectedRecord.evidenceBefore && (
                        <div className="col-span-3 py-4 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-slate-950/20">
                          <Camera className="w-6 h-6 mb-1 opacity-20" />
                          <span className="text-xs">Sin fotos seleccionadas</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedRecord.evidenceBefore && beforeImages.length === 0 && (
                      <div className="mt-2 p-2 bg-slate-950/50 rounded-lg border border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 truncate max-w-[150px]">Link actual guardado</span>
                        <a href={selectedRecord.evidenceBefore} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:underline">Ver actual</a>
                      </div>
                    )}
                  </div>

                  {/* Evidencia Después */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Evidencia Después (Max 6 fotos)
                      </label>
                      <button 
                        type="button"
                        onClick={() => document.getElementById('after-input')?.click()}
                        className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <input 
                        id="after-input"
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImagePick(e, 'after')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {afterImages.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                          <img src={getDriveDirectLink(src)} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setAfterImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {afterImages.length === 0 && !selectedRecord.evidenceAfter && (
                        <div className="col-span-3 py-4 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-slate-950/20">
                          <Camera className="w-6 h-6 mb-1 opacity-20" />
                          <span className="text-xs">Sin fotos seleccionadas</span>
                        </div>
                      )}
                    </div>

                    {selectedRecord.evidenceAfter && afterImages.length === 0 && (
                      <div className="mt-2 p-2 bg-slate-950/50 rounded-lg border border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 truncate max-w-[150px]">Link actual guardado</span>
                        <a href={selectedRecord.evidenceAfter} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:underline">Ver actual</a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Evidence Viewer */}
      <AnimatePresence>
        {viewingRecord && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                    Visualización de Evidencias
                  </h3>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Placa: {viewingRecord.plate} | {viewingRecord.novelty.substring(0, 50)}...
                  </span>
                </div>
                <button 
                  onClick={() => setViewingRecord(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
                {/* Tabs */}
                <div className="flex p-1 bg-slate-800/50 rounded-2xl border border-slate-700 max-w-sm mx-auto w-full">
                  <button 
                    onClick={() => setActiveEvidenceTab('before')}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      activeEvidenceTab === 'before' 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowLeftCircle className="w-4 h-4" />
                    Antes
                  </button>
                  <button 
                    onClick={() => setActiveEvidenceTab('after')}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      activeEvidenceTab === 'after' 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Después
                    <ArrowRightCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Image Display */}
                <div className="flex-1 bg-slate-950/40 rounded-2xl border border-slate-800/50 overflow-hidden flex items-center justify-center p-4 relative group">
                  <AnimatePresence mode="wait">
                    {activeEvidenceTab === 'before' ? (
                      <motion.div
                        key="before"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        {viewingRecord.evidenceBefore ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center justify-center -z-10">
                              <Clock className="w-8 h-8 text-slate-700 animate-spin" />
                            </div>
                            <img 
                              src={getDriveDirectLink(viewingRecord.evidenceBefore)} 
                              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl relative z-10" 
                              alt="Evidencia Antes"
                              referrerPolicy="no-referrer"
                              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                              style={{ opacity: 0, transition: 'opacity 0.3s' }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            <Camera className="w-16 h-16 mb-4 opacity-10" />
                            <p className="font-bold">No hay evidencia registrada antes</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="after"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        {viewingRecord.evidenceAfter ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center justify-center -z-10">
                              <Clock className="w-8 h-8 text-slate-700 animate-spin" />
                            </div>
                            <img 
                              src={getDriveDirectLink(viewingRecord.evidenceAfter)} 
                              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl relative z-10" 
                              alt="Evidencia Después"
                              referrerPolicy="no-referrer"
                              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                              style={{ opacity: 0, transition: 'opacity 0.3s' }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            <Camera className="w-16 h-16 mb-4 opacity-10" />
                            <p className="font-bold">No hay evidencia registrada después</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={() => setViewingRecord(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cerrar
                </button>
                <a 
                  href={activeEvidenceTab === 'before' ? viewingRecord.evidenceBefore : viewingRecord.evidenceAfter}
                  download={`evidencia_${viewingRecord.plate}_${activeEvidenceTab}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper Components
const FilterSelect = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{label}</label>
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer"
      >
        <option value="ALL">TODOS</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none transition-transform group-hover:scale-110" />
    </div>
  </div>
);

const KPICard = ({ label, value, unit, icon: Icon, color, subtext }: { label: string, value: any, unit?: string, icon: any, color: string, subtext?: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-md relative overflow-hidden group transition-all hover:bg-slate-800/60 hover:shadow-xl hover:shadow-black/20"
  >
    <div 
      className="absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 transition-all group-hover:opacity-20"
      style={{ backgroundColor: color }}
    />
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/50 shadow-inner group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {subtext && <span className="text-[10px] font-bold text-slate-500 bg-slate-900/40 px-2 py-0.5 rounded uppercase">{subtext}</span>}
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
      {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
    </div>
    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">{label}</p>
  </motion.div>
);

export default ControlTowerModule;
