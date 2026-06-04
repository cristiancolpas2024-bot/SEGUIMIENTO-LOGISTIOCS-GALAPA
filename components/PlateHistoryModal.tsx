
import React from 'react';
import { MileageLog } from '../types';
import { formatDate } from '../utils';
import { X, Gauge, Calendar, Hash, ArrowDownCircle, History, Clock } from 'lucide-react';

interface PlateHistoryModalProps {
  plate: string;
  logs: MileageLog[];
  onClose: () => void;
}

const PlateHistoryModal: React.FC<PlateHistoryModalProps> = ({ plate, logs, onClose }) => {
  const plateLogs = logs
    .filter(log => log.plate.trim().toUpperCase() === plate.trim().toUpperCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 border-[6px] border-indigo-600/20">
        
        {/* Header */}
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <History size={24} />
            </div>
            <div>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-1">Historial de Registros</p>
              <h2 className="text-3xl font-mono font-black tracking-tighter uppercase">{plate}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-red-500 hover:text-white rounded-xl transition-all"
          >
            <X size={24} />
          </button>
          
          {/* Accent decoration */}
          <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
            <Gauge size={120} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-8 bg-slate-50">
          {plateLogs.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros encontrados: {plateLogs.length}</span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-tight">Orden: Más Reciente</span>
              </div>
              
              <div className="space-y-3">
                {plateLogs.map((log, index) => {
                  const prevLog = plateLogs[index + 1];
                  const diff = prevLog ? log.mileage - prevLog.mileage : 0;

                  return (
                    <div key={index} className="bg-white p-6 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <Calendar size={18} />
                          </div>
                          {index < plateLogs.length - 1 && (
                            <div className="w-0.5 h-8 bg-slate-100 mt-1"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Registro</p>
                          <p className="text-sm font-black text-slate-800 uppercase leading-none">{formatDate(log.date)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-indigo-600 mb-1">
                          <Hash size={14} className="opacity-50" />
                          <span className="text-2xl font-black tracking-tighter">{log.mileage.toLocaleString()}</span>
                          <span className="text-[10px] font-black uppercase">KM</span>
                        </div>
                        {diff > 0 && (
                          <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-tight">
                            <ArrowDownCircle size={10} className="rotate-180" /> Recorrido: +{diff.toLocaleString()} KM
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <div className="p-8 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 mb-6 opacity-40">
                <Clock size={64} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Sin registros históricos</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2 max-w-[250px]">No se han encontrado entradas de kilometraje para este vehículo en la base de datos.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-white flex justify-center">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
          >
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlateHistoryModal;
