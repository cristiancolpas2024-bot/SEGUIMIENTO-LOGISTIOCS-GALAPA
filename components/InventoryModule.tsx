import React, { useState, useMemo } from 'react';
import { InventoryRecord, Vehicle } from '../types';
import { 
  Search, Filter, Package, AlertTriangle, AlertCircle, RefreshCw, 
  ChevronDown, ChevronUp, Download, Eye, LayoutGrid, List, Sparkles, Box, CheckCircle2,
  Calendar, Image as ImageIcon, Plus, Trash2, Check, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDriveDirectLink, formatDate, formatDateToDDMMAA } from '../utils';
import { submitInventoryToSheet, uploadImageToDrive } from '../services/sheetService';

interface InventoryModuleProps {
  headers: string[];
  data: InventoryRecord[];
  onRefresh?: () => void;
  isSyncing?: boolean;
  vehicles?: Vehicle[];
}

const InventoryModule: React.FC<InventoryModuleProps> = ({ headers, data, onRefresh, isSyncing = false, vehicles = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Default to table view to open directly in the table
  const [dynamicFilters, setDynamicFilters] = useState<{ [key: string]: string }>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryRecord | null>(null);
  const [activePhoto, setActivePhoto] = useState<{ url: string; title: string } | null>(null);

  // Local optimistic data states
  const [localEntries, setLocalEntries] = useState<InventoryRecord[]>([]);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    placa: '',
    carretillas: '0',
    conos: '0',
    correas: 'N/A',
  });
  const [formPhotos, setFormPhotos] = useState<{
    carretillas: string | null;
    conos: string | null;
    correas: string | null;
  }>({
    carretillas: null,
    conos: null,
    correas: null,
  });
  const [photoNames, setPhotoNames] = useState<{
    carretillas: string;
    conos: string;
    correas: string;
  }>({
    carretillas: '',
    conos: '',
    correas: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Combine remote and local items
  const allData = useMemo(() => {
    const merged = [...data];
    localEntries.forEach(localItem => {
      const localPlate = String(localItem['PLACA'] || '').toUpperCase().trim();
      
      const idx = merged.findIndex(item => {
        const plateKey = Object.keys(item).find(k => k.toUpperCase().trim() === 'PLACA');
        const itemPlate = plateKey ? String(item[plateKey] || '').toUpperCase().trim() : '';
        return itemPlate === localPlate && localPlate !== '';
      });
      
      if (idx !== -1) {
        const originalItem = merged[idx];
        const updatedItem = { ...originalItem };
        
        Object.keys(localItem).forEach(localKey => {
          if (localKey === 'id') return;
          const matchingKey = Object.keys(originalItem).find(k => k.toUpperCase().trim() === 'PLACA' ? 'PLACA' : k.toUpperCase().trim() === localKey.toUpperCase().trim());
          if (matchingKey) {
            updatedItem[matchingKey] = localItem[localKey];
          } else {
            updatedItem[localKey] = localItem[localKey];
          }
        });
        
        merged[idx] = updatedItem;
      } else {
        merged.unshift(localItem);
      }
    });

    // Filter out rows where the PLACA (plate) is empty, blank, undefined, "SIN PLACA" or N/A
    return merged.filter(item => {
      const pKey = Object.keys(item).find(k => k.toUpperCase().trim() === 'PLACA');
      const plateVal = pKey ? String(item[pKey] || '').trim().toUpperCase() : '';
      return (
        plateVal !== '' && 
        plateVal !== 'SIN PLACA' && 
        plateVal !== 'SIN_PLACA' && 
        plateVal !== 'UNDEFINED' && 
        plateVal !== 'NULL' && 
        plateVal !== 'N/A'
      );
    });
  }, [localEntries, data]);

  const handlePhotoChange = (key: 'carretillas' | 'conos' | 'correas', file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormPhotos(prev => ({ ...prev, [key]: reader.result as string }));
      setPhotoNames(prev => ({ ...prev, [key]: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa) {
      setSubmitError('Por favor seleccione una placa vehicular.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // 1. Upload base64 photos to Drive if selected
      let uploadedCarries = '';
      let uploadedCones = '';
      let uploadedBelts = '';

      if (formPhotos.carretillas) {
        try {
          uploadedCarries = await uploadImageToDrive(formPhotos.carretillas, `INV_CARRETILLAS_${formData.placa}_${Date.now()}.jpg`);
        } catch(err) {
          console.warn("Could not upload carretillas image to Drive:", err);
        }
      }
      if (formPhotos.conos) {
        try {
          uploadedCones = await uploadImageToDrive(formPhotos.conos, `INV_CONOS_${formData.placa}_${Date.now()}.jpg`);
        } catch(err) {
          console.warn("Could not upload conos image to Drive:", err);
        }
      }
      if (formPhotos.correas) {
        try {
          uploadedBelts = await uploadImageToDrive(formPhotos.correas, `INV_CORREAS_${formData.placa}_${Date.now()}.jpg`);
        } catch(err) {
          console.warn("Could not upload correas image to Drive:", err);
        }
      }

      // 2. Submit record to Sheet
      const formattedDate = formatDateToDDMMAA(formData.fecha);
      const payload = {
        fecha: formattedDate,
        placa: formData.placa,
        carretillas: formData.carretillas,
        conos: formData.conos,
        correas: formData.correas,
        fotoCarretillas: uploadedCarries || '',
        fotoConos: uploadedCones || '',
        fotoCorreas: uploadedBelts || '',
      };

      const isSaved = await submitInventoryToSheet(payload);
      
      // Update locally immediately (optimistic update so they see changes instantly!)
      const newLocalRecord: InventoryRecord = {
        id: `inv-local-${Date.now()}`,
        'FECHA': formattedDate,
        'PLACA': formData.placa,
        'CARRETILLAS': formData.carretillas,
        'CONOS': formData.conos,
        'CORREAS': formData.correas,
        'FOTOS CARRETILLAS': uploadedCarries || formPhotos.carretillas || '',
        'FOTOS CONOS': uploadedCones || formPhotos.conos || '',
        'FOTOS CORREAS': uploadedBelts || formPhotos.correas || '',
      };

      setLocalEntries(prev => [newLocalRecord, ...prev]);

      setSubmitSuccess(true);
      // Reset form
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        placa: '',
        carretillas: '0',
        conos: '0',
        correas: 'N/A',
      });
      setFormPhotos({ carretillas: null, conos: null, correas: null });
      setPhotoNames({ carretillas: '', conos: '', correas: '' });

      // Refresh parent to sync up in background if possible
      if (onRefresh) {
        onRefresh();
      }

    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message || 'Error al guardar el inventario. Verifique su conexión y configuración.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Identify special inventory schema (FECHA, PLACA, CARRETILLAS, CONOS, CORREAS, FOTOS...)
  const isSpecialInventory = useMemo(() => {
    const rawKeys = headers.map(h => h.toUpperCase().trim());
    return rawKeys.includes('PLACA') || rawKeys.includes('CARRETILLAS') || rawKeys.includes('CONOS') || rawKeys.includes('CORREAS');
  }, [headers]);

  // 1. Identify numeric or filterable columns dynamically
  const columnsToFilter = useMemo(() => {
    // We look for columns that have <= 15 unique values to generate filters
    const filterable: { header: string; uniqueValues: string[] }[] = [];
    headers.forEach(header => {
      const upHeader = header.toUpperCase();
      // Skip primary identifiers, images, general descriptions or dates
      if (
        upHeader.includes('ID') || 
        upHeader.includes('CODIGO') || 
        upHeader.includes('FECHA') || 
        upHeader.includes('PLACA') || 
        upHeader.includes('FOTO') || 
        upHeader.trim() === 'OBSERVACIÓN' ||
        upHeader.trim() === 'OBSERVACIONES'
      ) {
        return;
      }
      const values: string[] = allData.map(item => String(item[header] || '').trim()).filter(Boolean);
      const unique: string[] = Array.from(new Set(values));
      if (unique.length > 1 && unique.length <= 15) {
        filterable.push({ header, uniqueValues: ['TODOS', ...unique.sort()] });
      }
    });
    return filterable;
  }, [headers, allData]);

  // Identify typical key columns for card displays
  const mappedKeys = useMemo(() => {
    const rawKeys = headers.map(h => ({ original: h, normalized: h.toUpperCase() }));
    
    return {
      idKey: rawKeys.find(k => k.normalized.includes('PLACA') || k.normalized.includes('ID') || k.normalized.includes('CÓDIGO') || k.normalized.includes('CODIGO'))?.original || headers[0],
      nameKey: rawKeys.find(k => k.normalized.includes('PLACA'))?.original || rawKeys.find(k => k.normalized.includes('NOMBRE') || k.normalized.includes('DESCRIPCIÓN') || k.normalized.includes('DESCRIPCION') || k.normalized.includes('ARTICULO') || k.normalized.includes('ARTÍCULO'))?.original || headers[1],
      stockKey: rawKeys.find(k => k.normalized.includes('CANTIDAD') || k.normalized.includes('STOCK') || k.normalized.includes('DISP') || k.normalized.includes('CARRETILLAS'))?.original,
      statusKey: rawKeys.find(k => k.normalized.includes('ESTADO') || k.normalized.includes('DISPONIBILIDAD'))?.original,
      locationKey: rawKeys.find(k => k.normalized.includes('UBICACIÓN') || k.normalized.includes('UBICACION') || k.normalized.includes('CD'))?.original,
      dateKey: rawKeys.find(k => k.normalized.includes('FECHA'))?.original,
    };
  }, [headers]);

  // Keep only FECHA and PLACA for table layout
  const tableHeaders = useMemo(() => {
    return headers.filter(h => {
      const up = h.toUpperCase().trim();
      return up === 'FECHA' || up === 'PLACA';
    });
  }, [headers]);

  // Handle Dynamic Filter Change
  const handleFilterChange = (header: string, val: string) => {
    setDynamicFilters(prev => ({
      ...prev,
      [header]: val
    }));
  };

  // Filter and Sort Data
  const filteredData = useMemo(() => {
    let result = [...allData];

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => {
        return Object.values(item).some(val => 
          String(val || '').toLowerCase().includes(term)
        );
      });
    }

    // Dynamic dropdown filters
    Object.entries(dynamicFilters).forEach(([header, filterValue]) => {
      if (filterValue && filterValue !== 'TODOS') {
        result = result.filter(item => String(item[header] || '').trim() === filterValue);
      }
    });

    // Sort
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const valA = a[key] || '';
        const valB = b[key] || '';
        
        // Try parsing numbers
        const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }

        if (String(valA) < String(valB)) return direction === 'asc' ? -1 : 1;
        if (String(valA) > String(valB)) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allData, searchTerm, dynamicFilters, sortConfig]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalRecords = allData.length;
    let totalCarretillas = 0;
    let totalConos = 0;
    let totalCorreas = 0;
    
    // special data
    const rawKeys = headers.map(h => h.toUpperCase().trim());
    const carriesKey = headers.find(h => h.toUpperCase().trim() === 'CARRETILLAS');
    const conesKey = headers.find(h => h.toUpperCase().trim() === 'CONOS');
    const beltsKey = headers.find(h => h.toUpperCase().trim() === 'CORREAS');

    allData.forEach(item => {
      if (carriesKey) totalCarretillas += parseInt(String(item[carriesKey] || '0').replace(/[^0-9]/g, '')) || 0;
      if (conesKey) totalConos += parseInt(String(item[conesKey] || '0').replace(/[^0-9]/g, '')) || 0;
      if (beltsKey) {
        const valStr = String(item[beltsKey] || '').toUpperCase().trim();
        if (valStr === 'COMPLETAS') {
          totalCorreas += 1;
        }
      }
    });

    return {
      totalRecords,
      totalCarretillas: carriesKey ? totalCarretillas : null,
      totalConos: conesKey ? totalConos : null,
      totalCorreas: beltsKey ? totalCorreas : null,
    };
  }, [allData, headers]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExportCSV = () => {
    if (allData.length === 0) return;
    
    // Create CSV content
    const csvRows = [];
    csvRows.push(headers.join(','));

    allData.forEach(item => {
      const values = headers.map(header => {
        const escaped = String(item[header] || '').replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventario_BQA_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isUrl = (val: string) => {
    const s = String(val).trim();
    return s.startsWith('http://') || s.startsWith('https://');
  };

  return (
    <div className="space-y-5 sm:space-y-8 pb-24">
      {/* Dynamic Header Part */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3 md:gap-4">
            <Package className="text-indigo-600 w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" /> Inventarios y Auditorías
          </h2>
          <p className="text-[9px] sm:text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ml-11 sm:ml-12 md:ml-14">
            Gestión en tiempo real conectada a Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={isSyncing}
              className="p-3 sm:p-4 bg-white border border-slate-100 rounded-2xl sm:rounded-3xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center cursor-pointer flex-shrink-0"
              title="Sincronizar Datos"
            >
              <RefreshCw size={16} className={`${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-slate-800 text-white rounded-2xl sm:rounded-3xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all cursor-pointer"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Dynamic Metrics Panel (Bento Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Total items card */}
        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-4 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl">
            <Box size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Auditadas</p>
            <p className="text-lg sm:text-3xl font-black text-slate-900">{stats.totalRecords}</p>
          </div>
        </div>

        {/* Dynamic special metadata for checklist columns */}
        {stats.totalCarretillas !== null && (
          <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
            <div className="p-2 sm:p-4 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100/35">
              <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Carretillas</p>
              <p className="text-lg sm:text-3xl font-black text-slate-900">{stats.totalCarretillas} ud.</p>
            </div>
          </div>
        )}

        {stats.totalConos !== null && (
          <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
            <div className="p-2 sm:p-4 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl border border-amber-100/35">
              <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Conos</p>
              <p className="text-lg sm:text-3xl font-black text-slate-900">{stats.totalConos} ud.</p>
            </div>
          </div>
        )}

        {stats.totalCorreas !== null && (
          <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
            <div className="p-2 sm:p-4 bg-purple-50 text-purple-600 rounded-xl sm:rounded-2xl border border-purple-100/35">
              <Sparkles size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Correas</p>
              <p className="text-lg sm:text-3xl font-black text-slate-900">{stats.totalCorreas} ud.</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar por placa, fecha..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[11px] sm:text-[12px] font-bold outline-none focus:border-indigo-500 hover:bg-slate-100/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl sm:rounded-2xl flex items-center">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm font-black text-[9px] sm:text-[10px]' : 'text-slate-400 hover:text-slate-600 font-extrabold text-[9px] sm:text-[10px]'}`}
                title="Vista Tabla"
              >
                <div className="flex items-center gap-1.5 px-1 sm:px-1.5">
                  <List size={13} className="sm:w-4 sm:h-4" />
                  <span>TABLA</span>
                </div>
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm font-black text-[9px] sm:text-[10px]' : 'text-slate-400 hover:text-slate-600 font-extrabold text-[9px] sm:text-[10px]'}`}
                title="Vista Tarjeta"
              >
                <div className="flex items-center gap-1.5 px-1 sm:px-1.5">
                  <LayoutGrid size={13} className="sm:w-4 sm:h-4" />
                  <span>TARJETAS</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        {columnsToFilter.length > 0 && (
          <div className="border-t border-slate-100 pt-3 sm:pt-4 flex flex-wrap gap-2.5 sm:gap-4 items-center">
            <span className="text-[8px] sm:text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <Filter size={11} /> Filtrar por:
            </span>
            {columnsToFilter.map(col => (
              <div key={col.header} className="flex flex-col bg-slate-50 px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                <span className="text-[6px] sm:text-[7px] font-bold text-slate-400 uppercase tracking-wider">{col.header}</span>
                <select
                  value={dynamicFilters[col.header] || 'TODOS'}
                  onChange={e => handleFilterChange(col.header, e.target.value)}
                  className="bg-transparent text-[9px] sm:text-[10px] font-black text-slate-800 uppercase outline-none cursor-pointer pr-3"
                >
                  {col.uniqueValues.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            ))}
            
            {Object.keys(dynamicFilters).some(k => dynamicFilters[k] !== 'TODOS') && (
              <button
                onClick={() => setDynamicFilters({})}
                className="text-[8px] sm:text-[9px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest ml-auto cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main View Data */}
      <AnimatePresence mode="wait">
        {filteredData.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-4"
          >
            <Package size={48} className="text-slate-300 animate-bounce" />
            <div className="space-y-1">
              <p className="text-slate-700 font-extrabold uppercase text-sm">No se encontraron registros de inventario</p>
              <p className="text-xs text-slate-400 max-w-sm">Prueba ajustando los criterios de búsqueda o limpiando los filtros seleccionados.</p>
            </div>
          </motion.div>
        ) : viewMode === 'table' ? (
          <motion.div 
            key="table-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {tableHeaders.map(header => (
                      <th 
                        key={header}
                        onClick={() => requestSort(header)}
                        className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-all select-none"
                      >
                        <div className="flex items-center gap-2">
                          {header}
                          {sortConfig?.key === header ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : null}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-wider text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                  {filteredData.map((item) => {
                    const plateVal = item['PLACA'] || item[mappedKeys.idKey] || '';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                        {tableHeaders.map(header => {
                          const val = String(item[header] || '');
                          const isUrlVal = isUrl(val);

                          if (header === 'PLACA') {
                            return (
                              <td key={header} className="px-6 py-4 font-bold">
                                <span className="bg-amber-300 text-slate-900 font-black border border-slate-900/30 px-2.5 py-1 rounded-md text-[10px] tracking-wide shadow-sm">
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          if (header === 'FECHA') {
                            return (
                              <td key={header} className="px-6 py-4 text-slate-500">
                                {formatDate(val)}
                              </td>
                            );
                          }

                          if (isUrlVal) {
                            const driveLink = getDriveDirectLink(val);
                            return (
                              <td key={header} className="px-6 py-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhoto({ url: driveLink, title: `${header} - Placa: ${plateVal}` });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  <Eye size={12} />
                                  Ver Foto
                                </button>
                              </td>
                            );
                          }

                          // Highlight non-zero counts
                          if (header === 'CARRETILLAS' || header === 'CONOS' || header === 'CORREAS') {
                            const ctVal = parseInt(val.replace(/[^0-9]/g, '')) || 0;
                            return (
                              <td key={header} className="px-6 py-4 font-black">
                                <span className={`px-2.5 py-1 rounded-lg ${ctVal > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-400'}`}>
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={header} className="px-6 py-4 whitespace-nowrap overflow-hidden max-w-[200px] text-ellipsis">
                              {val}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {(() => {
                              const carriesKey = headers.find(h => h.toUpperCase().trim() === 'CARRETILLAS');
                              const conesKey = headers.find(h => h.toUpperCase().trim() === 'CONOS');
                              const beltsKey = headers.find(h => h.toUpperCase().trim() === 'CORREAS');
                              const carriesVal = carriesKey ? String(item[carriesKey] || '') : '';
                              const conesVal = conesKey ? String(item[conesKey] || '') : '';
                              const beltsVal = beltsKey ? String(item[beltsKey] || '') : '';
                              const isAuditCompleted = carriesVal.trim() !== '' && conesVal.trim() !== '' && beltsVal.trim() !== '';

                              if (isAuditCompleted) {
                                return (
                                  <>
                                    <button
                                      onClick={() => setSelectedItem(item)}
                                      className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-black"
                                      title="Ver detalles"
                                    >
                                      <Eye size={14} />
                                      <span className="text-[10px] font-black uppercase tracking-wider">Detalle</span>
                                    </button>
                                    <span
                                      className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl inline-flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                                      title="Auditado"
                                    >
                                      <CheckCircle2 size={13} className="text-emerald-500" />
                                      <span>Realizado</span>
                                    </span>
                                  </>
                                );
                              }

                              return (
                                <button
                                  onClick={() => {
                                    setSubmitError(null);
                                    setSubmitSuccess(false);
                                    setFormData({
                                      fecha: new Date().toISOString().split('T')[0],
                                      placa: plateVal,
                                      carretillas: ['0', '1', '2', '3'].includes(carriesVal.trim()) ? carriesVal.trim() : '0',
                                      conos: ['0', '1', '2', '3'].includes(conesVal.trim()) ? conesVal.trim() : '0',
                                      correas: ['COMPLETAS', 'INCOMPLETAS', 'N/A'].includes(beltsVal.toUpperCase().trim()) ? beltsVal.toUpperCase().trim() : 'N/A',
                                    });
                                    setFormPhotos({ carretillas: null, conos: null, correas: null });
                                    setPhotoNames({ carretillas: '', conos: '', correas: '' });
                                    setIsFormOpen(true);
                                  }}
                                  className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-black shadow-md shadow-indigo-600/10"
                                  title="Auditar"
                                >
                                  <Plus size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Auditar</span>
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="grid-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
          >
            {filteredData.map(item => {
              const placaVal = String(item['PLACA'] || item[mappedKeys.idKey] || '');
              
              if (isSpecialInventory) {
                const rawKeys = Object.keys(item);
                const findKeyCaseInsensitive = (name: string) => rawKeys.find(k => k.toUpperCase().trim() === name.toUpperCase().trim()) || '';
                
                const fechaCol = findKeyCaseInsensitive('FECHA');
                const carriesCol = findKeyCaseInsensitive('CARRETILLAS');
                const conesCol = findKeyCaseInsensitive('CONOS');
                const beltsCol = findKeyCaseInsensitive('CORREAS');
                
                const fotoCarriesCol = findKeyCaseInsensitive('FOTOS CARRETILLAS');
                const fotoConesCol = findKeyCaseInsensitive('FOTOS CONOS');
                const fotoBeltsCol = findKeyCaseInsensitive('FOTOS CORREAS');

                const fechaVal = fechaCol ? String(item[fechaCol] || '') : '';
                const carriesVal = carriesCol ? String(item[carriesCol] || '') : '0';
                const conesVal = conesCol ? String(item[conesCol] || '') : '0';
                const beltsVal = beltsCol ? String(item[beltsCol] || '') : '0';

                const fotoCarriesUrl = fotoCarriesCol ? String(item[fotoCarriesCol] || '').trim() : '';
                const fotoConesUrl = fotoConesCol ? String(item[fotoConesCol] || '').trim() : '';
                const fotoBeltsUrl = fotoBeltsCol ? String(item[fotoBeltsCol] || '').trim() : '';

                const isAuditCompleted = carriesVal.trim() !== '' && conesVal.trim() !== '' && beltsVal.trim() !== '';

                return (
                  <div 
                    key={item.id}
                    className={`bg-white p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] border ${isAuditCompleted ? 'border-emerald-100/80 shadow-sm shadow-emerald-50/30' : 'border-slate-100'} hover:border-indigo-100 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between group`}
                  >
                    <div className="space-y-4 sm:space-y-5">
                      {/* Top plate strip */}
                      <div className="flex justify-between items-center bg-slate-50/60 p-2 rounded-xl sm:rounded-2xl border border-slate-100/55">
                        {placaVal ? (
                          <div className="inline-flex flex-col items-center px-2.5 py-1 sm:px-4 sm:py-1.5 bg-amber-300 border border-slate-800 rounded-lg sm:rounded-xl shadow-sm text-center">
                            <span className="font-mono text-xs sm:text-base font-black tracking-widest text-slate-900 uppercase">
                              {placaVal}
                            </span>
                            <span className="text-[5px] sm:text-[6px] font-black uppercase text-slate-800 tracking-wider">
                              COLOMBIA
                            </span>
                          </div>
                        ) : (
                          <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">Sin Placa</span>
                        )}

                        {isAuditCompleted ? (
                          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={10} className="text-emerald-600 sm:w-3 sm:h-3" /> Realizado
                          </span>
                        ) : fechaVal ? (
                          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400">
                            <Calendar size={11} className="text-indigo-400 sm:w-3.5 sm:h-3.5" />
                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-500">{formatDate(fechaVal)}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Items Grid */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                        {/* Carretillas field */}
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 text-center flex flex-col justify-between space-y-1.5">
                          <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">Carretas</span>
                          <span className="text-base sm:text-xl font-black text-slate-800">{carriesVal}</span>
                          
                          {fotoCarriesUrl.startsWith('http') ? (
                            <button
                              onClick={() => setActivePhoto({ url: getDriveDirectLink(fotoCarriesUrl), title: `Fotos Carretillas - ${placaVal}` })}
                              className="w-full h-8 sm:h-11 relative rounded-md sm:rounded-lg overflow-hidden group/img mt-1 aspect-video cursor-pointer border border-slate-200"
                            >
                              <img 
                                src={getDriveDirectLink(fotoCarriesUrl)} 
                                alt="Carretillas"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-all duration-300"
                              />
                            </button>
                          ) : (
                            <div className="text-[7.5px] sm:text-[8px] font-black text-slate-300 bg-slate-100/40 py-1 sm:py-1.5 rounded-md uppercase tracking-wider">Sin Foto</div>
                          )}
                        </div>

                        {/* Conos field */}
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 text-center flex flex-col justify-between space-y-1.5">
                          <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">Conos</span>
                          <span className="text-base sm:text-xl font-black text-slate-800">{conesVal}</span>
                          
                          {fotoConesUrl.startsWith('http') ? (
                            <button
                              onClick={() => setActivePhoto({ url: getDriveDirectLink(fotoConesUrl), title: `Fotos Conos - ${placaVal}` })}
                              className="w-full h-8 sm:h-11 relative rounded-md sm:rounded-lg overflow-hidden group/img mt-1 aspect-video cursor-pointer border border-slate-200"
                            >
                              <img 
                                src={getDriveDirectLink(fotoConesUrl)} 
                                alt="Conos"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-all duration-300"
                              />
                            </button>
                          ) : (
                            <div className="text-[7.5px] sm:text-[8px] font-black text-slate-300 bg-slate-100/40 py-1 sm:py-1.5 rounded-md uppercase tracking-wider">Sin Foto</div>
                          )}
                        </div>

                        {/* Correas field */}
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 text-center flex flex-col justify-between space-y-1.5">
                          <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">Correas</span>
                          <span className="text-base sm:text-xl font-black text-slate-800">{beltsVal}</span>
                          
                          {fotoBeltsUrl.startsWith('http') ? (
                            <button
                              onClick={() => setActivePhoto({ url: getDriveDirectLink(fotoBeltsUrl), title: `Fotos Correas - ${placaVal}` })}
                              className="w-full h-8 sm:h-11 relative rounded-md sm:rounded-lg overflow-hidden group/img mt-1 aspect-video cursor-pointer border border-slate-200"
                            >
                              <img 
                                src={getDriveDirectLink(fotoBeltsUrl)} 
                                alt="Correas"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-all duration-300"
                              />
                            </button>
                          ) : (
                            <div className="text-[7.5px] sm:text-[8px] font-black text-slate-300 bg-slate-100/40 py-1 sm:py-1.5 rounded-md uppercase tracking-wider">Sin Foto</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 sm:pt-4 mt-4 sm:mt-5 border-t border-slate-100 flex gap-2">
                      {isAuditCompleted ? (
                        <>
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="flex-1 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={11} /> Detalle
                          </button>
                          <button
                            disabled
                            className="flex-1 py-2.5 sm:py-3 bg-emerald-50 text-emerald-700 border border-emerald-200/55 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                          >
                            <CheckCircle2 size={11} className="text-emerald-600" /> Realizado
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setSubmitError(null);
                            setSubmitSuccess(false);
                            setFormData({
                              fecha: new Date().toISOString().split('T')[0],
                              placa: placaVal,
                              carretillas: ['0', '1', '2', '3'].includes(carriesVal.trim()) ? carriesVal.trim() : '0',
                              conos: ['0', '1', '2', '3'].includes(conesVal.trim()) ? conesVal.trim() : '0',
                              correas: ['COMPLETAS', 'INCOMPLETAS', 'N/A'].includes(beltsVal.toUpperCase().trim()) ? beltsVal.toUpperCase().trim() : 'N/A',
                            });
                            setFormPhotos({ carretillas: null, conos: null, correas: null });
                            setPhotoNames({ carretillas: '', conos: '', correas: '' });
                            setIsFormOpen(true);
                          }}
                          className="flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                        >
                          <Plus size={11} /> Auditar
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Fallback Layout
              const name = String(item[mappedKeys.nameKey] || 'Artículo Sin Nombre');
              const id = String(item[mappedKeys.idKey] || 'N/A');
              const stock = mappedKeys.stockKey ? String(item[mappedKeys.stockKey] || '') : null;
              const location = mappedKeys.locationKey ? String(item[mappedKeys.locationKey] || '') : null;
              const status = mappedKeys.statusKey ? String(item[mappedKeys.statusKey] || '') : null;

              return (
                <div 
                  key={item.id}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top strip */}
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{id}</span>
                      {status && (
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                          status.toUpperCase().includes('DISP') || status.toUpperCase().includes('ACTIVO') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {status}
                        </span>
                      )}
                    </div>

                    {/* Main Name / Desc */}
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 line-clamp-2 uppercase group-hover:text-indigo-600 transition-colors">
                        {name}
                      </h4>
                    </div>

                    {/* Metadata attributes */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                      {stock && (
                        <div>
                          <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-widest">Existencias</p>
                          <p className="text-xs font-black text-slate-800">{stock}</p>
                        </div>
                      )}
                      {location && (
                        <div>
                          <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-widest">Ubicación</p>
                          <p className="text-xs font-black text-slate-800 uppercase truncate">{location}</p>
                        </div>
                      )}
                    </div>

                    {/* Remaining non-mapped attributes (render 2 max) */}
                    <div className="space-y-1 pt-2">
                      {headers
                        .filter(h => h !== mappedKeys.nameKey && h !== mappedKeys.idKey && h !== mappedKeys.stockKey && h !== mappedKeys.locationKey && h !== mappedKeys.statusKey)
                        .slice(0, 2)
                        .map(h => (
                          <div key={h} className="flex justify-between text-[10px] border-b border-dashed border-slate-50 pb-1">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">{h}</span>
                            <span className="text-slate-700 font-black uppercase truncate max-w-[120px]">{String(item[h] || '')}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="w-full py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Ver Detalle Completo
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">Ficha de Inventario</span>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1 leading-snug">
                  {String(selectedItem['PLACA'] || selectedItem[mappedKeys.nameKey] || 'Registro de Inventario')}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <ChevronDown className="rotate-180" size={20} />
              </button>
            </div>

            {/* List Attributes */}
            <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {headers.map(header => {
                const val = String(selectedItem[header] || '');
                const isValUrl = isUrl(val);

                return (
                  <div key={header} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{header}</span>
                    {isValUrl ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <img 
                          src={getDriveDirectLink(val)} 
                          alt={header}
                          referrerPolicy="no-referrer"
                          className="w-24 h-16 object-cover rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:scale-105 transition-all"
                          onClick={() => setActivePhoto({ url: getDriveDirectLink(val), title: `${header} - Placa: ${selectedItem['PLACA'] || ''}` })}
                        />
                        <a 
                          href={val} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] text-indigo-600 hover:underline font-bold"
                        >
                          Ver en Google Drive
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs font-extrabold text-slate-800 uppercase text-right pl-4">{val || '-'}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Nuevo Inventario Form Modal */}
      {isFormOpen && (
        <div key="inventory-form-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-4 sm:my-8"
          >
            {/* Form Header */}
            <div className="p-5 sm:p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-[8px] sm:text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">Formulario De Auditoría</span>
                <h3 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight mt-1 leading-none">
                  Nuevo Registro de Inventario
                </h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 sm:p-3 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <Plus className="rotate-45" size={18} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-8 sm:p-12 text-center space-y-4 sm:space-y-6 flex flex-col items-center justify-center">
                <div className="p-4 sm:p-6 bg-emerald-50 text-emerald-600 rounded-full">
                  <CheckCircle2 size={36} className="sm:w-12 sm:h-12" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-slate-900 uppercase">¡Guardado con éxito!</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-2">El registro del inventario ha sido almacenado en Google Sheets correctamente.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setSubmitSuccess(false);
                  }}
                  className="px-6 sm:px-8 py-3 sm:py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl transition-all cursor-pointer"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {submitError && (
                  <div className="p-3 sm:p-4 bg-rose-50 text-rose-600 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold flex items-center gap-2 border border-rose-100">
                    <AlertTriangle size={16} />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Fecha Picker */}
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fecha de Registro</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3 sm:top-3.5 text-slate-400 opacity-60" size={16} />
                      <input
                        type="date"
                        required
                        disabled
                        value={formData.fecha}
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3.5 bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-400 cursor-not-allowed outline-none select-none"
                      />
                    </div>
                  </div>

                  {/* Placa Select Dropdown / Ornament */}
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vehículo (Placa)</label>
                    {formData.placa ? (
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="inline-flex flex-col items-center px-4 py-1.5 sm:px-6 sm:py-2 bg-amber-300 border-2 border-slate-900 rounded-xl sm:rounded-2xl shadow-md text-center">
                          <span className="font-mono text-sm sm:text-lg font-black tracking-widest text-slate-900 uppercase">
                            {formData.placa}
                          </span>
                          <span className="text-[5px] sm:text-[6px] font-black uppercase text-slate-800 tracking-wider">
                            COLOMBIA
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="text-[8px] sm:text-[9px] font-black text-indigo-600 uppercase tracking-wider">Selección Directa</p>
                          <p className="text-[11px] sm:text-xs font-bold text-slate-700">Auditando este vehículo</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          required
                          value={formData.placa}
                          onChange={(e) => setFormData(prev => ({ ...prev, placa: e.target.value }))}
                          className="w-full px-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Seleccione vehículo...</option>
                          {Array.from(new Set(vehicles.map(v => v.plate))).sort().map(plate => (
                            <option key={plate} value={plate}>{plate}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-3 sm:top-4 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Specific form element fields: Carretillas, Conos, Correas */}
                <div className="space-y-4 sm:space-y-6 py-3 sm:py-4 border-t border-b border-slate-100">
                  {/* CARRETILLAS (0-1-2-3) */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Carretillas
                      </label>
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">Seleccione cantidad</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['0', '1', '2', '3'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, carretillas: item }))}
                          className={`py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                            formData.carretillas === item
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    {/* Carretillas Image Upload */}
                    <div className="mt-2 sm:mt-3">
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-slate-400 mb-1">
                        <span>Foto Soporte (Carretillas)</span>
                        {photoNames.carretillas && <span className="text-emerald-600 font-bold">Cargada</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl sm:rounded-2xl cursor-pointer transition-all">
                          <Upload size={14} />
                          <span className="text-[11px] sm:text-xs font-bold truncate max-w-[180px] sm:max-w-[200px]">
                            {photoNames.carretillas || 'Subir foto o arrastrar archivo'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoChange('carretillas', file);
                            }}
                          />
                        </label>
                        {formPhotos.carretillas && (
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                            <img src={formPhotos.carretillas} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setFormPhotos(p => ({ ...p, carretillas: null }));
                                setPhotoNames(p => ({ ...p, carretillas: '' }));
                              }}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all text-white"
                            >
                              <Plus className="rotate-45" size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CONOS (0-1-2-3) */}
                  <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Conos
                      </label>
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">Seleccione cantidad</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['0', '1', '2', '3'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, conos: item }))}
                          className={`py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                            formData.conos === item
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    {/* Conos Image Upload */}
                    <div className="mt-2 sm:mt-3">
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-slate-400 mb-1">
                        <span>Foto Soporte (Conos)</span>
                        {photoNames.conos && <span className="text-emerald-600 font-bold">Cargada</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl sm:rounded-2xl cursor-pointer transition-all">
                          <Upload size={14} />
                          <span className="text-[11px] sm:text-xs font-bold truncate max-w-[180px] sm:max-w-[200px]">
                            {photoNames.conos || 'Subir foto o arrastrar archivo'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoChange('conos', file);
                            }}
                          />
                        </label>
                        {formPhotos.conos && (
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                            <img src={formPhotos.conos} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setFormPhotos(p => ({ ...p, conos: null }));
                                setPhotoNames(p => ({ ...p, conos: '' }));
                              }}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all text-white"
                            >
                              <Plus className="rotate-45" size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CORREAS (COMPLETAS - INCOMPLETAS - N/A) */}
                  <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Correas
                      </label>
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">Seleccione estado</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['COMPLETAS', 'INCOMPLETAS', 'N/A'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, correas: item }))}
                          className={`py-2.5 sm:py-3 px-1 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer ${
                            formData.correas === item
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    {/* Correas Image Upload */}
                    <div className="mt-2 sm:mt-3">
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-slate-400 mb-1">
                        <span>Foto Soporte (Correas)</span>
                        {photoNames.correas && <span className="text-emerald-600 font-bold">Cargada</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl sm:rounded-2xl cursor-pointer transition-all">
                          <Upload size={14} />
                          <span className="text-[11px] sm:text-xs font-bold truncate max-w-[180px] sm:max-w-[200px]">
                            {photoNames.correas || 'Subir foto o arrastrar archivo'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoChange('correas', file);
                            }}
                          />
                        </label>
                        {formPhotos.correas && (
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                            <img src={formPhotos.correas} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setFormPhotos(p => ({ ...p, correas: null }));
                                setPhotoNames(p => ({ ...p, correas: '' }));
                              }}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all text-white"
                            >
                              <Plus className="rotate-45" size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="p-1 sm:p-2 flex justify-end gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSubmitting}
                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" /> Procesando...
                      </>
                    ) : (
                      'Guardar Registro'
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Photo Lightbox Dialog */}
      {activePhoto && (
        <div key="lightbox-modal" className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-4xl w-full flex flex-col items-center justify-center relative space-y-4">
            <div className="w-full flex justify-between items-center text-white px-2">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">{activePhoto.title}</h4>
              <button 
                onClick={() => setActivePhoto(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer text-slate-200 hover:text-white"
              >
                Cerrar (✖)
              </button>
            </div>
            <div className="relative max-h-[75vh] flex items-center justify-center bg-slate-900/50 rounded-3xl overflow-hidden border border-white/10">
              <img 
                src={activePhoto.url} 
                alt={activePhoto.title} 
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-3xl"
              />
            </div>
            <a 
              href={activePhoto.url.replace('&sz=w1000', '')} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Eye size={14} /> Abrir Foto Original en Google Drive
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
