
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, MapPin, Plus, Trash2, Loader2, CheckCircle, Image as ImageIconLucide } from 'lucide-react';
import { Report } from '../types';
import { processImageWithWatermark } from '../utils';

interface WorkshopEntryFormProps {
  report: Report;
  onClose: () => void;
  onSubmit: (data: Partial<Report>) => Promise<void>;
}

const WorkshopEntryForm: React.FC<WorkshopEntryFormProps> = ({ report, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    workshopDate: new Date().toISOString().split('T')[0],
    workshop: report.workshop || '',
    otherWorkshop: ''
  });

  const initialInputRef = useRef<HTMLInputElement>(null);

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
      if (initialPhotos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `${report.plate} - INGRESO TALLER`, coords, formData.workshopDate);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      setInitialPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
    if (e.target) e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setInitialPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialPhotos.length === 0) {
      alert('Debe añadir al menos una foto de evidencia inicial.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalWorkshop = formData.workshop === 'OTROS' ? formData.otherWorkshop : formData.workshop;
      
      // Calcular días en atender: Fecha ingreso taller - Fecha reporte
      const reportDate = new Date(report.date);
      const entryDate = new Date(formData.workshopDate);
      const daysToAttend = Math.max(0, Math.ceil((entryDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)));

      await onSubmit({
        workshopDate: formData.workshopDate,
        initialEvidence: initialPhotos[0],
        workshop: finalWorkshop,
        daysToAttend,
        status: 'PENDIENTES'
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al registrar ingreso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] my-4 sm:my-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-[#0f172a] p-5 sm:p-8 text-white flex justify-between items-center relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <MapPin size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">INGRESO A TALLER</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{report.plate} - FORMULARIO 1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-rose-500 rounded-2xl transition-all relative z-10"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-8 bg-white">
          
          {/* FECHA INGRESO */}
          <div className="space-y-1.5 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha de Ingreso a Taller *</label>
            <input required type="date" className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500" value={formData.workshopDate} onChange={e => setFormData({ ...formData, workshopDate: e.target.value })} />
          </div>

          {/* EVIDENCIA INICIAL */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                <Camera size={16} /> Evidencia inicial (Max 4) *
              </label>
              <span className="text-[10px] font-black text-slate-300">{initialPhotos.length} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-indigo-50/30 p-4 rounded-2xl border-2 border-dashed border-indigo-200">
              {initialPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-md border-2 border-white group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                </div>
              ))}
              {initialPhotos.length < 4 && (
                <button type="button" disabled={isProcessingPhoto} onClick={() => initialInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-indigo-300 bg-white flex items-center justify-center text-indigo-300 hover:border-indigo-500 hover:text-indigo-600 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={initialInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          {/* TALLER */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Taller Responsable *</label>
              <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 appearance-none" value={formData.workshop} onChange={e => setFormData({ ...formData, workshop: e.target.value })}>
                <option value="">SELECCIONE TALLER</option>
                {workshops.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            {formData.workshop === 'OTROS' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-black text-amber-600 uppercase tracking-widest px-1">Especifique Taller *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="NOMBRE DEL TALLER..." 
                  className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-amber-500 shadow-inner" 
                  value={formData.otherWorkshop} 
                  onChange={e => setFormData({ ...formData, otherWorkshop: e.target.value.toUpperCase() })} 
                />
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />}
            {isSubmitting ? 'REGISTRANDO...' : 'CONFIRMAR INGRESO'}
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

export default WorkshopEntryForm;
