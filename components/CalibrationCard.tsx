
import React from 'react';
import { Calibration } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Settings2, Calendar, Eye, Clock, ShieldCheck, Key, MapPin, Disc, Camera } from 'lucide-react';

interface CalibrationCardProps {
  calibration: Calibration;
  onViewDoc: (url: string | string[], title: string) => void;
  onUpdateEvidence: (calibration: Calibration) => void;
}

const CalibrationCard: React.FC<CalibrationCardProps> = ({ calibration, onViewDoc, onUpdateEvidence }) => {
  const styles = {
    active: {
      bg: 'bg-emerald-50/30',
      border: 'border-emerald-100',
      badge: 'bg-emerald-500 text-white',
      label: 'VIGENTE',
      icon: 'text-emerald-500',
      dot: 'bg-emerald-500',
      dotBorder: 'border-emerald-500'
    },
    warning: {
      bg: 'bg-amber-50/30',
      border: 'border-amber-100',
      badge: 'bg-amber-500 text-white',
      label: 'POR VENCER',
      icon: 'text-amber-500',
      dot: 'bg-amber-500',
      dotBorder: 'border-amber-500'
    },
    expired: {
      bg: 'bg-rose-50/30',
      border: 'border-rose-100',
      badge: 'bg-rose-500 text-white',
      label: 'VENCIDO',
      icon: 'text-rose-500',
      dot: 'bg-rose-500',
      dotBorder: 'border-rose-500'
    }
  };

  const hasExpiry = !!calibration.expiryDate;
  const s = styles[calibration.status];
  const thumbUrl = calibration.certificateUrl ? getDriveDirectLink(calibration.certificateUrl) : null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:bg-indigo-50 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${s.dotBorder}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {calibration.estado && (
              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm ${calibration.estado === 'COMPLETADO' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {calibration.estado}
              </span>
            )}
            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm ${s.badge}`}>
              {s.label}
            </span>
          </div>
          {hasExpiry && calibration.daysPending !== undefined && (
            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-400" /> {calibration.daysPending} DÍAS RESTANTES
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none">{calibration.equipment}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-4 py-1.5 bg-[#0f172a] text-white rounded-xl font-mono font-black text-[11px] tracking-tight shadow-md">
              {calibration.plate}
            </span>
            {calibration.cd && (
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1.5">
                <MapPin size={12} /> {calibration.cd}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Últ. Calibración</span>
             <span className="text-[12px] font-black text-slate-700 leading-none">{formatDate(calibration.calibrationDate)}</span>
          </div>
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimiento</span>
             <span className="text-[12px] font-black text-slate-700 leading-none">{hasExpiry ? formatDate(calibration.expiryDate) : 'S/D'}</span>
          </div>
        </div>

        {calibration.certificateUrl ? (
          <div className="space-y-3">
            <div 
              onClick={() => onViewDoc(calibration.certificateUrl!, `${calibration.plate} - ${calibration.equipment}`)}
              className="aspect-video rounded-2xl overflow-hidden bg-slate-100 relative group/img cursor-pointer border border-slate-100"
            >
              <img 
                src={thumbUrl!} 
                alt="Certificado Calibración" 
                className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                 <Eye size={24} className="text-white" />
              </div>
            </div>
            <button 
              onClick={() => onViewDoc(calibration.certificateUrl!, `${calibration.plate} - ${calibration.equipment}`)}
              className="w-full flex items-center justify-center gap-3 py-5 bg-[#0f172a] text-white rounded-[2rem] text-[11px] font-black transition-all uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-600 active:scale-95 group"
            >
              <Eye size={18} className="group-hover:scale-110 transition-transform" /> 
              VER RESULTADOS
            </button>
          </div>
        ) : (
          <button 
            onClick={() => onUpdateEvidence(calibration)}
            className="w-full py-5 bg-indigo-50 text-indigo-600 rounded-[2rem] text-[11px] font-black text-center uppercase tracking-[0.2em] border-2 border-dashed border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all flex items-center justify-center gap-3"
          >
            <Camera size={18} />
            REGISTRAR EVIDENCIA
          </button>
        )}
      </div>
    </div>
  );
};

export default CalibrationCard;
