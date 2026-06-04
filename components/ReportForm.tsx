
import React, { useState, useRef } from 'react';
import { Report, Vehicle } from '../types';
import { compressImage, createMosaic, processImageWithWatermark } from '../utils';
import { X, ClipboardList, Camera, CheckCircle, MapPin, Plus, Trash2, Image as ImageIcon, Loader2, Calendar, Wrench } from 'lucide-react';

interface ReportFormProps {
  onClose: () => void;
  onSubmit: (report: any) => Promise<void>;
  vehicles: Vehicle[];
}

const ReportForm: React.FC<ReportFormProps> = ({ onClose, onSubmit, vehicles }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [plateSearch, setPlateSearch] = useState('');
  const [formData, setFormData] = useState({
    id: `OT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    plate: '',
    source: 'REPORTE OPERATIVO',
    novelty: '',
    initialEvidence: '',
    entryMap: '',
    workshop: '',
    date: new Date().toISOString().split('T')[0],
    workshopDate: new Date().toISOString().split('T')[0]
  });

  const filteredVehicles = React.useMemo(() => {
    let list = [...vehicles];
    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => v.plate.includes(search));
    }
    const sorted = list.sort((a, b) => a.plate.localeCompare(b.plate));
    
    // Auto-select if only one result and not already selected
    if (sorted.length === 1 && formData.plate !== sorted[0].plate && plateSearch.length >= 3) {
      setFormData(prev => ({ ...prev, plate: sorted[0].plate }));
    }
    
    return sorted;
  }, [vehicles, plateSearch, formData.plate]);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!formData.plate) {
      alert("Seleccione la placa antes de capturar la evidencia.");
      return;
    }

    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

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

    for (const file of files) {
      if (capturedPhotos.length >= 4) break;
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `PLACA: ${formData.plate}`, coords, formData.date);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      
      setCapturedPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa antes de capturar la evidencia.");
      return;
    }

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
      if (capturedPhotos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `PLACA: ${formData.plate}`, coords, formData.date);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      
      setCapturedPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.novelty || !formData.workshop || capturedPhotos.length === 0) {
      alert("Por favor complete todos los campos requeridos (placa, taller, descripción y evidencia inicial).");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const mergedInitialEvidence = await createMosaic(capturedPhotos, `NOVEDAD INGRESO: ${formData.plate} - ${formData.date}`);
      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);
      
      // Calcular días en atender
      const reportDate = new Date(formData.date);
      const entryDate = new Date(formData.workshopDate);
      const daysToAttend = Math.max(0, Math.ceil((entryDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)));

      const payload = { 
        ...formData, 
        initialEvidence: mergedInitialEvidence, 
        status: 'PENDIENTES', 
        cd: selectedVehicle?.cd || 'GENERAL',
        contractor: selectedVehicle?.contractor || 'GENERAL',
        daysToAttend
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al enviar el reporte. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡REPORTE CREADO!</h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">Novedad enviada correctamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[70] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-5 sm:p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE NOVEDAD</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Ingreso a Taller</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 bg-white">
          <div className="space-y-1.5">
            <div className="flex justify-between items-end px-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Placa Vehicular</label>
              <input 
                type="text" 
                placeholder="BUSCAR..." 
                className="bg-slate-100 border-none rounded-lg px-2 py-0.5 text-[9px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/30 w-24 transition-all"
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value)}
              />
            </div>
            <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 appearance-none" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })}>
              <option value="">-- {filteredVehicles.length === 0 ? 'SIN RESULTADOS' : 'SELECCIONE'} --</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Fecha Reporte</label>
              <input type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Fecha Ingreso Taller</label>
              <input type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500" value={formData.workshopDate} onChange={e => setFormData({ ...formData, workshopDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Taller</label>
              <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 appearance-none" value={formData.workshop} onChange={e => setFormData({ ...formData, workshop: e.target.value })}>
                <option value="">SELECCIONE TALLER</option>
                {workshops.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Descripción Novedad</label>
              <textarea required rows={2} placeholder="Describa el trabajo a realizar..." className="w-full border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-inner" value={formData.novelty} onChange={e => setFormData({ ...formData, novelty: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center justify-between">
              <span className="flex items-center gap-2"><Camera size={14}/> Evidencia inicial (Max 4)</span>
              <span className="text-[10px] text-slate-400">{capturedPhotos.length} / 4</span>
            </label>
            <div 
              className={`grid grid-cols-2 gap-3 transition-all duration-300 ${isDragging ? 'scale-105 border-indigo-500 bg-indigo-50/20 rounded-xl' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg shadow-lg"><Trash2 size={12} /></button>
                </div>
              ))}
              {capturedPhotos.length < 4 && (
                <button type="button" disabled={!formData.plate || isProcessingPhoto} onClick={() => evidenceInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  <Camera size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir Fotos</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto} className="w-full py-5 bg-[#0f172a] text-white font-black rounded-2xl text-sm uppercase shadow-2xl hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Wrench size={20} />}
            {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR NOVEDAD'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;
