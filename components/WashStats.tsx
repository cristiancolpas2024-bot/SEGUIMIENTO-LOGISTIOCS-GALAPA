
import React from 'react';
import { Droplets, CheckCircle2, Clock, Search, Truck } from 'lucide-react';

interface WashStatsProps {
  totalFlota: number;
  lavados: number;
  pendientes: number;
  busqueda: number;
  month: string;
}

const WashStats: React.FC<WashStatsProps> = ({ totalFlota, lavados, pendientes, busqueda, month }) => {
  const percentage = totalFlota > 0 ? Math.round((lavados / totalFlota) * 100) : 0;

  return (
    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 flex flex-col lg:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
      
      {/* Progress Circle */}
      <div className="relative flex items-center gap-8 pr-12 border-r border-white/10">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
            <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={339.3} strokeDashoffset={339.3 - (339.3 * percentage) / 100} className="text-cyan-500 transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-black text-white">{percentage}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]">CUMPLIMIENTO</p>
          <p className="text-white text-xs font-bold uppercase">{month}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap justify-center lg:justify-start gap-4 flex-grow">
        <div className="bg-indigo-600 rounded-[2rem] p-6 flex items-center gap-4 min-w-[180px] shadow-lg shadow-indigo-600/20">
          <div className="p-3 bg-white/20 rounded-2xl text-white">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">TOTAL FLOTA</p>
            <p className="text-white text-3xl font-black">{totalFlota}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-[2rem] p-6 flex items-center gap-4 min-w-[180px] border border-white/5">
          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">LIMPIEZAS</p>
            <p className="text-white text-3xl font-black">{lavados}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-[2rem] p-6 flex items-center gap-4 min-w-[180px] border border-white/5">
          <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">PENDIENTES</p>
            <p className="text-white text-3xl font-black">{pendientes}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-[2rem] p-6 flex items-center gap-4 min-w-[180px] border border-white/5">
          <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
            <Search size={24} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">BÚSQUEDA</p>
            <p className="text-white text-3xl font-black">{busqueda}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WashStats;
