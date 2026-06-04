
import React from 'react';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';

interface WorkshopStatsProps {
  total: number;
  completed: number;
  pending: number;
  label: string;
}

const WorkshopStats: React.FC<WorkshopStatsProps> = ({ total, completed, pending, label }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 flex flex-col lg:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
      
      {/* Progress Circle */}
      <div className="relative flex items-center gap-6 pr-8 border-r border-white/10">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * percentage) / 100} className="text-indigo-500 transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{percentage}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">AVANCE TOTAL</p>
          <p className="text-white text-xs font-bold uppercase">{label}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap justify-center lg:justify-start gap-4 flex-grow">
        <div className="bg-indigo-600 rounded-3xl p-6 flex items-center gap-4 min-w-[200px] shadow-lg shadow-indigo-600/20">
          <div className="p-3 bg-white/20 rounded-2xl text-white">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">PROGRAMADOS</p>
            <p className="text-white text-3xl font-black">{total}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl p-6 flex items-center gap-4 min-w-[200px] border border-white/5">
          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">COMPLETADOS</p>
            <p className="text-white text-3xl font-black">{completed}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl p-6 flex items-center gap-4 min-w-[200px] border border-white/5">
          <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">PENDIENTES</p>
            <p className="text-white text-3xl font-black">{pending}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopStats;
