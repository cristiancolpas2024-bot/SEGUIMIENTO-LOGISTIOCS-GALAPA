
import React, { useState, useRef, useMemo } from 'react';
import { Vehicle } from '../types';
import { createMosaic, processImageWithWatermark, normalizeStr, getWeekNumber } from '../utils';
import { X, Camera, Save, Plus, Trash2, Loader2, Sparkles, Building2, AlertCircle, Calendar, Image as ImageIcon } from 'lucide-react';

interface CleaningFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  preSelectedPlate?: string;
  initialDate?: string;
}

const CleaningForm: React.FC<CleaningFormProps> = ({ vehicles, onClose, onSubmit, preSelectedPlate, initialDate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDraggingInitial, setIsDraggingInitial] = useState(false);
  const [isDraggingFinal, setIsDraggingFinal] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [filterCd, setFilterCd] = useState<string>('all');
  const [plateSearch, setPlateSearch] = useState('');
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const [finalPhotos, setFinalPhotos] = useState<string[]>([]);
  const [activeCaptureType, setActiveCaptureType] = useState<'INICIAL' | 'FINAL' | null>(null);
  
  const [formData, setFormData] = useState({
    plate: preSelectedPlate || '',
    date: initialDate || new Date().toISOString().split('T')[0],
  });

  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return (unique as string[]).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehiclesList = useMemo(() => {
    let list = [...vehicles].filter(v => {
      const vCd = (v.cd || "GENERAL").toUpperCase().trim();
      const matchCd = filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
      return matchCd;
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
  }, [vehicles, filterCd, plateSearch, formData.plate]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  const handleDragOver = (e: React.DragEvent, type: 'INICIAL' | 'FINAL') => {
    e.preventDefault();
    if (type === 'INICIAL') setIsDraggingInitial(true);
    else setIsDraggingFinal(true);
  };

  const handleDragLeave = (e: React.DragEvent, type: 'INICIAL' | 'FINAL') => {
    e.preventDefault();
    if (type === 'INICIAL') setIsDraggingInitial(false);
    else setIsDraggingFinal(false);
  };

  const handleDrop = async (e: React.DragEvent, type: 'INICIAL' | 'FINAL') => {
    e.preventDefault();
    setIsDraggingInitial(false);
    setIsDraggingFinal(false);
    
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
      const currentPhotos = type === 'INICIAL' ? initialPhotos : finalPhotos;
      if (currentPhotos.length >= 4) break;
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords, formData.date);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      if (type === 'INICIAL') {
        setInitialPhotos(prev => [...prev, watermarked].slice(0, 4));
      } else {
        setFinalPhotos(prev => [...prev, watermarked].slice(0, 4));
      }
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
      const currentPhotos = activeCaptureType === 'INICIAL' ? initialPhotos : finalPhotos;
      if (currentPhotos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords, formData.date);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      if (activeCaptureType === 'INICIAL') {
        setInitialPhotos(prev => [...prev, watermarked].slice(0, 4));
      } else {
        setFinalPhotos(prev => [...prev, watermarked].slice(0, 4));
      }
    }
    
    setIsProcessingPhoto(false);
    setActiveCaptureType(null);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const startCapture = (type: 'INICIAL' | 'FINAL') => {
    setActiveCaptureType(type);
    evidenceInputRef.current?.click();
  };

  const removePhoto = (type: 'INICIAL' | 'FINAL', index: number) => {
    if (type === 'INICIAL') {
      setInitialPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setFinalPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || initialPhotos.length === 0 || finalPhotos.length === 0) {
      alert("Por favor complete todos los campos: Placa, al menos una foto INICIAL y al menos una foto FINAL.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dateObj = new Date(formData.date + "T12:00:00");
      const month = dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const week = getWeekNumber(dateObj).toString();

      // Create collages
      const initialCollage = await createMosaic(initialPhotos, `LIMPIEZA: ${formData.plate}`);
      const finalCollage = await createMosaic(finalPhotos, `LIMPIEZA: ${formData.plate}`);

      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);

      const payload = {
        ...formData,
        id: `CLEAN-${Date.now()}`,
        month,
        week,
        initialEvidence: initialCollage,
        finalEvidence: finalCollage,
        cd: selectedVehicle?.cd || 'GENERAL',
        contractor: selectedVehicle?.contractor || 'GENERAL',
        status: 'COMPLETADO'
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al registrar la limpieza. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[95] p-4">
        <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 flex flex-col items-center text-center max-w-sm border-4 border-cyan-500 shadow-2xl animate-in zoom-in duration-300">
          <Sparkles size={64} className="text-cyan-500 mb-4 animate-bounce" />
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">¡REGISTRO EXITOSO!</h2>
          <p className="text-cyan-600 font-bold text-[10px] uppercase tracking-widest mt-4">Evidencia enviada correctamente</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-[90] p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] w-full max-w-lg my-4 sm:my-8 shadow-2xl border-[4px] sm:border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-5 sm:p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-cyan-500 rounded-xl sm:rounded-2xl shadow-lg">
              <ImageIcon size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-tighter">REGISTRO DE LIMPIEZA</h2>
              <p className="text-[8px] sm:text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Control Operativo de Flota</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 bg-white/10 hover:bg-rose-500 hover:scale-105 active:scale-95 rounded-xl transition-all"
            title="Cerrar"
          >
            <X size={20} className="sm:w-7 sm:h-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 bg-white">
          
          {!preSelectedPlate && (
            <div className="bg-cyan-50/40 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-cyan-100/50 shadow-inner">
                <div className="space-y-1.5">
                <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <Building2 size={12} className="text-cyan-600" /> FILTRAR POR CENTRO (C.D.)
                </label>
                <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-[10px] sm:text-[11px] font-black uppercase outline-none focus:border-cyan-500 transition-all shadow-sm" 
                    value={filterCd} 
                    onChange={(e) => handleCdChange(e.target.value)}
                >
                    <option value="all">-- TODOS LOS CENTROS --</option>
                    {availableCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                </select>
                </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-end px-1 sm:px-2">
                <label className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest">UNIDAD VEHICULAR (PLACA)</label>
                {!preSelectedPlate && (
                  <input 
                    type="text" 
                    placeholder="BUSCAR..." 
                    className="bg-slate-100 border-none rounded-lg px-2 py-1 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:ring-2 ring-cyan-500/30 w-24 sm:w-32 transition-all shadow-inner"
                    value={plateSearch}
                    onChange={(e) => setPlateSearch(e.target.value)}
                  />
                )}
              </div>
              <select 
                required 
                className={`w-full bg-slate-50 border-2 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm font-black text-slate-800 outline-none appearance-none shadow-inner transition-all ${filteredVehiclesList.length === 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
                disabled={!!preSelectedPlate}
              >
                <option value="">{filteredVehiclesList.length === 0 ? '-- SIN VEHÍCULOS --' : '-- SELECCIONE PLACA --'}</option>
                {preSelectedPlate ? (
                    <option value={preSelectedPlate}>{preSelectedPlate}</option>
                ) : (
                    filteredVehiclesList.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 sm:px-2 flex items-center gap-2">
                <Calendar size={14} className="text-cyan-600" /> FECHA DE LIMPIEZA
              </label>
              <input 
                required 
                type="date" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm font-black text-slate-800 outline-none shadow-inner" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 sm:px-2">
              <span className="text-[10px] sm:text-[11px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={16} /> EVIDENCIA FOTOGRÁFICA
              </span>
              {isProcessingPhoto && <span className="text-amber-500 text-[8px] sm:text-[9px] font-black animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> PROCESANDO...</span>}
            </div>
            
            <div className="space-y-4">
              {/* Sección INICIAL */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">EVIDENCIA INICIAL ({initialPhotos.length}/4)</p>
                  {initialPhotos.length < 4 && (
                    <button 
                      type="button" 
                      onClick={() => startCapture('INICIAL')}
                      className="text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                <div 
                  className={`grid grid-cols-4 gap-1.5 sm:gap-2 transition-all duration-300 ${isDraggingInitial ? 'scale-105 bg-cyan-50 border border-cyan-400 rounded-xl p-1' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'INICIAL')}
                  onDragLeave={(e) => handleDragLeave(e, 'INICIAL')}
                  onDrop={(e) => handleDrop(e, 'INICIAL')}
                >
                  {initialPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <img src={photo} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto('INICIAL', idx)} 
                        className="absolute top-0.5 right-0.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded shadow-lg transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {initialPhotos.length < 4 && (
                    <button 
                      type="button" 
                      disabled={!formData.plate || isProcessingPhoto} 
                      onClick={() => startCapture('INICIAL')} 
                      className="aspect-square rounded-xl border flex flex-col items-center justify-center text-slate-300 border-dashed border-slate-300 bg-slate-50 hover:border-cyan-400 hover:text-cyan-400 transition-all disabled:opacity-40"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sección FINAL */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">EVIDENCIA FINAL ({finalPhotos.length}/4)</p>
                  {finalPhotos.length < 4 && (
                    <button 
                      type="button" 
                      onClick={() => startCapture('FINAL')}
                      className="text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                <div 
                  className={`grid grid-cols-4 gap-1.5 sm:gap-2 transition-all duration-300 ${isDraggingFinal ? 'scale-105 bg-cyan-50 border border-cyan-400 rounded-xl p-1' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'FINAL')}
                  onDragLeave={(e) => handleDragLeave(e, 'FINAL')}
                  onDrop={(e) => handleDrop(e, 'FINAL')}
                >
                  {finalPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <img src={photo} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto('FINAL', idx)} 
                        className="absolute top-0.5 right-0.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded shadow-lg transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {finalPhotos.length < 4 && (
                    <button 
                      type="button" 
                      disabled={!formData.plate || isProcessingPhoto} 
                      onClick={() => startCapture('FINAL')} 
                      className="aspect-square rounded-xl border flex flex-col items-center justify-center text-slate-300 border-dashed border-slate-300 bg-slate-50 hover:border-cyan-400 hover:text-cyan-400 transition-all disabled:opacity-40"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold rounded-xl sm:rounded-2xl text-[10px] sm:text-xs uppercase tracking-wider transition-all border border-slate-200"
            >
              CANCELAR
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || isProcessingPhoto || initialPhotos.length === 0 || finalPhotos.length === 0} 
              className="py-3.5 sm:py-4 bg-[#0f172a] hover:bg-cyan-600 active:scale-95 text-white font-black rounded-xl sm:rounded-2xl text-[10px] sm:text-xs uppercase shadow-lg disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CleaningForm;
