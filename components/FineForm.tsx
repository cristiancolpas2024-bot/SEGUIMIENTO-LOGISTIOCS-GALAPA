
import React, { useState, useRef, useMemo } from 'react';
import { Vehicle, Driver } from '../types';
import { processImageWithWatermark, createMosaic } from '../utils';
import { X, Gavel, Camera, Save, Loader2, CheckCircle, User, FileSignature, AlertCircle, FileText, UploadCloud, Trash2 } from 'lucide-react';

interface FineFormProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const FineForm: React.FC<FineFormProps> = ({ vehicles, drivers, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [plateSearch, setPlateSearch] = useState('');
  const [formData, setFormData] = useState({
    plate: '',
    driverId: '',
    date: new Date().toISOString().split('T')[0],
    infractionCode: '',
    description: '',
    amount: '',
    status: 'PENDIENTE',
    paymentAgreement: 'NO',
    evidenceUrl: '',
    fileName: ''
  });

  const availableDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers]);

  const filteredVehicles = useMemo(() => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !formData.plate || !files.length) {
      if (!formData.plate) alert("Seleccione la placa primero.");
      return;
    }

    setIsProcessingFile(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type === 'application/pdf') {
        // Si es PDF, solo aceptamos uno y limpiamos las fotos
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, evidenceUrl: reader.result as string, fileName: file.name }));
          setPhotos([]);
          setIsProcessingFile(false);
        };
        reader.readAsDataURL(file);
        return; // Salimos porque PDF es exclusivo
      } else if (file.type.startsWith('image/')) {
        if (photos.length + i >= 4) break;
        
        const watermarked = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const res = await processImageWithWatermark(reader.result as string, `MULTA: ${formData.plate}`, undefined, formData.date);
            resolve(res);
          };
          reader.readAsDataURL(file);
        });
        
        setPhotos(prev => [...prev, watermarked].slice(0, 4));
        setFormData(prev => ({ ...prev, evidenceUrl: '', fileName: 'FOTOS CAPTURADAS' }));
      }
    }
    
    setIsProcessingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.driverId) {
      alert("Por favor complete Placa y Conductor responsable.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalEvidence = formData.evidenceUrl;
      if (photos.length > 0) {
        finalEvidence = await createMosaic(photos);
      }

      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);
      const selectedDriver = drivers.find(d => d.identification === formData.driverId);
      
      const payload = { 
        ...formData, 
        evidenceUrl: finalEvidence,
        id: `FINE-${Date.now()}`, 
        amount: parseFloat(formData.amount) || 0,
        cd: selectedVehicle?.cd || 'GENERAL',
        contractor: selectedVehicle?.contractor || 'GENERAL',
        driverName: selectedDriver?.name || 'DESCONOCIDO',
        driverId: selectedDriver?.identification || formData.driverId,
        driverPosition: selectedDriver?.position || 'CONDUCTOR'
      };

      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert("Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
        <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-rose-500 shadow-2xl">
          <CheckCircle size={60} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase">¡MULTA REGISTRADA!</h2>
        </div>
      </div>
    );
  }

  const isPdf = formData.evidenceUrl.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[90] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-[#0f172a] overflow-hidden">
        <div className="bg-[#0f172a] p-5 sm:p-8 text-white flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE COMPARENDO</h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Placa</label>
                <input 
                  type="text" 
                  placeholder="BUSCAR..." 
                  className="bg-slate-100 border-none rounded-lg px-2 py-0.5 text-[8px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/30 w-16 transition-all"
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                />
              </div>
              <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" 
                value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })}>
                <option value="">-- {filteredVehicles.length === 0 ? 'SIN RESULTADOS' : 'PLACA'} --</option>
                {filteredVehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fecha Infracción</label>
              <input required type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><User size={12}/> Conductor Responsable</label>
             <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-xs uppercase" 
                value={formData.driverId} onChange={e => setFormData({ ...formData, driverId: e.target.value })}>
                <option value="">-- SELECCIONE CONDUCTOR --</option>
                {availableDrivers.map(d => <option key={d.id} value={d.identification}>{d.name}</option>)}
             </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Código</label>
              <input required type="text" placeholder="Ej: C02" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" value={formData.infractionCode} onChange={e => setFormData({ ...formData, infractionCode: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Valor ($)</label>
              <input required type="number" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1"><FileSignature size={12}/> Acuerdo de Pago</label>
               <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm uppercase" 
                  value={formData.paymentAgreement} onChange={e => setFormData({ ...formData, paymentAgreement: e.target.value })}>
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Estado Multa</label>
               <div className="px-4 py-3 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-2xl text-xs font-black text-center uppercase">
                  {formData.status}
               </div>
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Concepto / Descripción</label>
            <textarea required rows={2} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value.toUpperCase() })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 flex justify-between">
              <span>Soporte (PDF o Fotos Max 4)</span>
              {isProcessingFile && <Loader2 size={12} className="animate-spin" />}
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100">
                  <img src={p} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg"><Trash2 size={12} /></button>
                </div>
              ))}
              {photos.length < 4 && !formData.evidenceUrl.startsWith('data:application/pdf') && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full aspect-square border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all ${photos.length > 0 ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400'}`}>
                  <UploadCloud size={24} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-center px-2">
                    {photos.length > 0 ? 'Añadir Foto' : 'Subir PDF o Fotos'}
                  </span>
                </button>
              )}
            </div>

            {formData.evidenceUrl.startsWith('data:application/pdf') && (
              <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-emerald-600" />
                  <span className="text-[10px] font-black uppercase text-emerald-700 truncate max-w-[150px]">{formData.fileName}</span>
                </div>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, evidenceUrl: '', fileName: '' }))} className="p-1.5 bg-rose-500 text-white rounded-lg"><Trash2 size={12} /></button>
              </div>
            )}

            <input type="file" accept="application/pdf,image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingFile} className="w-full py-5 bg-[#0f172a] text-white font-black rounded-[2rem] shadow-2xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3 active:scale-95">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? 'REGISTRANDO...' : 'GUARDAR MULTA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FineForm;
