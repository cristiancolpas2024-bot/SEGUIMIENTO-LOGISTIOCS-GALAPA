
import React, { useState, useRef } from 'react';
import { Vehicle } from '../types';
import { compressImage, processImageWithWatermark, createMosaic } from '../utils';
import { X, ShieldCheck, Camera, CheckCircle, Save, Loader2, Calendar, FileText, Flame, Trash2 } from 'lucide-react';

interface DocumentUpdateFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const DocumentUpdateForm: React.FC<DocumentUpdateFormProps> = ({ vehicles, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    plate: '',
    type: 'SOAT',
    expiryDate: '',
    cd: ''
  });

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !formData.plate || !files.length) {
      if (!formData.plate) alert("Seleccione la placa primero.");
      return;
    }
    setIsProcessing(true);
    
    for (let i = 0; i < files.length; i++) {
      if (photos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, formData.plate, undefined, new Date().toISOString().split('T')[0]);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      
      setPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.expiryDate || photos.length === 0) {
      alert("Complete todos los campos y tome la foto del soporte.");
      return;
    }
    setIsSubmitting(true);
    try {
      const mergedEvidence = await createMosaic(photos);
      await onSubmit({ ...formData, url: mergedEvidence });
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert("Error al enviar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
        <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={60} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase">¡DOCUMENTO REGISTRADO!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[80] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] w-full max-w-lg my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-[#0f172a] overflow-hidden">
        <div className="bg-[#0f172a] p-5 sm:p-8 text-white flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE VENCIMIENTO</h2>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-rose-500"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Placa</label>
            <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 font-black" 
              value={formData.plate} 
              onChange={e => {
                const v = vehicles.find(v => v.plate === e.target.value);
                setFormData({ ...formData, plate: e.target.value, cd: v?.cd || '' });
              }}>
              <option value="">-- SELECCIONE --</option>
              {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Documento</label>
              <select className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 font-black" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                <option value="SOAT">SOAT</option>
                <option value="RTM">RTM (TECNOMECÁNICA)</option>
                <option value="EXTINTOR">EXTINTOR</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Vencimiento</label>
              <input required type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 font-black" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-between px-1">
              <span>Soporte Fotográfico (Max 4)</span>
              <span className="text-[10px] text-slate-400">{photos.length} / 4</span>
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                  <img src={p} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-transform"><Trash2 size={12} /></button>
                </div>
              ))}
              {photos.length < 4 && (
                <button type="button" disabled={!formData.plate || isProcessing} onClick={() => fileInputRef.current?.click()} className={`w-full aspect-square border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600`}>
                  <Camera size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir Foto</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={fileInputRef} className="hidden" onChange={handleCapture} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessing || photos.length === 0} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2rem] shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? 'REGISTRANDO...' : 'GUARDAR SEGUIMIENTO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DocumentUpdateForm;
