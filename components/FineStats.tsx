
import React from 'react';
import { Users, AlertCircle, CheckCircle2, FileText, FileWarning } from 'lucide-react';

interface FineStatsProps {
  totalDrivers: number;
  withFines: number;
  withoutFines: number;
  withEvidence: number;
  withoutEvidence: number;
  rawTotal?: number;
  month: string;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FineStats: React.FC<FineStatsProps> = ({ 
  totalDrivers, 
  withFines, 
  withoutFines, 
  withEvidence, 
  withoutEvidence,
  rawTotal,
  month, 
  activeFilter, 
  onFilterChange 
}) => {
  const handleFilterClick = (filter: string) => {
    if (activeFilter === filter) {
      onFilterChange('all');
    } else {
      onFilterChange(filter);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
      {/* TOTAL CONDUCTORES */}
      <div 
        onClick={() => handleFilterClick('all')}
        className={`bg-white rounded-[2rem] p-6 shadow-lg border-b-4 relative overflow-hidden group transition-all hover:scale-[1.02] cursor-pointer ${activeFilter === 'all' ? 'border-indigo-600 ring-4 ring-indigo-500/20' : 'border-indigo-500'}`}
      >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Users size={60} />
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
          Registros en {month} (Total: {totalDrivers}) {rawTotal !== undefined && `[Cargados: ${rawTotal}]`}
        </p>
        <p className="text-[7px] text-slate-300 font-bold uppercase mb-2">Se cuentan registros con Mes: "{month}" o Fecha en {month}</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{totalDrivers}</h3>
          <div className="mb-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase">Total</div>
        </div>
      </div>

      {/* CON COMPARENDO (SI) */}
      <div 
        onClick={() => handleFilterClick('PENDIENTE')}
        className={`bg-white rounded-[2rem] p-6 shadow-lg border-b-4 relative overflow-hidden group transition-all hover:scale-[1.02] cursor-pointer ${activeFilter === 'PENDIENTE' ? 'border-rose-600 ring-4 ring-rose-500/20' : 'border-rose-500'}`}
      >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <AlertCircle size={60} className="text-rose-500" />
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Con Comparendo (SI)</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-rose-600 tracking-tighter">{withFines}</h3>
          <div className="mb-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[8px] font-black uppercase">Rojo</div>
        </div>
      </div>

      {/* SIN COMPARENDO (NO) */}
      <div 
        onClick={() => handleFilterClick('PAGADO')}
        className={`bg-white rounded-[2rem] p-6 shadow-lg border-b-4 relative overflow-hidden group transition-all hover:scale-[1.02] cursor-pointer ${activeFilter === 'PAGADO' ? 'border-emerald-600 ring-4 ring-emerald-500/20' : 'border-emerald-500'}`}
      >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <CheckCircle2 size={60} className="text-emerald-500" />
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sin Comparendo (NO)</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">{withoutFines}</h3>
          <div className="mb-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase">Verde</div>
        </div>
      </div>

      {/* CON COMPROBANTE */}
      <div 
        onClick={() => handleFilterClick('WITH_EVIDENCE')}
        className={`bg-white rounded-[2rem] p-6 shadow-lg border-b-4 relative overflow-hidden group transition-all hover:scale-[1.02] cursor-pointer ${activeFilter === 'WITH_EVIDENCE' ? 'border-blue-600 ring-4 ring-blue-500/20' : 'border-blue-500'}`}
      >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <FileText size={60} className="text-blue-500" />
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Con Soporte</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-blue-600 tracking-tighter">{withEvidence}</h3>
          <div className="mb-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black uppercase">Listo</div>
        </div>
      </div>

      {/* SIN COMPROBANTE */}
      <div 
        onClick={() => handleFilterClick('WITHOUT_EVIDENCE')}
        className={`bg-white rounded-[2rem] p-6 shadow-lg border-b-4 relative overflow-hidden group transition-all hover:scale-[1.02] cursor-pointer ${activeFilter === 'WITHOUT_EVIDENCE' ? 'border-amber-600 ring-4 ring-amber-500/20' : 'border-amber-500'}`}
      >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <FileWarning size={60} className="text-amber-500" />
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sin Soporte</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-amber-600 tracking-tighter">{withoutEvidence}</h3>
          <div className="mb-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[8px] font-black uppercase">Falta</div>
        </div>
      </div>
    </div>
  );
};

export default FineStats;
