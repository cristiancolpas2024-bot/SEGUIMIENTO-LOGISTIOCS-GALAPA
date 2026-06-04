
import React, { useState, useRef } from 'react';
import { Report } from '../types';
import { createMosaic, processImageWithWatermark } from '../utils';
import { X, CheckCircle, Camera, Store, Calendar, Loader2, Save, Trash2 } from 'lucide-react';

interface WorkshopVisitClosureFormProps {
  visit: Report;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const WorkshopVisitClosureForm: React.FC<WorkshopVisitClosureFormProps> = ({ visit, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    workshop: visit.workshop || '',
    otherWorkshop: '',
    visitDate: new Date().toISOString().split('T')[0],
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

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsProcessingPhoto(true);
    const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(undefined), { timeout: 5000 }
        );
      });
    };

    const coords = await getCoords();

    for (let i = 0; i < files.length; i++) {
      if (capturedPhotos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `SUP.: ${visit.plate} - VISITA`, coords, formData.visitDate);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      
      setCapturedPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
    if (e.target) e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workshop || capturedPhotos.length === 0) {
      alert("Por favor complete el Taller y la Evidencia Fotográfica.");
      return;
    }

    setIsSubmitting(true);
    try {
      const mosaic = await createMosaic(capturedPhotos, `VISITA TALLER: ${visit.plate} - ${formData.visitDate}`);
      await onSubmit({
        id: visit.id, // Columna H (Hash)
        plate: visit.plate,
        workshop: formData.workshop === 'OTROS' ? formData.otherWorkshop : formData.workshop,
        visitDate: formData.visitDate,
        progDate: visit.date, // Fecha original de programación para búsqueda fallback
        evidence: mosaic,
        status: 'COMPLETADOS'
      });
      onClose();
    } catch (error) {
      alert("Error al cerrar la visita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-indigo-600 overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <CheckCircle size={24} />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">CERRAR VISITA: {visit.plate}</h2>
              <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">Actualización de Programación</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            {/* TALLER */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Store size={12} className="text-indigo-600"/> ASIGNAR TALLER (COL D)
                </label>
                <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-indigo-500"
                  value={formData.workshop} onChange={e => setFormData({...formData, workshop: e.target.value})}>
                  <option value="">-- SELECCIONE TALLER --</option>
                  {workshops.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              {formData.workshop === 'OTROS' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Especifique Taller *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="NOMBRE DEL TALLER..." 
                    className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-amber-500 shadow-inner" 
                    value={formData.otherWorkshop} 
                    onChange={e => setFormData({ ...formData, otherWorkshop: e.target.value.toUpperCase() })} 
                  />
                </div>
              )}
            </div>

            {/* FECHA DE VISITA */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <Calendar size={12} className="text-indigo-600"/> FECHA DE VISITA (COL E)
              </label>
              <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-indigo-500"
                value={formData.visitDate} onChange={e => setFormData({...formData, visitDate: e.target.value})} />
            </div>
          </div>

          {/* EVIDENCIA FOTO */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center justify-between">
              EVIDENCIA FOTOGRÁFICA (COL F)
              <span className="text-slate-400">{capturedPhotos.length}/4</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {capturedPhotos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-100">
                  <img src={p} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCapturedPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-md"><Trash2 size={10}/></button>
                </div>
              ))}
              {capturedPhotos.length < 4 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all">
                  <Camera size={20} />
                  <span className="text-[8px] font-black mt-1 uppercase">Foto</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={fileInputRef} className="hidden" onChange={handleCapture} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting ? 'ACTUALIZANDO...' : 'CONFIRMAR Y FINALIZAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WorkshopVisitClosureForm;
