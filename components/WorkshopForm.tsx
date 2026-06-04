import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Loader2, Truck, Image as ImageIcon } from 'lucide-react';
import { submitWorkshopRecordToSheet } from '../services/sheetService';
import { getWeekNumber, createMosaic } from '../utils';
import { Vehicle } from '../types';

interface WorkshopFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultWorkshop?: string;
  vehicles: Vehicle[];
}

const WORKSHOPS = [
  'TECNIBENZ',
  'VEHIPESA',
  'TODOFIBRAS',
  'CAMION COLOMBIA',
  'ELECTRONIC SYSTEM',
  'COUNTRY TRUCK'
];

export const WorkshopForm: React.FC<WorkshopFormProps> = ({ isOpen, onClose, onSuccess, defaultWorkshop, vehicles }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [evidence1Files, setEvidence1Files] = useState<string[]>([]);
  const [evidence2Files, setEvidence2Files] = useState<string[]>([]);
  const [isDraggingEv1, setIsDraggingEv1] = useState(false);
  const [isDraggingEv2, setIsDraggingEv2] = useState(false);

  const [formData, setFormData] = useState({
    month: '',
    week: '',
    date: new Date().toISOString().split('T')[0],
    plate: '',
    status: 'EN PROCESO',
    novelty: '',
    workshopName: defaultWorkshop || ''
  });

  useEffect(() => {
    if (isOpen) {
      const d = new Date(formData.date);
      const monthName = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const weekNum = getWeekNumber(d);
      
      setFormData(prev => ({
        ...prev,
        month: monthName,
        week: weekNum.toString(),
        workshopName: defaultWorkshop || prev.workshopName
      }));
      setSubmitStatus('idle');
      setErrorMessage('');
      setEvidence1Files([]);
      setEvidence2Files([]);
    }
  }, [isOpen, formData.date, defaultWorkshop]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'plate' ? value.toUpperCase() : value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setFiles: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Limit to 4 files maximum
    const selectedFiles = files.slice(0, 4);
    
    const base64Promises = selectedFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const base64Strings = await Promise.all(base64Promises);
    setFiles(base64Strings);
  };

  const handleDrop = async (e: React.DragEvent, setFiles: React.Dispatch<React.SetStateAction<string[]>>) => {
    e.preventDefault();
    setIsDraggingEv1(false);
    setIsDraggingEv2(false);
    
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/')).slice(0, 4);
    if (files.length === 0) return;

    const base64Promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const base64Strings = await Promise.all(base64Promises);
    setFiles(base64Strings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.workshopName) {
      setErrorMessage('El campo Taller es obligatorio.');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      let finalEvidence1Url = '';
      if (evidence1Files.length > 0) {
        finalEvidence1Url = await createMosaic(evidence1Files, `EVIDENCIA 1 - ${formData.plate}`);
      }

      let finalEvidence2Url = '';
      if (evidence2Files.length > 0) {
        finalEvidence2Url = await createMosaic(evidence2Files, `EVIDENCIA 2 - ${formData.plate}`);
      }

      const payload = {
        month: formData.month,
        week: formData.week,
        date: formData.date,
        plate: formData.plate,
        status: formData.status,
        novelty: formData.novelty,
        evidence1Url: finalEvidence1Url,
        evidence2Url: finalEvidence2Url,
        workshopName: formData.workshopName
      };

      await submitWorkshopRecordToSheet(payload);
      
      setSubmitStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        setFormData({
          month: '',
          week: '',
          date: new Date().toISOString().split('T')[0],
          plate: '',
          status: 'EN PROCESO',
          novelty: '',
          workshopName: defaultWorkshop || ''
        });
        setEvidence1Files([]);
        setEvidence2Files([]);
      }, 2000);
    } catch (error) {
      console.error('Error submitting workshop record:', error);
      setSubmitStatus('error');
      setErrorMessage('Hubo un error al guardar el registro. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start sm:items-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 sm:my-8 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold">Nueva Novedad de Taller</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {submitStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 text-emerald-600">
              <CheckCircle className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-bold">¡Registro Guardado!</h3>
              <p className="text-slate-600 mt-2">La novedad ha sido registrada exitosamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitStatus === 'error' && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Placa
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      name="plate"
                      required
                      value={formData.plate}
                      onChange={handleChange}
                      className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase appearance-none"
                    >
                      <option value="">Seleccione una placa</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.plate}>{v.plate}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Taller <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="workshopName"
                    required
                    value={formData.workshopName}
                    onChange={handleChange}
                    disabled={!!defaultWorkshop}
                    className={`w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${defaultWorkshop ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}
                  >
                    <option value="">Seleccione un taller</option>
                    {WORKSHOPS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="EN PROCESO">EN PROCESO</option>
                    <option value="FINALIZADO">FINALIZADO</option>
                    <option value="PENDIENTE REPUESTO">PENDIENTE REPUESTO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Novedad
                </label>
                <textarea
                  name="novelty"
                  required
                  rows={3}
                  placeholder="Describa la novedad o trabajo a realizar..."
                  value={formData.novelty}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Evidencia 1 (Hasta 4 fotos)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(e) => handleFileChange(e, setEvidence1Files)}
                      className="hidden"
                      id="evidence1"
                    />
                    <label
                      htmlFor="evidence1"
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingEv1(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDraggingEv1(false); }}
                      onDrop={(e) => handleDrop(e, setEvidence1Files)}
                      className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingEv1 ? 'bg-blue-50 border-blue-500 scale-105' : 'border-slate-300 hover:bg-slate-50'}`}
                    >
                      {evidence1Files.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                          <span className="text-sm font-medium text-slate-700">{evidence1Files.length} foto(s) seleccionada(s)</span>
                          <span className="text-xs text-slate-500 mt-1">Click para cambiar</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm font-medium text-slate-700">Tomar o subir fotos</span>
                          <span className="text-xs text-slate-500 mt-1">Máximo 4 imágenes</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Evidencia 2 (Opcional - Hasta 4 fotos)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(e) => handleFileChange(e, setEvidence2Files)}
                      className="hidden"
                      id="evidence2"
                    />
                    <label
                      htmlFor="evidence2"
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingEv2(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDraggingEv2(false); }}
                      onDrop={(e) => handleDrop(e, setEvidence2Files)}
                      className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingEv2 ? 'bg-blue-50 border-blue-500 scale-105' : 'border-slate-300 hover:bg-slate-50'}`}
                    >
                      {evidence2Files.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                          <span className="text-sm font-medium text-slate-700">{evidence2Files.length} foto(s) seleccionada(s)</span>
                          <span className="text-xs text-slate-500 mt-1">Click para cambiar</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm font-medium text-slate-700">Tomar o subir fotos</span>
                          <span className="text-xs text-slate-500 mt-1">Máximo 4 imágenes</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Registro'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
