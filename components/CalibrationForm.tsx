
import React, { useState, useRef, useMemo } from 'react';
import { Calibration, Vehicle } from '../types';
import { compressImage, createMosaic, processImageWithWatermark, normalizeStr, getWeekNumber } from '../utils';
import { X, Key, Camera, CheckCircle, MapPin, Plus, Trash2, Loader2, Calendar, Settings2, Clock, ImageIcon, Building2, UserCircle, Disc, Save } from 'lucide-react';

interface CalibrationFormProps {
  onClose: () => void;
  onSubmit: (calibration: any) => Promise<void>;
  vehicles: Vehicle[];
  preSelectedPlate?: string;
  calibrationToUpdate?: Calibration;
}

const CalibrationForm: React.FC<CalibrationFormProps> = ({ onClose, onSubmit, vehicles, preSelectedPlate, calibrationToUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhotoLocal, setIsProcessingPhotoLocal] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  
  const [filterCd, setFilterCd] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');
  const [plateSearch, setPlateSearch] = useState('');

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    plate: calibrationToUpdate?.plate || preSelectedPlate || '',
    taller: calibrationToUpdate?.equipment || '',
    calibrationDate: calibrationToUpdate?.calibrationDate || new Date().toISOString().split('T')[0],
    certificateUrl: '',
  });

  const [isDragging, setIsDragging] = useState(false);

  const isUpdateMode = !!calibrationToUpdate;

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => {
    const filteredByCd = filterCd === 'all' 
      ? vehicles 
      : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(filterCd));
    return Array.from(new Set(filteredByCd.map(v => v.contractor || 'GENERAL'))).sort();
  }, [vehicles, filterCd]);

  const filteredVehicles = useMemo(() => {
    let list = [...vehicles].filter(v => {
      const matchCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchContractor = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      return matchCd && matchContractor;
    });

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
  }, [vehicles, filterCd, filterContractor, plateSearch, formData.plate]);

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
      alert("Seleccione la placa antes de añadir evidencia.");
      return;
    }

    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length === 0) return;

    setIsProcessingPhotoLocal(true);
    
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
      if (!file.type.startsWith('image/')) continue;
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, formData.plate, coords, formData.calibrationDate);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      setCapturedPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    setIsProcessingPhotoLocal(false);
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa antes de capturar la evidencia.");
      return;
    }

    setIsProcessingPhotoLocal(true);
    
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
          const res = await processImageWithWatermark(reader.result as string, formData.plate, coords, formData.calibrationDate);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      setCapturedPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhotoLocal(false);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.taller || capturedPhotos.length === 0) {
      alert("Por favor complete todos los campos y capture evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const mergedEvidence = await createMosaic(capturedPhotos, `CALIBRACIÓN: ${formData.plate} - ${formData.calibrationDate}`);
      
      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);

      const calDate = new Date(formData.calibrationDate + 'T12:00:00');
      const payload = { 
        id: calibrationToUpdate?.id,
        plate: formData.plate,
        taller: formData.taller,
        calibrationDate: formData.calibrationDate,
        originalPlate: calibrationToUpdate?.plate,
        originalDate: calibrationToUpdate?.calibrationDate,
        certificateUrl: mergedEvidence,
        cd: selectedVehicle?.cd || 'GENERAL',
        month: calDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase(),
        week: `SEMANA ${getWeekNumber(calDate)}`,
        estado: 'COMPLETADO',
        isUpdate: isUpdateMode
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al enviar. Verifique su conexión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-indigo-50 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡REGISTRADA!</h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">Sincronizando con Google Sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[70] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-xl my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-5 sm:p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <Disc size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {isUpdateMode ? 'VINCULAR EVIDENCIA' : '🛞 CALIBRACIÓN NEUMÁTICOS'}
              </h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                {isUpdateMode ? `ID: ${calibrationToUpdate.id}` : (preSelectedPlate ? `REPORTE DIRECTO: ${preSelectedPlate}` : 'Compresión de datos activa')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 bg-white">
          {!preSelectedPlate && !isUpdateMode && (
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">C.D.</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase" value={filterCd} onChange={(e) => { setFilterCd(e.target.value); setFilterContractor('all'); setFormData({...formData, plate: ''}); }}>
                  <option value="all">TODOS</option>
                  {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">CONTRATISTA</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase" value={filterContractor} onChange={(e) => { setFilterContractor(e.target.value); setFormData({...formData, plate: ''}); }}>
                  <option value="all">TODOS</option>
                  {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Placa Vehicular</label>
              {!preSelectedPlate && !isUpdateMode && (
                <input 
                  type="text" 
                  placeholder="BUSCAR..." 
                  className="bg-slate-100 border-none rounded-lg px-2 py-0.5 text-[9px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/30 w-24 transition-all"
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                />
              )}
            </div>
            <select 
              required 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-400" 
              value={formData.plate} 
              onChange={e => setFormData({ ...formData, plate: e.target.value })}
              disabled={!!preSelectedPlate || isUpdateMode}
            >
              <option value="">-- {filteredVehicles.length === 0 ? 'SIN RESULTADOS' : 'SELECCIONE'} --</option>
              {preSelectedPlate || isUpdateMode ? (
                <option value={formData.plate}>{formData.plate}</option>
              ) : (
                filteredVehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Taller / Equipo</label>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none disabled:opacity-50 uppercase" 
                value={formData.taller} 
                onChange={e => setFormData({ ...formData, taller: e.target.value })}
              >
                <option value="">-- SELECCIONE --</option>
                <option value="AUTOMUNDIAL">AUTOMUNDIAL</option>
                <option value="GARCILLANTAS">GARCILLANTAS</option>
                <option value="OMNIPOTENTE">OMNIPOTENTE</option>
                <option value="LLANTERIA PATIÑO">LLANTERIA PATIÑO</option>
                {formData.taller && !["AUTOMUNDIAL", "GARCILLANTAS", "OMNIPOTENTE", "LLANTERIA PATIÑO"].includes(formData.taller) && (
                  <option value={formData.taller}>{formData.taller}</option>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Fecha</label>
              <input required type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none disabled:opacity-50" value={formData.calibrationDate} onChange={e => setFormData({ ...formData, calibrationDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Evidencia (Max 4 fotos)</label>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPhotos.length} / 4</span>
            </div>
            
            <div 
              className={`grid grid-cols-2 gap-3 transition-all duration-300 ${isDragging ? 'scale-105 border-indigo-500 bg-indigo-50/50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg"><Trash2 size={12} /></button>
                </div>
              ))}
              {capturedPhotos.length < 4 && (
                <button type="button" disabled={!formData.plate || isProcessingPhotoLocal} onClick={() => evidenceInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  <Camera size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir Fotos</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhotoLocal || capturedPhotos.length === 0} className={`w-full py-6 text-white font-black rounded-[2rem] text-sm uppercase shadow-2xl transition-all flex items-center justify-center gap-4 ${isUpdateMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0f172a] hover:bg-indigo-600'}`}>
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : (isUpdateMode ? <Save size={24} /> : <CheckCircle size={24} />)}
            {isSubmitting ? 'ENVIANDO...' : (isUpdateMode ? 'ACTUALIZAR EVIDENCIA' : 'CONFIRMAR REGISTRO')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CalibrationForm;
