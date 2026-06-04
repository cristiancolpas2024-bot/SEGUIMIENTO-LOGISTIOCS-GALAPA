
import React, { useState, useRef } from 'react';
import { Fine } from '../types';
import { X, Save, Loader2, CheckCircle, FileText, UploadCloud, AlertCircle, Trash2 } from 'lucide-react';

interface FineSupportFormProps {
  fine: Fine;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const FineSupportForm: React.FC<FineSupportFormProps> = ({ fine, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState({ url: '', name: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const file = files[0];
    if (file.type !== 'application/pdf') {
      alert("Por favor, seleccione únicamente archivos en formato PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileData({ url: reader.result as string, name: file.name });
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData.url) {
      alert("Por favor seleccione un archivo PDF.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log("Iniciando envío de soporte PDF...");
      const success = await onSubmit({ 
        ...fine,
        evidenceUrl: fileData.url,
        updateMode: true
      });
      
      console.log("Resultado del envío:", success);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error("Error detallado al actualizar el soporte:", err);
      alert("Error al enviar el soporte. Por favor verifique su conexión e intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]">
        <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={60} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase">¡SOPORTE GUARDADO!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[95] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-md my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-[#0f172a] overflow-hidden">
        <div className="bg-[#0f172a] p-5 sm:p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter leading-none">REGISTRAR SOPORTE</h2>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Multa: {fine.infractionCode}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-[#0f172a] text-white rounded-xl font-mono font-black text-xl">
              {fine.plate}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
              <p className="text-sm font-black text-slate-800 uppercase leading-none">{fine.driverName}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex justify-between items-center">
              <span>EVIDENCIA (SOLO PDF)</span>
              {isProcessing && <Loader2 size={14} className="animate-spin" />}
            </label>
            
            {!fileData.url ? (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full aspect-video border-4 border-dashed rounded-[2rem] bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 flex flex-col items-center justify-center gap-4 transition-all"
              >
                <UploadCloud size={48} />
                <div className="text-center px-2">
                  <p className="text-[11px] font-black uppercase tracking-widest">Seleccionar Archivo PDF</p>
                </div>
              </button>
            ) : (
              <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-xl">
                    <FileText size={24} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-emerald-800 truncate max-w-[180px]">{fileData.name}</p>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase">Documento PDF Cargado</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFileData({ url: '', name: '' })} className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <input 
              type="file" 
              accept="application/pdf" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isProcessing || !fileData.url} 
            className="w-full py-5 bg-[#0f172a] text-white font-black rounded-[2rem] shadow-2xl hover:bg-emerald-600 disabled:opacity-40 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? 'GUARDANDO...' : 'VINCULAR SOPORTE PDF'}
          </button>
          
          <div className="flex items-center gap-2 justify-center text-slate-400 bg-slate-50 py-3 rounded-xl border border-slate-100">
             <AlertCircle size={14} />
             <p className="text-[9px] font-black uppercase">Solo se permite la carga de archivos PDF</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FineSupportForm;
