
import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import Papa from 'papaparse';

interface ExportButtonProps {
  data: any[];
  filename: string;
  title: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, filename, title }) => {
  const handleExport = () => {
    if (data.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    // Preparar los datos para Excel (aplanar si es necesario y renombrar columnas)
    const exportData = data.map(item => ({
      'FECHA': item.date,
      'PLACA': item.plate,
      'KILOMETRAJE (KM)': item.mileage,
      'CENTRO DE DISTRIBUCIÓN': item.cd,
      'CONTRATISTA / OPERACIÓN': item.contractor
    }));

    // Convertir a CSV usando PapaParse
    const csv = Papa.unparse(exportData, {
      delimiter: ";", // Punto y coma es mejor para Excel en regiones de habla hispana
    });

    // Añadir BOM (Byte Order Mark) para que Excel reconozca UTF-8 (tildes, eñes)
    const csvWithBom = "\uFEFF" + csv;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Crear link temporal y disparar descarga
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={handleExport}
      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all active:scale-95 group"
    >
      <FileSpreadsheet size={16} className="group-hover:rotate-12 transition-transform" />
      {title}
      <Download size={14} className="ml-1 opacity-50" />
    </button>
  );
};

export default ExportButton;
