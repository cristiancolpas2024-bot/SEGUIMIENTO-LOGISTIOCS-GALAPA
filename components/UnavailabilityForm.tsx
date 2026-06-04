import React, { useState } from 'react';
import { UnavailabilityRecord } from '../types';
import { Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { saveUnavailabilityRecords } from '../services/sheetService';
import { getWeekNumber } from '../utils';

interface UnavailabilityFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const UnavailabilityForm: React.FC<UnavailabilityFormProps> = ({ onSuccess, onCancel }) => {
  const [batch, setBatch] = useState<Partial<UnavailabilityRecord>[]>([{
    fecha: new Date().toISOString().split('T')[0],
    estado: 'ACTIVO',
    criticidad: '2', // MEDIO
    sistema: '',
    novedad: '',
    taller: '',
    cd: '',
    contratista: ''
  }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setBatch([...batch, {
      fecha: new Date().toISOString().split('T')[0],
      estado: 'ACTIVO',
      criticidad: '2', // MEDIO
      sistema: '',
      novedad: '',
      taller: '',
      cd: '',
      contratista: ''
    }]);
  };

  const removeRow = (index: number) => {
    setBatch(batch.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof UnavailabilityRecord, value: any) => {
    const newBatch = [...batch];
    newBatch[index] = { ...newBatch[index], [field]: value };
    setBatch(newBatch);
  };

  const validate = () => {
    const plates = new Set();
    for (const record of batch) {
      if (!record.placa || record.placa.trim().length < 6) return "Todas las filas deben tener una placa válida.";
      if (!record.fechaIngreso) return "Todas las filas deben tener una fecha de ingreso.";
      
      const normalizedPlate = record.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (plates.has(normalizedPlate)) return `Placa duplicada en el envío: ${record.placa}`;
      plates.add(normalizedPlate);
    }
    return null;
  };

  const handleSaveAll = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    const recordsToSave = batch.map(r => {
      const dateObj = new Date(r.fecha || '');
      const week = isNaN(dateObj.getTime()) ? '' : getWeekNumber(dateObj);
      
      return {
        ...r,
        semana: week.toString(),
        placa: r.placa?.toUpperCase().replace(/[^A-Z0-9]/g, '')
      };
    });

    const success = await saveUnavailabilityRecords(recordsToSave);
    if (success) {
      onSuccess();
    } else {
      setError("Error al guardar los registros. Por favor intente de nuevo.");
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Registrar Indisponibilidad</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Carga masiva de reportes a la hoja de cálculo</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <X className="text-slate-400" />
        </button>
      </div>

      <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {batch.map((row, index) => (
            <div key={index} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative group animate-in fade-in duration-300">
              <button 
                onClick={() => removeRow(index)}
                className="absolute -top-2 -right-2 p-2 bg-white text-rose-500 rounded-full shadow-md border border-rose-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50"
                disabled={batch.length === 1}
              >
                <Trash2 size={16} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Placa *</label>
                  <input
                    type="text"
                    value={row.placa || ''}
                    onChange={(e) => updateRow(index, 'placa', e.target.value.toUpperCase())}
                    placeholder="AAA000"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Reporte</label>
                  <input
                    type="date"
                    value={row.fecha || ''}
                    onChange={(e) => updateRow(index, 'fecha', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado</label>
                  <select
                    value={row.estado || ''}
                    onChange={(e) => updateRow(index, 'estado', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="CERRADO">CERRADO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Criticidad</label>
                  <select
                    value={row.criticidad || ''}
                    onChange={(e) => updateRow(index, 'criticidad', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1">1 - CRÍTICO</option>
                    <option value="2">2 - MEDIO</option>
                    <option value="3">3 - BAJA</option>
                    <option value="0">0 - NULO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">CD</label>
                  <input
                    type="text"
                    value={row.cd || ''}
                    onChange={(e) => updateRow(index, 'cd', e.target.value)}
                    placeholder="Ejem: BARRANQUILLA"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contratista</label>
                  <input
                    type="text"
                    value={row.contratista || ''}
                    onChange={(e) => updateRow(index, 'contratista', e.target.value)}
                    placeholder="Nombre empresa"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sistema</label>
                  <input
                    type="text"
                    value={row.sistema || ''}
                    onChange={(e) => updateRow(index, 'sistema', e.target.value)}
                    placeholder="Ejem: MOTOR"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">F. Ingreso *</label>
                  <input
                    type="date"
                    value={row.fechaIngreso || ''}
                    onChange={(e) => updateRow(index, 'fechaIngreso', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Novedad / Descripción</label>
                  <input
                    type="text"
                    value={row.novedad || ''}
                    onChange={(e) => updateRow(index, 'novedad', e.target.value)}
                    placeholder="Describa el problema..."
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Taller</label>
                  <input
                    type="text"
                    value={row.taller || ''}
                    onChange={(e) => updateRow(index, 'taller', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">F. Salida (Opcional)</label>
                   <input
                     type="date"
                     value={row.fechaSalida || ''}
                     onChange={(e) => updateRow(index, 'fechaSalida', e.target.value)}
                     className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                   />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={addRow}
          className="mt-6 flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-widest hover:text-indigo-700 transition-colors"
        >
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center shadow-sm">
            <Plus size={18} />
          </div>
          Agregar otra fila
        </button>
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {batch.length} {batch.length === 1 ? 'registro listo' : 'registros listos'} para envío
        </p>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="px-8 py-3 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-slate-800 transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`px-10 py-3 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center gap-3 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 active:scale-95'}`}
          >
            {isSaving ? 'Guardando...' : <><Save size={16} /> Guardar Todo</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnavailabilityForm;
