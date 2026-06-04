import React, { useState, useMemo } from 'react';
import { Corrective } from '../types';
import { Search, Filter, Wrench, Calendar, MapPin, Building2, AlertCircle, Camera, X, Image as ImageIcon, Upload, CheckCircle2, Loader2, Maximize2 } from 'lucide-react';
import { submitCorrectiveUpdateToSheet } from '../services/sheetService';

const getDirectDriveUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
    if (idMatch) {
      // El endpoint de thumbnail es extremadamente fiable para previsualizaciones
      // y evita muchos problemas de CORS y Referrer
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
    }
  }
  return url;
};

const getOriginalDriveUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
    if (idMatch) {
      return `https://drive.google.com/file/d/${idMatch[1]}/view`;
    }
  }
  return url;
};

interface CorrectivesModuleProps {
  data: Corrective[];
  onRefresh?: () => void;
}

const CorrectivesModule: React.FC<CorrectivesModuleProps> = ({ data, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedCD, setSelectedCD] = useState('TODOS');
  const [selectedContractor, setSelectedContractor] = useState('TODOS');
  const [selectedCorrective, setSelectedCorrective] = useState<Corrective | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempEvidences, setTempEvidences] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const cds = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.cd).filter(Boolean))).sort()], [data]);
  const contractors = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.contractor).filter(Boolean))).sort()], [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.system.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.novelty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.workshop.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCD = selectedCD === 'TODOS' || item.cd === selectedCD;
      const matchesContractor = selectedContractor === 'TODOS' || item.contractor === selectedContractor;
      const matchesDate = !selectedDate || item.date === selectedDate;

      return matchesSearch && matchesCD && matchesContractor && matchesDate;
    });
  }, [data, searchTerm, selectedCD, selectedContractor, selectedDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - tempEvidences.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempEvidences(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (index: number) => {
    setTempEvidences(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitEvidences = async () => {
    if (!selectedCorrective) return;
    setIsUploading(true);
    try {
      const result = await submitCorrectiveUpdateToSheet({
        plate: selectedCorrective.plate,
        date: selectedCorrective.date,
        evidence1: tempEvidences[0] || '',
        evidence2: tempEvidences[1] || '',
        evidence3: tempEvidences[2] || '',
        evidence4: tempEvidences[3] || ''
      });
      
      if (result.success) {
        setSelectedCorrective(null);
        setTempEvidences([]);
        if (onRefresh) onRefresh();
      } else {
        alert(result.message || "No se pudo registrar la evidencia. Verifique que la placa y fecha coincidan exactamente en la hoja de cálculo.");
      }
    } catch (error) {
      console.error("Error al subir evidencias:", error);
      alert("Error técnico al subir evidencias.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <Wrench className="text-emerald-600" size={28} />
            Programación Diaria
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Gestión de Novedades y Salidas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar placa, sistema, novedad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer uppercase tracking-wider"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedCD}
              onChange={(e) => setSelectedCD(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer uppercase tracking-wider"
            >
              {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer uppercase tracking-wider"
            >
              {contractors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Fecha Prog.</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Placa</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">CD / Contratista</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Sistema / Novedad</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Estado / Salida</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Evidencias</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Calendar size={14} className="text-slate-400" />
                        {item.date}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-700 uppercase tracking-widest border border-slate-200">
                        {item.plate}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <MapPin size={12} className="text-slate-400" />
                          {item.cd}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Building2 size={12} className="text-slate-400" />
                          {item.contractor}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {item.system}
                        </span>
                        <div className="flex items-start gap-2">
                          <AlertCircle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-600 font-medium line-clamp-1" title={item.novelty}>
                            {item.novelty}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                          {item.workshop}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${
                          item.status.toUpperCase() === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : 
                          item.status.toUpperCase() === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status || 'SIN ESTADO'}
                        </span>
                        {item.exitDate && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                            <Calendar size={10} />
                            SALIDA: {item.exitDate}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {[item.evidence1, item.evidence2, item.evidence3, item.evidence4].filter(ev => ev && typeof ev === 'string' && ev.trim() !== '').map((ev, i) => {
                          const directUrl = getDirectDriveUrl(ev);
                          return (
                            <div 
                              key={i} 
                              className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all group relative"
                              onClick={() => setViewingImage(directUrl)}
                            >
                              {directUrl && directUrl.trim() !== '' ? (
                                <img 
                                  src={directUrl} 
                                  alt="Evidencia" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    // Si falla el thumbnail, intentamos con el proxy uc?id=
                                    if (!target.src.includes('uc?id=')) {
                                      const idMatch = directUrl.match(/id=(.+?)(&|$)/);
                                      if (idMatch) {
                                        target.src = `https://drive.google.com/uc?id=${idMatch[1]}&export=view`;
                                        return;
                                      }
                                    }
                                    target.src = 'https://placehold.co/100x100?text=Error';
                                  }}
                                />
                              ) : null}
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 size={12} className="text-white" />
                              </div>
                            </div>
                          );
                        })}
                        {![item.evidence1, item.evidence2, item.evidence3, item.evidence4].some(Boolean) && (
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">SIN FOTOS</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedCorrective(item)}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                        title="Subir evidencias"
                      >
                        <Camera size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                    No se encontraron correctivos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setViewingImage(null)}
        >
          <div className="absolute top-6 right-6 flex items-center gap-4">
            <a 
              href={getOriginalDriveUrl(viewingImage)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Maximize2 size={14} />
              Abrir Original
            </a>
            <button className="text-white/70 hover:text-white transition-colors">
              <X size={40} />
            </button>
          </div>
          
          <img 
            src={viewingImage} 
            alt="Vista previa" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Si falla el thumbnail, intentamos con el original como fallback
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('uc?id=')) {
                const idMatch = viewingImage.match(/id=(.+?)(&|$)/);
                if (idMatch) {
                  target.src = `https://drive.google.com/uc?id=${idMatch[1]}&export=view`;
                }
              }
            }}
          />
          
          <p className="mt-6 text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">
            Haga clic fuera para cerrar
          </p>
        </div>
      )}

      {/* Modal de Carga de Evidencias */}
      {selectedCorrective && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                  <Camera className="text-emerald-600" size={24} />
                  Evidencias Correctivo
                </h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                  {selectedCorrective.plate} - {selectedCorrective.system}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedCorrective(null);
                  setTempEvidences([]);
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Área de Carga */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargar Fotografías (Máx. 4)</p>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    {tempEvidences.length} / 4 SELECCIONADAS
                  </span>
                </div>

                {tempEvidences.length < 4 && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 mb-2 transition-colors" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Haga clic para subir fotos</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                  </label>
                )}

                {/* Collage de Previsualización */}
                {tempEvidences.length > 0 && (
                  <div className={`grid gap-3 ${
                    tempEvidences.length === 1 ? 'grid-cols-1' : 
                    tempEvidences.length === 2 ? 'grid-cols-2' : 
                    'grid-cols-2'
                  }`}>
                    {tempEvidences.map((src, index) => (
                      <div key={index} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 group shadow-sm">
                        <img src={src} alt={`Evidencia ${index + 1}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeEvidence(index)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={14} />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                          Foto {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setSelectedCorrective(null);
                    setTempEvidences([]);
                  }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button 
                  disabled={tempEvidences.length === 0 || isUploading}
                  onClick={handleSubmitEvidences}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${
                    tempEvidences.length === 0 || isUploading 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Guardar Evidencias
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectivesModule;
