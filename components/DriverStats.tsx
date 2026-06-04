import React from 'react';
import { Users, CreditCard, ShieldCheck, HeartPulse } from 'lucide-react';

interface DriverStatsProps {
  total: number;
  licenseWarning: number;
  defensiveWarning: number;
  medicalWarning: number;
  onFilter: (filter: 'all' | 'license' | 'defensive' | 'medical') => void;
  activeFilter: 'all' | 'license' | 'defensive' | 'medical';
}

const DriverStats: React.FC<DriverStatsProps> = ({ 
  total, 
  licenseWarning, 
  defensiveWarning, 
  medicalWarning,
  onFilter,
  activeFilter
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-8">
      {/* Total Conductores Card */}
      <button 
        onClick={() => onFilter('all')}
        className={`rounded-[2rem] p-6 flex flex-col items-center justify-center text-white shadow-2xl min-w-[200px] relative overflow-hidden group transition-all ${activeFilter === 'all' ? 'bg-indigo-600 shadow-indigo-600/30 ring-4 ring-indigo-600/20' : 'bg-slate-800 hover:bg-slate-700'}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors"></div>
        <Users size={28} className="mb-3 opacity-60" />
        <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-1 opacity-80">TOTAL CONDUCTORES</p>
        <p className="text-4xl font-black tracking-tighter leading-none">{total}</p>
      </button>

      {/* Warning Cards Grid */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => onFilter('license')}
          className={`rounded-[2rem] p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'license' ? 'bg-rose-50 border-rose-200 ring-4 ring-rose-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CreditCard size={20} className="text-rose-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE LICENCIA</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{licenseWarning}</p>
        </button>

        <button 
          onClick={() => onFilter('defensive')}
          className={`rounded-[2rem] p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'defensive' ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <ShieldCheck size={20} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE DEFENSIVO</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{defensiveWarning}</p>
        </button>

        <button 
          onClick={() => onFilter('medical')}
          className={`rounded-[2rem] p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'medical' ? 'bg-orange-50 border-orange-200 ring-4 ring-orange-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <HeartPulse size={20} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE MÉDICOS</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{medicalWarning}</p>
        </button>
      </div>
    </div>
  );
};

export default DriverStats;
