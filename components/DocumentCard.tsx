
import React from 'react';
import { VehicleDocument } from '../types';
import { calculateStatus, formatDate, getDriveDirectLink, isImageLink } from '../utils';
import { Calendar, Clock, Eye, ShieldCheck, Info, AlertTriangle, UploadCloud } from 'lucide-react';

interface DocumentCardProps {
  title: string;
  doc: VehicleDocument;
  icon: React.ReactNode;
  onViewDoc?: (url: string | string[], title: string) => void;
  onAddSupport?: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, doc, icon, onViewDoc, onAddSupport }) => {
  const hasDate = !!doc.expiryDate;
  const status = hasDate ? calculateStatus(doc.expiryDate) : 'expired';
  const isImage = doc.url ? isImageLink(doc.url) : false;
  const thumbUrl = (doc.url && isImage) ? getDriveDirectLink(doc.url) : null;
  
  const styles = {
    active: {
      bg: 'bg-white',
      border: 'border-slate-100',
      badge: 'bg-[#10b981] text-white',
      iconBg: 'bg-gradient-to-br from-[#4f46e5] to-[#6366f1] text-white shadow-indigo-200/50',
      label: `VIGENTE`,
      dateColor: 'text-slate-800',
      btn: 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-lg'
    },
    warning: {
      bg: 'bg-amber-50/30',
      border: 'border-amber-200',
      badge: 'bg-amber-500 text-white',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200/50',
      label: `PRÓXIMO`,
      dateColor: 'text-amber-800',
      btn: 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg'
    },
    critical: {
      bg: 'bg-orange-50/30',
      border: 'border-orange-300',
      badge: 'bg-orange-600 text-white',
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-orange-200/50',
      label: `CRÍTICO`,
      dateColor: 'text-orange-900 font-black',
      btn: 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg animate-pulse'
    },
    expired: {
      bg: 'bg-rose-50/20',
      border: 'border-rose-200',
      badge: 'bg-rose-600 text-white',
      iconBg: 'bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-rose-200/50',
      label: !hasDate ? 'S/D' : `VENCIDO`,
      dateColor: 'text-rose-600 font-black',
      btn: 'bg-slate-200 text-slate-500 cursor-not-allowed'
    }
  };

  const currentStyle = styles[status];

  return (
    <div className={`relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border-4 transition-all duration-500 hover:shadow-xl flex flex-col h-full ${currentStyle.bg} ${currentStyle.border}`}>
      
      {hasDate && doc.daysPending !== undefined && (
        <div className={`absolute -top-3 right-4 md:right-6 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black flex items-center gap-1.5 shadow-xl border-2 z-20 ${status === 'critical' ? 'bg-orange-600 text-white border-orange-400' : 'bg-white text-slate-700 border-slate-50'}`}>
           {status === 'critical' ? <AlertTriangle size={10} className="animate-bounce md:size-3" /> : <Clock size={10} className="text-indigo-600 animate-pulse md:size-3" />} 
           {doc.daysPending} DÍAS
        </div>
      )}

      <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-500 shadow-xl shrink-0 ${currentStyle.iconBg}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
          </div>

          <div className="flex flex-col flex-grow">
            <span className={`w-fit px-2 py-0.5 rounded-md md:rounded-lg text-[7px] md:text-[8px] font-black tracking-[0.2em] uppercase shadow-sm mb-1 ${currentStyle.badge}`}>
              {currentStyle.label}
            </span>
            <h3 className="font-black text-slate-900 text-base md:text-lg uppercase tracking-tighter leading-none">
              {title}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 text-slate-400 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100">
          <Calendar size={14} className="text-indigo-500 md:size-4" />
          <div className="flex flex-col">
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400">Vencimiento</span>
            <span className={`text-[10px] md:text-xs font-black tracking-tight ${currentStyle.dateColor}`}>
              {hasDate ? formatDate(doc.expiryDate) : 'PENDIENTE'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-3">
        {doc.url && doc.url.length > 10 ? (
          <>
            {thumbUrl && (
              <div 
                onClick={() => onViewDoc?.(doc.url!, title)}
                className="aspect-video rounded-2xl overflow-hidden bg-slate-100 relative group/img cursor-pointer border border-slate-100"
              >
                <img 
                  src={thumbUrl} 
                  alt={title} 
                  className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                   <Eye size={24} className="text-white" />
                </div>
              </div>
            )}
            <button 
              onClick={() => onViewDoc?.(doc.url!, title)}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-[9px] font-black transition-all uppercase tracking-[0.2em] ${currentStyle.btn}`}
            >
              <Eye size={16} /> VER SOPORTE
            </button>
          </>
        ) : (
          <button 
            onClick={onAddSupport}
            className={`w-full py-3 bg-amber-50 text-amber-600 rounded-2xl text-[9px] font-black text-center uppercase tracking-[0.2em] border-2 border-dashed border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center gap-2 active:scale-95`}
          >
            <UploadCloud size={14} /> PENDIENTE SOPORTE
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
