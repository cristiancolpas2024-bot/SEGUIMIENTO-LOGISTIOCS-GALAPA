
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Settings,
  Plus,
  Wrench,
  Truck,
  PenTool,
  Map,
  Search,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { WorkshopRecord, Vehicle } from '../types';
import { fetchWorkshopRecordsFromSheet } from '../services/sheetService';
import { WorkshopForm } from './WorkshopForm';

interface WorkshopModuleProps {
  onBack: () => void;
  vehicles: Vehicle[];
}

const WORKSHOPS = [
  { id: 'TECNIBENZ', name: 'TECNIBENZ', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'VEHIPESA', name: 'VEHIPESA', icon: Truck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'TODOFIBRAS', name: 'TODOFIBRAS', icon: PenTool, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'CAMION COLOMBIA', name: 'CAMION COLOMBIA', icon: Map, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'ELECTRONIC SYSTEM', name: 'ELECTRONIC SYSTEM', icon: Cpu, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'COUNTRY TRUCK', name: 'COUNTRY TRUCK', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
];

const WorkshopModule: React.FC<WorkshopModuleProps> = ({ onBack, vehicles }) => {
  const [activeWorkshop, setActiveWorkshop] = useState<string | null>(null);
  const [records, setRecords] = useState<WorkshopRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWorkshopRecordsFromSheet();
      setRecords(data);
    } catch (error) {
      console.error('Error loading workshop records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    const interval = setInterval(loadRecords, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const filteredRecords = records.filter(record => {
    if (activeWorkshop && record.workshopName !== activeWorkshop) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.plate.toLowerCase().includes(searchLower) ||
        record.novelty.toLowerCase().includes(searchLower) ||
        record.status.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'EN PROCESO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDIENTE REPUESTO': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {WORKSHOPS.map((workshop) => {
        const Icon = workshop.icon;
        const workshopRecords = records.filter(r => r.workshopName === workshop.id);
        const activeCount = workshopRecords.filter(r => r.status.toUpperCase() !== 'FINALIZADO').length;

        return (
          <button
            key={workshop.id}
            onClick={() => setActiveWorkshop(workshop.id)}
            className={`flex flex-col items-start p-8 rounded-2xl border ${workshop.border} ${workshop.bg} hover:bg-white/10 transition-all text-left group`}
          >
            <div className={`p-4 rounded-xl bg-white/10 ${workshop.color} mb-6 group-hover:scale-110 transition-transform`}>
              <Icon size={32} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{workshop.name}</h3>
            <div className="flex items-center gap-4 mt-auto pt-6 w-full border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Registros</span>
                <span className="text-white font-mono text-xl">{workshopRecords.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">En Proceso</span>
                <span className="text-amber-400 font-mono text-xl">{activeCount}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderWorkshopView = () => {
    const workshop = WORKSHOPS.find(w => w.id === activeWorkshop);
    if (!workshop) return null;

    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveWorkshop(null)}
              className="p-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className={`text-2xl font-black ${workshop.color} uppercase tracking-tight flex items-center gap-3`}>
                <workshop.icon size={24} />
                {workshop.name}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Gestión de novedades y mantenimientos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar placa, novedad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <button 
              onClick={loadRecords}
              disabled={isLoading}
              className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg font-bold hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Actualizar datos"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> Sincronizar
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} /> Nueva Novedad
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto bg-white/5 rounded-2xl border border-white/10">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800/50 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">Fecha</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">Placa</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">Novedad</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">Estado</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">Evidencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se encontraron registros para este taller.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="text-white font-medium">{record.date}</div>
                      <div className="text-slate-500 text-xs">{record.month} - Sem {record.week}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-mono text-sm border border-slate-700">
                        {record.plate}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 text-sm max-w-md line-clamp-2" title={record.novelty}>
                        {record.novelty}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {record.evidence1Url && (
                          <a 
                            href={record.evidence1Url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-800 text-blue-400 rounded hover:bg-slate-700 transition-colors"
                            title="Ver Evidencia 1"
                          >
                            <ImageIcon size={16} />
                          </a>
                        )}
                        {record.evidence2Url && (
                          <a 
                            href={record.evidence2Url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-800 text-blue-400 rounded hover:bg-slate-700 transition-colors"
                            title="Ver Evidencia 2"
                          >
                            <ImageIcon size={16} />
                          </a>
                        )}
                        {!record.evidence1Url && !record.evidence2Url && (
                          <span className="text-slate-600 text-xs">Sin evidencia</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-grow bg-[#0f172a] flex flex-col h-full overflow-hidden">
      <div className="max-w-7xl mx-auto w-full p-8 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Módulo Talleres</h1>
            <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mt-2">Control de Mantenimiento Especializado</p>
          </div>
          {!activeWorkshop && (
            <div className="flex items-center gap-4">
              <button 
                onClick={loadRecords}
                disabled={isLoading}
                className="px-6 py-3 bg-white/5 text-slate-300 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 border border-white/10 disabled:opacity-50"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> Sincronizar
              </button>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Nueva Novedad
              </button>
              <button 
                onClick={onBack}
                className="px-6 py-3 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10"
              >
                <ChevronLeft size={18} /> Volver al Menú
              </button>
            </div>
          )}
        </div>

        <div className="flex-grow overflow-hidden">
          {activeWorkshop ? renderWorkshopView() : renderDashboard()}
        </div>
      </div>

      <WorkshopForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={loadRecords}
        defaultWorkshop={activeWorkshop || undefined}
        vehicles={vehicles}
      />
    </div>
  );
};

export default WorkshopModule;
