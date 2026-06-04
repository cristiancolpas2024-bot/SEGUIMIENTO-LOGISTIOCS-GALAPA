
import React, { useState } from 'react';
import { Vehicle } from '../types';
import { generateId } from '../utils';
import { X, Car, Shield, Settings, Flame } from 'lucide-react';

interface VehicleFormProps {
  onClose: () => void;
  onSubmit: (vehicle: Vehicle) => void;
  initialData?: Vehicle;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>(initialData || {
    plate: '',
    brand: '',
    model: '',
    soat: { expiryDate: '', lastRenewalDate: '', status: 'active' },
    rtm: { expiryDate: '', lastRenewalDate: '', status: 'active' },
    extinguisher: { expiryDate: '', lastRenewalDate: '', status: 'active' },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVehicle: Vehicle = {
      ...(formData as Vehicle),
      id: initialData?.id || generateId(),
      lastUpdate: new Date().toISOString(),
    };
    onSubmit(newVehicle);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start sm:items-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="text-indigo-600" />
            {initialData ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Datos Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa (Ej: ABC123)</label>
              <input
                required
                type="text"
                placeholder="ABC123"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase font-bold tracking-widest"
                value={formData.plate}
                onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                required
                type="text"
                placeholder="Toyota, Renault, etc."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo/Año</label>
              <input
                required
                type="text"
                placeholder="2024"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SOAT Section */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
                <Shield size={18} /> SOAT
              </div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vencimiento</label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
                value={formData.soat?.expiryDate}
                onChange={e => setFormData({
                  ...formData,
                  soat: { ...formData.soat!, expiryDate: e.target.value }
                })}
              />
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Últ. Renovación</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={formData.soat?.lastRenewalDate}
                onChange={e => setFormData({
                  ...formData,
                  soat: { ...formData.soat!, lastRenewalDate: e.target.value }
                })}
              />
            </div>

            {/* RTM Section */}
            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-3 text-purple-700 font-semibold">
                <Settings size={18} /> RTM
              </div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vencimiento</label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
                value={formData.rtm?.expiryDate}
                onChange={e => setFormData({
                  ...formData,
                  rtm: { ...formData.rtm!, expiryDate: e.target.value }
                })}
              />
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Últ. Renovación</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={formData.rtm?.lastRenewalDate}
                onChange={e => setFormData({
                  ...formData,
                  rtm: { ...formData.rtm!, lastRenewalDate: e.target.value }
                })}
              />
            </div>

            {/* Extintor Section */}
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-3 text-orange-700 font-semibold">
                <Flame size={18} /> Extintor
              </div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vencimiento</label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
                value={formData.extinguisher?.expiryDate}
                onChange={e => setFormData({
                  ...formData,
                  extinguisher: { ...formData.extinguisher!, expiryDate: e.target.value }
                })}
              />
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Carga Actual</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={formData.extinguisher?.lastRenewalDate}
                onChange={e => setFormData({
                  ...formData,
                  extinguisher: { ...formData.extinguisher!, lastRenewalDate: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              {initialData ? 'Guardar Cambios' : 'Registrar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleForm;
