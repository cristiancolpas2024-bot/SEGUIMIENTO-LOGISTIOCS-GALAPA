
import React from 'react';
import { WashReport } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Droplets, Calendar, Hash, MapPin, Eye } from 'lucide-react';

interface WashCardProps {
  report: WashReport;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
}

const WashCard: React.FC<WashCardProps> = ({ report, onViewDoc }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
      {/* Header with Plate */}
      <div className="bg-[#0f172a] p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
            <Droplets size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{report.plate}</h3>
            <div className="flex items-center gap-2 text-indigo-400/60 text-[8px] font-black uppercase tracking-widest">
              <Hash size={10} />
              <span>WASH-{report.id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 relative z-10">
          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${report.status === 'CERRADO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border-rose-500/20'}`}>
            {report.status === 'CERRADO' ? 'LIMPIEZA EXITOSA' : 'LIMPIEZA PENDIENTE'}
          </span>
          <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">SEMANA {report.week}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Date and Month */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-3 text-slate-600">
            <Calendar size={18} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-wide">{formatDate(report.date)}</span>
          </div>
          <span className="px-4 py-1.5 bg-white text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">
            {report.month}
          </span>
        </div>

        {/* Visual Support Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">SOPORTE VISUAL DE LIMPIEZA</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => onViewDoc(report.evidenceUrl, `Evidencia ${report.plate}`)}
                className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
              >
                <Eye size={14} /> <span className="text-[8px] font-black">VER FOTO</span>
              </button>
              <button 
                onClick={() => onViewDoc(report.mapUrl, `Ubicación ${report.plate}`)}
                className="p-2 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-600 hover:text-white transition-all flex items-center gap-2"
              >
                <MapPin size={14} /> <span className="text-[8px] font-black">MAPA</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Sub Grid: Map (Col G) and Evidence Preview */}
            <div className="grid grid-cols-2 gap-3">
              {/* Map Column G */}
              <div 
                onClick={() => onViewDoc(report.mapUrl, `Ubicación GPS - ${report.plate}`)}
                className="aspect-video rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 cursor-pointer relative group/mini shadow-sm"
              >
                <img src={getDriveDirectLink(report.mapUrl)} className="w-full h-full object-cover transition-transform duration-500 group-hover/mini:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                  <MapPin size={20} className="text-white" />
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-1 bg-cyan-500 text-white text-[7px] font-black rounded-lg uppercase tracking-widest">MAPA GPS</span>
                </div>
              </div>
              
              {/* Evidence Column F (mini preview) */}
              <div 
                onClick={() => onViewDoc(report.evidenceUrl, `Evidencia - ${report.plate}`)}
                className="aspect-video rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 cursor-pointer relative group/mini shadow-sm"
              >
                <img src={getDriveDirectLink(report.evidenceUrl)} className="w-full h-full object-cover transition-transform duration-500 group-hover/mini:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-1 bg-indigo-500 text-white text-[7px] font-black rounded-lg uppercase tracking-widest">EVIDENCIA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workshop Info */}
        {report.workshop && (
          <div className="flex items-center gap-3 text-slate-400 pt-2 border-t border-slate-100">
            <MapPin size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest truncate">{report.workshop}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WashCard;
