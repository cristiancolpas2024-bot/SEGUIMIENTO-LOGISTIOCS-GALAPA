
import React from 'react';
import { Fine } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Gavel, Calendar, Eye, UserCircle, FileSignature, Clock, FileText, CreditCard, AlertCircle, CheckCircle2, ImageOff, Camera } from 'lucide-react';

interface FineCardProps {
  fine: Fine;
  onViewDoc: (url: string | string[], title: string) => void;
  onAddSupport?: (fine: Fine) => void;
}

const FineCard: React.FC<FineCardProps> = ({ fine, onViewDoc, onAddSupport }) => {
  const isPending = fine.status === 'PENDIENTE'; 
  const hasAgreement = fine.paymentAgreement === 'SI';
  const hasEvidence = fine.evidenceUrl && fine.evidenceUrl.startsWith('http');
  const thumbUrl = hasEvidence ? getDriveDirectLink(fine.evidenceUrl!) : null;

  return (
    <div className={`bg-white rounded-[2.5rem] border-2 overflow-hidden shadow-lg transition-all hover:shadow-xl flex flex-col h-full group ${isPending ? 'border-rose-100' : 'border-emerald-100'}`}>
      
      {/* ENCABEZADO CENTRAL: NOMBRE DEL CONDUCTOR */}
      <div className={`p-6 flex flex-col items-center text-center relative overflow-hidden ${isPending ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="mb-3 p-3 bg-white/10 rounded-full border border-white/20 shadow-2xl relative z-10">
           <UserCircle size={40} className={isPending ? 'text-rose-200' : 'text-emerald-200'} />
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight leading-tight mb-2 relative z-10 px-4 drop-shadow-md">
           {fine.driverName || 'CONDUCTOR NO REGISTRADO'}
        </h2>

        <div className="flex flex-col items-center gap-1.5 relative z-10">
           <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/30 shadow-lg flex items-center gap-1.5 ${isPending ? 'bg-rose-600 animate-pulse' : 'bg-emerald-500'}`}>
              {isPending ? <AlertCircle size={12}/> : <CheckCircle2 size={12}/>}
              {isPending ? 'TIENE COMPARENDO (SI)' : 'SIN DEUDA (NO)'}
           </div>
           <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">
              CC {fine.driverId || '---'}
           </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow space-y-4 bg-white text-slate-600">
        
        {/* IDENTIFICACIÓN DEL COMPARENDO */}
        <div className="p-3 bg-slate-50 rounded-[1.2rem] border border-slate-100 flex items-center justify-center gap-2">
           <CreditCard size={16} className="text-indigo-500 shrink-0" />
           <div className="text-center">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">NÚMERO COMPARENDO</p>
              <p className="text-sm font-black text-slate-800 leading-none">{fine.infractionCode}</p>
           </div>
        </div>

        {/* VALOR Y ACUERDO */}
        <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-lg border-b-4 border-indigo-600/50">
           <div>
              <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">VALOR</p>
              <p className="text-xl font-black leading-none">${fine.amount.toLocaleString()}</p>
           </div>
           <div className="text-right">
              <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">ACUERDO</p>
              <div className={`flex items-center justify-end gap-1 font-black text-xs ${hasAgreement ? 'text-emerald-400' : 'text-slate-500'}`}>
                 <FileSignature size={14}/> {fine.paymentAgreement || 'NO'}
              </div>
           </div>
        </div>

        {/* FECHAS OPERATIVAS */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1">F. INFRACCIÓN</p>
              <p className="text-[9px] font-bold text-slate-700">{formatDate(fine.date)}</p>
           </div>
           <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1">F. REGISTRO</p>
              <p className="text-[9px] font-bold text-slate-700">{formatDate(fine.registrationDate || fine.date)}</p>
           </div>
        </div>

        {/* DESCRIPCIÓN DEL CONCEPTO */}
        <div className="bg-white border-t border-slate-100 pt-3">
           <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 italic">
              <p className="text-[10px] font-medium text-slate-500 leading-tight line-clamp-2 text-center">
                 "{fine.description || 'Sin descripción detallada'}"
              </p>
           </div>
        </div>

        {/* FOOTER: ACCIÓN DE SOPORTE */}
        <div className="mt-auto pt-2 space-y-3">
           {hasEvidence ? (
             <>
               <div 
                 onClick={() => onViewDoc(fine.evidenceUrl!, `Comparendo - ${fine.driverName}`)}
                 className="aspect-video rounded-2xl overflow-hidden bg-slate-100 relative group/img cursor-pointer border border-slate-100"
               >
                 <img 
                   src={thumbUrl!} 
                   alt="Soporte Comparendo" 
                   className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                   referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={24} className="text-white" />
                 </div>
               </div>
               <button 
                 onClick={() => onViewDoc(fine.evidenceUrl!, `Comparendo - ${fine.driverName}`)}
                 className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f172a] text-white rounded-2xl text-[9px] font-black transition-all uppercase tracking-[0.2em] hover:bg-indigo-600 shadow-lg active:scale-95 group"
               >
                 <Eye size={16} className="group-hover:scale-110 transition-transform" /> VER SOPORTE
               </button>
             </>
           ) : (
             <button 
               onClick={() => onAddSupport?.(fine)}
               className="w-full py-3 bg-amber-50 text-amber-600 rounded-2xl text-[9px] font-black text-center uppercase tracking-widest border-2 border-dashed border-amber-200 flex items-center justify-center gap-2 hover:bg-amber-100 hover:border-amber-400 transition-all active:scale-95"
             >
               <Camera size={14} /> CARGAR SOPORTE A LA HOJA
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default FineCard;
