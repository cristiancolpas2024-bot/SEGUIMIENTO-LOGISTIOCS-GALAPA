import React from 'react';
import { Truck, Shield, Wrench, CreditCard, Flame } from 'lucide-react';

interface VehicleStatsProps {
  total: number;
  soatWarning: number;
  rtmWarning: number;
  plcWarning: number;
  extWarning: number;
  onFilter: (filter: 'all' | 'soat' | 'rtm' | 'plc' | 'ext') => void;
  activeFilter: 'all' | 'soat' | 'rtm' | 'plc' | 'ext';
}

const VehicleStats: React.FC<VehicleStatsProps> = ({ 
  total, 
  soatWarning, 
  rtmWarning, 
  plcWarning, 
  extWarning,
  onFilter,
  activeFilter
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-2 md:gap-4 mb-4 md:mb-8">
      {/* Total Flota Card */}
      <button 
        onClick={() => onFilter('all')}
        className={`rounded-xl md:rounded-[2rem] p-3 md:p-6 flex flex-row lg:flex-col items-center justify-between lg:justify-center text-white shadow-2xl min-w-0 lg:min-w-[200px] relative overflow-hidden group transition-all ${activeFilter === 'all' ? 'bg-indigo-600 shadow-indigo-600/30 ring-4 ring-indigo-600/20' : 'bg-slate-800 hover:bg-slate-700'}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors"></div>
        <div className="flex items-center gap-2 md:gap-3 lg:flex-col lg:gap-0">
          <Truck size={20} className="lg:size-7 mb-0 lg:mb-3 opacity-60" />
          <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mb-0 lg:mb-1 opacity-80">TOTAL FLOTA</p>
        </div>
        <p className="text-xl md:text-4xl font-black tracking-tighter leading-none relative z-10">{total}</p>
      </button>

      {/* Warning Cards Grid */}
      <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <button 
          onClick={() => onFilter('soat')}
          className={`rounded-xl md:rounded-[2rem] p-2 md:p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'soat' ? 'bg-rose-50 border-rose-200 ring-4 ring-rose-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Shield size={16} className="text-rose-500 mb-0.5 md:mb-2 group-hover:scale-110 transition-transform relative z-10 md:size-5" />
          <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1 relative z-10">VENCE SOAT</p>
          <p className="text-base md:text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{soatWarning}</p>
        </button>

        <button 
          onClick={() => onFilter('rtm')}
          className={`rounded-xl md:rounded-[2rem] p-2 md:p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'rtm' ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Wrench size={16} className="text-amber-500 mb-0.5 md:mb-2 group-hover:scale-110 transition-transform relative z-10 md:size-5" />
          <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1 relative z-10">VENCE RTM</p>
          <p className="text-base md:text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{rtmWarning}</p>
        </button>

        <button 
          onClick={() => onFilter('plc')}
          className={`rounded-xl md:rounded-[2rem] p-2 md:p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'plc' ? 'bg-indigo-50 border-indigo-200 ring-4 ring-indigo-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CreditCard size={16} className="text-indigo-500 mb-0.5 md:mb-2 group-hover:scale-110 transition-transform relative z-10 md:size-5" />
          <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1 relative z-10">VENCE PLC</p>
          <p className="text-base md:text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{plcWarning}</p>
        </button>

        <button 
          onClick={() => onFilter('ext')}
          className={`rounded-xl md:rounded-[2rem] p-2 md:p-5 border shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden ${activeFilter === 'ext' ? 'bg-orange-50 border-orange-200 ring-4 ring-orange-500/10' : 'bg-white border-slate-100'}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Flame size={16} className="text-orange-500 mb-0.5 md:mb-2 group-hover:scale-110 transition-transform relative z-10 md:size-5" />
          <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1 relative z-10">VENCE EXT</p>
          <p className="text-base md:text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{extWarning}</p>
        </button>
      </div>
    </div>
  );
};

export default VehicleStats;
