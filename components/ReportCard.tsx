
import React, { useState } from 'react';
import { Report } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  Image as ImageIcon, 
  Wrench, 
  FileText, 
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Calendar,
  MessageSquare,
  History,
  Hash,
  Camera
} from 'lucide-react';

interface ReportCardProps {
  report: Report;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
  onManageClosure?: (report: Report) => void;
  onManageEntry?: (report: Report) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onViewDoc, onManageClosure, onManageEntry }) => {
  const getThumb = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('data')) return url;
    if (url.startsWith('http')) return getDriveDirectLink(url);
    return null;
  };

  const thumbIn = getThumb(report.initialEvidence);
  const thumbOut = getThumb(report.solutionEvidence);
  const thumbWorkshop = getThumb(report.workshopEvidence);
  const [isNoveltyExpanded, setIsNoveltyExpanded] = useState(false);

  const isClosed = report.status === 'COMPLETADOS';
  const hasEntry = !!report.entryMap;

  return (
    <div className={`bg-white rounded-[2rem] border-2 overflow-hidden shadow-lg transition-all hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full ${isClosed ? 'border-emerald-100 bg-emerald-50/5' : 'border-rose-50 bg-white'}`}>
      
      {/* CABECERA MÁS COMPACTA */}
      <div className={`p-5 flex justify-between items-center relative overflow-hidden ${isClosed ? 'bg-[#064e3b]' : 'bg-[#0f172a]'}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 ${isClosed ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className={`p-2.5 rounded-xl shadow-md border border-white/10 ${isClosed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            <Wrench size={20} />
          </div>
          <div>
            <h3 className="font-mono font-black text-white text-xl tracking-tighter leading-none">{report.plate}</h3>
            <div className="flex flex-col gap-1 mt-1.5">
              <p className="text-[8px] text-indigo-300 font-black uppercase tracking-widest flex items-center gap-1.5">
                 <Calendar size={10} /> REP: {formatDate(report.date)}
              </p>
              {report.workshopDate && (
                <p className="text-[8px] text-amber-300 font-black uppercase tracking-widest flex items-center gap-1.5">
                   <Clock size={10} /> TALLER: {formatDate(report.workshopDate)} ({report.daysToAttend}d)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end relative z-10">
          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md border ${isClosed ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-500 animate-pulse'}`}>
            {isClosed ? 'COMPLETADOS' : 'PENDIENTES'}
          </span>
          <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest mt-2">{report.id}</span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow space-y-6">
        
        {/* BLOQUE 1: DESCRIPCIÓN REDUCIDA */}
        <div className="space-y-3">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <FileText size={14} className="text-indigo-400" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trabajo / Novedad</span>
              </div>
              <button 
                onClick={() => setIsNoveltyExpanded(!isNoveltyExpanded)}
                className="text-[8px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
              >
                {isNoveltyExpanded ? 'Ver menos' : 'Ver más'}
              </button>
           </div>
           <div 
             className={`bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 cursor-pointer transition-all duration-300 ${isNoveltyExpanded ? 'shadow-inner bg-slate-100' : 'hover:bg-slate-100/50'}`}
             onClick={() => setIsNoveltyExpanded(!isNoveltyExpanded)}
           >
              <p className={`text-xs font-bold text-slate-600 leading-tight italic ${isNoveltyExpanded ? '' : 'truncate'}`}>
                "{report.novelty}"
              </p>
           </div>
        </div>

        {/* BLOQUE 2: LOGÍSTICA EN LÍNEA */}
        <div className="grid grid-cols-2 gap-3">
           <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                 <Wrench size={10} className="text-amber-500" /> Taller
              </p>
              <p className="text-[10px] font-black text-slate-700 uppercase truncate">{report.workshop || 'PENDIENTE'}</p>
           </div>
           <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                 <AlertCircle size={10} className="text-indigo-400" /> Origen
              </p>
              <p className="text-[10px] font-black text-slate-700 uppercase truncate">{report.source}</p>
           </div>
        </div>

        {/* BLOQUE 3: FLUJO FOTOGRÁFICO MINI */}
        <div className="space-y-4">
           <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block px-1">Trazabilidad Visual</span>
           
           <div className="flex items-center justify-between gap-1.5 p-3 bg-slate-50/30 rounded-2xl border border-slate-100">
               {/* Foto Ingreso */}
               <div className="relative group w-16 h-16">
                 <div 
                   onClick={() => {
                     if (thumbIn) {
                       const photos = [];
                       if (report.initialEvidence) photos.push({ url: report.initialEvidence, label: 'Ingreso' });
                       if (report.workshopEvidence) photos.push({ url: report.workshopEvidence, label: 'Trabajo' });
                       if (report.solutionEvidence) photos.push({ url: report.solutionEvidence, label: 'Salida' });
                       onViewDoc(photos, `Trazabilidad - ${report.plate}`);
                     } else if (!isClosed) {
                       onManageEntry?.(report);
                     }
                   }} 
                   className={`w-full h-full rounded-xl overflow-hidden cursor-pointer shadow-sm border-2 ${thumbIn ? 'border-white' : 'border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 transition-colors'}`}
                 >
                    {thumbIn ? (
                      <img src={thumbIn} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Camera size={14} className="text-indigo-400" />
                        <span className="text-[5px] font-black text-indigo-400 uppercase">AÑADIR</span>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[6px] font-black px-1.5 py-0.5 rounded-br-md">INI</div>
                 </div>
                 {!isClosed && !thumbIn && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onManageEntry?.(report); }}
                     className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all z-20"
                   >
                     <Camera size={10} />
                   </button>
                 )}
               </div>

               <ArrowRight className={`text-slate-200 ${isClosed ? 'text-emerald-400' : ''}`} size={16} />

               {/* Foto Taller */}
               <div className="relative group w-16 h-16">
                 <div 
                   onClick={() => {
                     if (thumbWorkshop) {
                       const photos = [];
                       if (report.initialEvidence) photos.push({ url: report.initialEvidence, label: 'Ingreso' });
                       if (report.workshopEvidence) photos.push({ url: report.workshopEvidence, label: 'Trabajo' });
                       if (report.solutionEvidence) photos.push({ url: report.solutionEvidence, label: 'Salida' });
                       onViewDoc(photos, `Trazabilidad - ${report.plate}`);
                     } else if (!isClosed) {
                       onManageEntry?.(report);
                     }
                   }} 
                   className={`w-full h-full rounded-xl overflow-hidden cursor-pointer shadow-sm border-2 ${thumbWorkshop ? 'border-white' : 'border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-100 transition-colors'}`}
                 >
                    {thumbWorkshop ? (
                      <img src={thumbWorkshop} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Camera size={14} className="text-amber-400" />
                        <span className="text-[5px] font-black text-amber-400 uppercase">AÑADIR</span>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 bg-amber-500 text-white text-[6px] font-black px-1.5 py-0.5 rounded-br-md">TRB</div>
                 </div>
                 {!isClosed && !thumbWorkshop && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onManageEntry?.(report); }}
                     className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-all z-20"
                   >
                     <Camera size={10} />
                   </button>
                 )}
               </div>

               <ArrowRight className={`text-slate-200 ${isClosed ? 'text-emerald-400' : ''}`} size={16} />

               {/* Foto Salida */}
               <div className="relative group w-16 h-16">
                 <div 
                   onClick={() => {
                     if (thumbOut) {
                       const photos = [];
                       if (report.initialEvidence) photos.push({ url: report.initialEvidence, label: 'Ingreso' });
                       if (report.workshopEvidence) photos.push({ url: report.workshopEvidence, label: 'Trabajo' });
                       if (report.solutionEvidence) photos.push({ url: report.solutionEvidence, label: 'Salida' });
                       onViewDoc(photos, `Trazabilidad - ${report.plate}`);
                     } else if (!isClosed) {
                       onManageClosure?.(report);
                     }
                   }} 
                   className={`w-full h-full rounded-xl overflow-hidden cursor-pointer shadow-sm border-2 ${thumbOut ? 'border-white' : 'border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 transition-colors'}`}
                 >
                    {thumbOut ? (
                      <img src={thumbOut} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Camera size={14} className="text-emerald-400" />
                        <span className="text-[5px] font-black text-emerald-400 uppercase">AÑADIR</span>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[6px] font-black px-1.5 py-0.5 rounded-br-md">FIN</div>
                 </div>
                 {!isClosed && !thumbOut && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onManageClosure?.(report); }}
                     className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-lg shadow-lg hover:bg-emerald-600 transition-all z-20"
                   >
                     <Camera size={10} />
                   </button>
                 )}
               </div>
           </div>
        </div>

        {/* BLOQUE 4: CIERRE MINI */}
        {isClosed && (
          <div className="p-4 bg-emerald-600/90 rounded-2xl text-white shadow-md">
             <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                   <History size={14} className="text-emerald-200" />
                   <h4 className="text-[8px] font-black uppercase tracking-widest">Resumen Salida</h4>
                </div>
                <p className="text-[14px] font-black">{report.daysInShop}d</p>
             </div>
             <div className="p-2.5 bg-white/10 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold leading-tight line-clamp-2 opacity-90">{report.closureComments || 'Cerrado sin comentarios.'}</p>
             </div>
          </div>
        )}

        {/* ACCIONES COMPACTAS */}
        <div className="mt-auto grid grid-cols-2 gap-2.5 pt-2">
          <button 
            onClick={() => {
              if (report.entryMap) {
                onViewDoc(report.entryMap, 'Mapa Ingreso');
              } else if (!isClosed) {
                onManageEntry?.(report);
              }
            }}
            className={`flex items-center justify-center gap-2 py-3 border text-[8px] font-black rounded-xl transition-all uppercase tracking-widest shadow-sm ${report.entryMap ? 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-50 text-indigo-400 border-indigo-200 hover:bg-indigo-600 hover:text-white'}`}
          >
            <MapPin size={12} /> {report.entryMap ? 'MAPA IN' : 'MAPA IN'}
          </button>
          
          {isClosed ? (
            <button 
              onClick={() => report.exitMap && onViewDoc(report.exitMap, 'Mapa Salida')}
              disabled={!report.exitMap}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-700 text-white text-[8px] font-black rounded-xl hover:bg-emerald-800 transition-all uppercase tracking-widest shadow-md"
            >
              <MapPin size={12} /> MAPA OUT
            </button>
          ) : (
            <button 
              onClick={() => onManageClosure?.(report)}
              className="flex items-center justify-center gap-2 py-3 bg-[#0f172a] text-white text-[8px] font-black rounded-xl hover:bg-indigo-600 shadow-lg transition-all uppercase tracking-widest"
            >
              <Clock size={12} /> CERRAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
