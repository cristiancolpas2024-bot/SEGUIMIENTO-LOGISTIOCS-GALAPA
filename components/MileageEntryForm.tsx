import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, MileageLog } from '../types';
import { getWeekNumber, normalizePlate, normalizeStr, extractNumber, formatDate } from '../utils';
import { 
  Gauge, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Truck, 
  Search, 
  Hash, 
  ArrowLeft, 
  Calendar, 
  ListChecks, 
  Clock, 
  Building2, 
  UserCircle, 
  CalendarDays, 
  Briefcase,
  History,
  Plus,
  ArrowRight,
  FileSpreadsheet,
  Filter,
  Activity,
  AlertCircle,
  PieChart,
  BarChart3,
  TrendingUp,
  ChevronRight,
  HelpCircle,
  Database,
  ChevronDown
} from 'lucide-react';
import ExportButton from './ExportButton';

interface MileageEntryFormProps {
  vehicles: Vehicle[];
  mileageLogs: MileageLog[];
  onSubmit: (data: { plate: string, mileage: number, cd: string, contractor: string, date: string, week: string }) => Promise<void>;
  externalCd: string;
  setExternalCd: (cd: string) => void;
  externalContractor: string;
  setExternalContractor: (cnt: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'all' | 'completed' | 'pending';
  setStatusFilter: (filter: 'all' | 'completed' | 'pending') => void;
  entryDateOverride?: string;
  onDateChange?: (date: string) => void;
  selectedWeek: number;
  onWeekChange: (week: number) => void;
}

const MileageEntryForm: React.FC<MileageEntryFormProps> = ({ 
  vehicles, 
  mileageLogs,
  onSubmit, 
  externalCd, 
  setExternalCd, 
  externalContractor, 
  setExternalContractor,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  entryDateOverride,
  onDateChange,
  selectedWeek,
  onWeekChange
}) => {
  const [activeTab, setActiveTab] = useState<'registro' | 'historial'>('registro');
  const [entryDate, setEntryDate] = useState(entryDateOverride || new Date().toISOString().split('T')[0]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [newMileage, setNewMileage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Control de vista Mensual vs Semanal
  const [viewMode, setViewMode] = useState<'semanal' | 'mensual'>('semanal');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  useEffect(() => {
    if (entryDateOverride) setEntryDate(entryDateOverride);
  }, [entryDateOverride]);

  const getLastMileage = (plate: string) => {
    const vPlate = normalizePlate(plate);
    const logs = (mileageLogs || [])
      .filter(log => normalizePlate(log.plate) === vPlate)
      .sort((a, b) => {
        const weekA = extractNumber(a.week);
        const weekB = extractNumber(b.week);
        if (weekA !== weekB) return weekB - weekA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    return logs.length > 0 ? logs[0].mileage : 0;
  };

  const isVehicleDoneInWeek = (vehicle: Vehicle, week: number) => {
    const vPlate = normalizePlate(vehicle.plate);
    return (mileageLogs || []).some(log => {
      const logWeek = extractNumber(log.week);
      const logPlate = normalizePlate(log.plate);
      return logPlate === vPlate && logWeek === week;
    });
  };

  const isVehicleDoneInMonth = (vehicle: Vehicle, monthIndex: number) => {
    const vPlate = normalizePlate(vehicle.plate);
    return (mileageLogs || []).some(log => {
      const logDate = new Date(log.date);
      const logPlate = normalizePlate(log.plate);
      return logPlate === vPlate && logDate.getMonth() === monthIndex;
    });
  };

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => {
    const vInCd = externalCd === 'all' ? vehicles : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(externalCd));
    return Array.from(new Set(vInCd.map(v => v.contractor || 'GENERAL'))).sort();
  }, [vehicles, externalCd]);

  const statsFiltered = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = externalCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(externalCd);
      const matchContractor = externalContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(externalContractor);
      return matchCd && matchContractor;
    });
  }, [vehicles, externalCd, externalContractor]);

  const stats = useMemo(() => {
    const total = statsFiltered.length;
    const completed = statsFiltered.filter(v => 
      viewMode === 'semanal' ? isVehicleDoneInWeek(v, selectedWeek) : isVehicleDoneInMonth(v, selectedMonth)
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending: total - completed, percentage };
  }, [statsFiltered, mileageLogs, selectedWeek, selectedMonth, viewMode]);

  const filteredVehicles = useMemo(() => {
    return statsFiltered.filter(v => {
      const isCompleted = viewMode === 'semanal' ? isVehicleDoneInWeek(v, selectedWeek) : isVehicleDoneInMonth(v, selectedMonth);
      const matchPlate = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      
      if (!matchPlate) return false;
      if (statusFilter === 'completed') return isCompleted;
      if (statusFilter === 'pending') return !isCompleted;
      return true;
    }).sort((a, b) => {
      const aDone = viewMode === 'semanal' ? isVehicleDoneInWeek(a, selectedWeek) : isVehicleDoneInMonth(a, selectedMonth);
      const bDone = viewMode === 'semanal' ? isVehicleDoneInWeek(b, selectedWeek) : isVehicleDoneInMonth(b, selectedMonth);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.plate.localeCompare(b.plate);
    });
  }, [statsFiltered, statusFilter, mileageLogs, selectedWeek, selectedMonth, viewMode, searchTerm]);

  const historyLogs = useMemo(() => {
    return (mileageLogs || []).filter(log => {
      const logDate = new Date(log.date);
      const matchTime = viewMode === 'semanal' 
        ? extractNumber(log.week) === selectedWeek 
        : logDate.getMonth() === selectedMonth;
      const matchCd = externalCd === 'all' || normalizeStr(log.cd || "") === normalizeStr(externalCd);
      const matchContractor = externalContractor === 'all' || normalizeStr(log.contractor || "") === normalizeStr(externalContractor);
      const matchSearch = searchTerm === '' || normalizePlate(log.plate).includes(normalizePlate(searchTerm));
      return matchTime && matchCd && matchContractor && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mileageLogs, selectedWeek, selectedMonth, viewMode, externalCd, externalContractor, searchTerm]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle || !newMileage || isSubmitting) return;

    const currentKm = parseInt(newMileage);
    if (isNaN(currentKm)) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        plate: activeVehicle.plate,
        mileage: currentKm,
        cd: activeVehicle.cd || 'GENERAL',
        contractor: activeVehicle.contractor || 'GENERAL',
        date: entryDate,
        week: selectedWeek.toString()
      });
      setNewMileage('');
      setActiveVehicle(null);
    } catch (err) {
      console.error("Error submitting mileage form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 px-2 pb-12">
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col items-center text-center gap-1.5 py-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
          <Gauge size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Control de Kilometrajes
          </h2>
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-0.5">
            Registro Rápido <span className="text-slate-300">•</span> Semana {selectedWeek}
          </p>
        </div>
      </div>

      {!activeVehicle ? (
        <div className="space-y-4">
          {/* FILTROS COMPACTOS MÓVIL */}
          <div className="bg-[#0f172a] rounded-2xl p-4 text-white shadow-xl space-y-3 border border-white/5">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Filter size={12} className="text-indigo-400" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">Filtros de Búsqueda</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="text-[8px] font-black text-indigo-300 uppercase tracking-wider block mb-1">CD</label>
                <div className="relative">
                  <select 
                    className="bg-[#1e293b] text-white text-[10px] font-black w-full px-2.5 py-2 rounded-lg outline-none uppercase appearance-none cursor-pointer border border-white/5 focus:border-indigo-500 transition-all" 
                    value={externalCd} 
                    onChange={e => setExternalCd(e.target.value)}
                  >
                    <option value="all">TODOS</option>
                    {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={12} />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-indigo-300 uppercase tracking-wider block mb-1">Operador</label>
                <div className="relative">
                  <select 
                    className="bg-[#1e293b] text-white text-[10px] font-black w-full px-2.5 py-2 rounded-lg outline-none uppercase appearance-none cursor-pointer border border-white/5 focus:border-indigo-500 transition-all" 
                    value={externalContractor} 
                    onChange={e => setExternalContractor(e.target.value)}
                  >
                    <option value="all">TODOS</option>
                    {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={12} />
                </div>
              </div>
            </div>

            <div className="pt-1">
              <label className="text-[8px] font-black text-indigo-300 uppercase tracking-wider block mb-1">Estado</label>
              <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/5">
                {[
                  { id: 'all', label: 'TODOS' },
                  { id: 'pending', label: 'PENDIENTES' },
                  { id: 'completed', label: 'LISTOS' }
                ].map((f) => (
                  <button 
                    key={f.id} 
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`flex-1 py-1.5 rounded text-[8px] font-black uppercase transition-all ${statusFilter === f.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GRID DE VEHÍCULOS */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-3">
            <div className="grid grid-cols-2 gap-2.5">
              {filteredVehicles.length > 0 ? filteredVehicles.map((v) => {
                const isDone = viewMode === 'semanal' ? isVehicleDoneInWeek(v, selectedWeek) : isVehicleDoneInMonth(v, selectedMonth);
                const lastKm = getLastMileage(v.plate);
                return (
                  <button 
                    key={v.id} 
                    onClick={() => { setActiveVehicle(v); setNewMileage(''); }} 
                    className={`group flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all relative bg-white text-left min-h-[120px] ${isDone ? 'border-emerald-50 bg-emerald-50/20 grayscale opacity-80' : 'border-slate-50 hover:border-indigo-500 active:scale-95'}`}
                  >
                    <div className="w-full flex items-center justify-between mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase tracking-wider border ${isDone ? 'bg-emerald-105 text-emerald-800 border-emerald-200 bg-emerald-100' : 'bg-rose-100 text-rose-800 border-rose-250 animate-pulse'}`}>
                         {isDone ? 'LISTO' : 'REGISTRAR'}
                      </span>
                    </div>

                    <div className={`w-full py-1.5 rounded-lg font-mono font-black text-lg text-center border shadow-sm transition-all mb-2 ${isDone ? 'bg-emerald-100/50 text-emerald-800 border-emerald-100' : 'bg-[#0f172a] text-white border-white/5'}`}>
                      {v.plate}
                    </div>
                    
                    <div className="w-full space-y-1 text-[9px]">
                      <div className="flex items-center justify-center gap-1 text-indigo-600 font-black bg-indigo-50/50 py-1 rounded-md border border-indigo-100/50">
                         <Gauge size={10} className="shrink-0" />
                         <span className="tracking-tight">{lastKm > 0 ? lastKm.toLocaleString() : 'N/A'} KM</span>
                      </div>
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[7.5px] font-bold text-slate-400 uppercase truncate">
                         <span className="truncate max-w-[50px]">{v.cd || 'SIN CD'}</span>
                         <span className="truncate max-w-[60px] text-right">{v.contractor || 'BQA'}</span>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="col-span-full py-12 text-center flex flex-col items-center">
                   <div className="p-6 bg-slate-50 rounded-full mb-3 border-2 border-dashed border-slate-100">
                      <Search size={24} className="text-slate-300" />
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin vehículos pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button 
              type="button" 
              onClick={() => setActiveVehicle(null)} 
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft size={14} /> ATRÁS
            </button>
            <div className="text-right">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ÚLTIMO KM</p>
               <p className="text-xl font-black text-indigo-600 tracking-tighter leading-none">{getLastMileage(activeVehicle.plate).toLocaleString()} <span className="text-[10px] font-black text-indigo-400 uppercase">KM</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0f172a] p-5 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
              <span className="text-4xl font-mono font-black text-white tracking-widest block leading-none">{activeVehicle.plate}</span>
              <div className="flex items-center gap-2 mt-2 text-[8px] font-black text-slate-400 uppercase">
                 <span>{activeVehicle.cd}</span>
                 <span>•</span>
                 <span className="truncate max-w-[120px]">{activeVehicle.contractor}</span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider block text-center lg:text-left">Kilometraje Actual</label>
                 <div className="relative">
                    <input 
                      autoFocus 
                      required 
                      type="number" 
                      placeholder="000" 
                      value={newMileage} 
                      onChange={(e) => setNewMileage(e.target.value)} 
                      className="w-full p-4 bg-slate-50 border-2 border-indigo-50 rounded-xl text-center text-4xl font-black text-[#0f172a] outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner placeholder:text-slate-200" 
                    />
                 </div>
              </div>
              
              <button type="submit" disabled={isSubmitting || !newMileage} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-[#0f172a] transition-all flex items-center justify-center gap-2 active:scale-95">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSubmitting ? 'GUARDANDO...' : `CONFIRMAR REPORTE`}
              </button>
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 items-start text-[8.5px] font-bold text-amber-800 uppercase leading-relaxed">
                 <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={12} />
                 <p>
                   Verifica los dígitos cuidadosamente. Al confirmar, el vehículo se marcará como <span className="text-emerald-700 font-bold">LISTO</span>.
                 </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MileageEntryForm;
