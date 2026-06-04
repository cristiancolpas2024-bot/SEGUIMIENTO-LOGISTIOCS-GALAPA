
import React from 'react';
import { Report } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Eye, User, Calendar, Store, ImageIcon } from 'lucide-react';

interface WorkshopVisitItemProps {
  visit: Report;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
  onManageClosure?: (visit: Report) => void;
}

const WorkshopVisitItem: React.FC<WorkshopVisitItemProps> = ({ visit, onViewDoc, onManageClosure }) => {
  const isPending = visit.status === 'PENDIENTES';
  const thumbUrl = getDriveDirectLink(visit.initialEvidence || visit.workshopEvidence || visit.solutionEvidence || "");
  
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center p-4 gap-6 relative overflow-hidden group hover:shadow-md transition-all">
      {/* Red accent border on left */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-l-full"></div>
      
      {/* Driver Name Box */}
      <div className="bg-[#0f172a] text-white px-6 py-4 rounded-2xl min-w-[160px] flex items-center justify-center shadow-lg w-full md:w-auto">
        <span className="font-black text-sm uppercase tracking-widest">{visit.plate}</span>
      </div>

      {/* Thumbnail */}
      <div 
        onClick={() => {
          const photos = [];
          if (visit.initialEvidence) photos.push({ url: visit.initialEvidence, label: 'Ingreso' });
          if (visit.workshopEvidence) photos.push({ url: visit.workshopEvidence, label: 'Trabajo' });
          if (visit.solutionEvidence) photos.push({ url: visit.solutionEvidence, label: 'Salida' });
          if (photos.length > 0) onViewDoc(photos, `Evidencia Taller - ${visit.plate}`);
        }}
        className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
      >
        {thumbUrl ? (
          <img src={thumbUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon size={20} />
          </div>
        )}
      </div>
      
      {/* Details */}
      <div className="flex-grow space-y-1 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-600">
          <Store size={14} />
          <span className="font-black text-[10px] uppercase tracking-widest">
            {isPending ? 'PENDIENTES TALLER' : 'COMPLETADOS'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>PROGRAMADO: {formatDate(visit.date)}</span>
          </div>
          <div className="hidden md:block w-px h-3 bg-slate-200"></div>
          <span>SEMANA {visit.week}</span>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="flex flex-col items-center gap-1 px-4">
        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">ESTADO REVISIÓN</span>
        <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isPending ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
          {isPending ? 'PENDIENTES' : 'COMPLETADOS'}
        </span>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            const photos = [];
            if (visit.initialEvidence) photos.push({ url: visit.initialEvidence, label: 'Ingreso' });
            if (visit.workshopEvidence) photos.push({ url: visit.workshopEvidence, label: 'Trabajo' });
            if (visit.solutionEvidence) photos.push({ url: visit.solutionEvidence, label: 'Salida' });
            if (photos.length > 0) {
              onViewDoc(photos, `Evidencia Taller - ${visit.plate}`);
            }
          }}
          className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
          title="Ver Evidencia"
        >
          <Eye size={18} />
        </button>
        <button 
          onClick={() => onManageClosure?.(visit)}
          className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl hover:bg-emerald-100 transition-all"
          title="Gestionar Cierre"
        >
          <User size={18} />
        </button>
      </div>
    </div>
  );
};

export default WorkshopVisitItem;
