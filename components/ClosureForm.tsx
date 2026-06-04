
import React, { useState, useRef, useEffect } from 'react';
import { Report } from '../types';
import { compressImage, createMosaic, processImageWithWatermark } from '../utils';
import { X, CheckCircle, Camera, MapPin, Wrench, Trash2, Plus, Loader2, ImageIcon, Image as ImageIconLucide } from 'lucide-react';

interface ClosureFormProps {
  report: Report;
  onClose: () => void;
  onSubmit: (reportId: string, closureData: Partial<Report>) => Promise<void>;
}

const ClosureForm: React.FC<ClosureFormProps> = ({ report, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  const solutionInputRef = useRef<HTMLInputElement>(null);
  const mapEntryInputRef = useRef<HTMLInputElement>(null);
  const mapExitInputRef = useRef<HTMLInputElement>(null);
  
  const [solutionPhotos, setSolutionPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    closureDate: new Date().toISOString().split('T')[0],
    entryMap: report.entryMap || '',
    exitMap: '',
    daysInShop: 0
  });

  const workshops = [
    "AUTECO",
    "AUTOMUNDIAL",
    "CAMION COLOMBIA",
    "COUNTRY MOTORS",
    "DIVERMOTORS",
    "GARCILLANTAS",
    "ROINCOR",
    "TECNIBENZ",
    "TODOFIBRAS",
    "TRAMICON",
    "VEHIPESA",
    "COEXITO",
    "ETM",
    "NAVISAFT",
    "NAVITRANS",
    "OTROS",
    "GLASS LAMINADO",
    "COUNTRY TRUCK",
    "ELECTRONIC",
    "IVESUR"
  ];

  useEffect(() => {
    const start = new Date(report.workshopDate || report.date);
    const end = new Date(formData.closureDate);
    const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    setFormData(prev => ({ ...prev, daysInShop: diff }));
  }, [formData.closureDate, report.workshopDate, report.date]);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsProcessingPhoto(true);
    
    const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(undefined),
          { timeout: 5000 }
        );
      });
    };

    const coords = await getCoords();

    for (let i = 0; i < files.length; i++) {
      if (solutionPhotos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `${report.plate} - SOLUCIÓN FINAL`, coords, formData.closureDate);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      setSolutionPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
    if (e.target) e.target.value = "";
  };

  const handleMapEntryCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920);
        setFormData(prev => ({ ...prev, entryMap: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMapCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920);
        setFormData(prev => ({ ...prev, exitMap: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setSolutionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (solutionPhotos.length === 0 || !formData.entryMap || !formData.exitMap) {
      alert("Por favor cargue la evidencia final, el mapa de ingreso y el mapa de salida.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const solutionMosaic = await createMosaic(solutionPhotos, `SOLUCIÓN FINAL: ${report.plate}`);
      
      const closurePayload = {
        ...formData,
        solutionEvidence: solutionMosaic,
        status: 'COMPLETADOS' as const
      };
      
      await onSubmit(report.id, closurePayload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al procesar el cierre. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const isClosing = solutionPhotos.length > 0;
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
            {isClosing ? '¡NOVEDAD COMPLETADA!' : '¡NOVEDAD ACTUALIZADA!'}
          </h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">
            {isClosing ? 'Sincronizando salida de flota...' : 'Guardando cambios en el proceso...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[70] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-emerald-600 overflow-hidden animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="bg-emerald-600 p-5 sm:p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">ORDEN DE SALIDA: {report.plate}</h2>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">Validación técnica y fotográfica</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-8 bg-white">
          
          {/* DATOS DE TIEMPO */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha de Cierre</label>
              <input required type="date" className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-emerald-500" value={formData.closureDate} onChange={e => setFormData({ ...formData, closureDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Días en Taller</label>
              <div className="w-full bg-emerald-500 text-white border-2 border-emerald-400 rounded-xl px-4 py-3 text-sm font-black text-center shadow-lg">
                {formData.daysInShop} DÍAS
              </div>
            </div>
          </div>

          {/* EVIDENCIA FINAL */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <Camera size={16} /> Evidencia final (Max 4) *
              </label>
              <span className="text-[10px] font-black text-slate-300">{solutionPhotos.length} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-emerald-50/30 p-4 rounded-2xl border-2 border-dashed border-emerald-200">
              {solutionPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-md border-2 border-white group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                </div>
              ))}
              {solutionPhotos.length < 4 && (
                <button type="button" disabled={isProcessingPhoto} onClick={() => solutionInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-emerald-300 bg-white flex items-center justify-center text-emerald-300 hover:border-emerald-500 hover:text-emerald-600 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={solutionInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          {/* MAPAS DE INGRESO Y SALIDA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MAPA DE INGRESO */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
                <MapPin size={16} /> Mapa de ingreso de taller *
              </label>
              <button type="button" onClick={() => mapEntryInputRef.current?.click()} className={`w-full py-5 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${formData.entryMap ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <ImageIconLucide size={24} /> 
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.entryMap ? 'MAPA INGRESO CAPTURADO ✓' : 'SELECCIONAR EL MAPA'}</span>
              </button>
              <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" ref={mapEntryInputRef} className="hidden" onChange={handleMapEntryCapture} />
            </div>

            {/* MAPA DE SALIDA */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
                <MapPin size={16} /> Mapa de salida de taller *
              </label>
              <button type="button" onClick={() => mapExitInputRef.current?.click()} className={`w-full py-5 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${formData.exitMap ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <ImageIconLucide size={24} /> 
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.exitMap ? 'MAPA SALIDA CAPTURADO ✓' : 'SELECCIONAR EL MAPA'}</span>
              </button>
              <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" ref={mapExitInputRef} className="hidden" onChange={handleMapCapture} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />}
            {isSubmitting ? 'CERRANDO...' : 'CONFIRMAR CIERRE'}
          </button>
          
          {isProcessingPhoto && (
            <div className="text-center animate-pulse">
               <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">Estampando Placa y GPS en evidencia...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ClosureForm;
