
import React, { useMemo } from 'react';
import { WashReport } from '../types';
import { normalizePlate } from '../utils';
import { ChevronLeft, ChevronRight, Droplets, CheckCircle2, Clock } from 'lucide-react';

interface WashCalendarProps {
  reports: WashReport[];
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
  onManageClosure: (report: WashReport) => void;
  searchTerm: string;
}

const WashCalendar: React.FC<WashCalendarProps> = ({ 
  reports, 
  selectedMonth, 
  selectedYear, 
  onMonthChange, 
  onYearChange,
  onViewDoc,
  onManageClosure,
  searchTerm
}) => {
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  
  const monthIndex = months.indexOf(selectedMonth);
  
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, monthIndex + 1, 0).getDate();
  }, [selectedYear, monthIndex]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(selectedYear, monthIndex, 1).getDay();
  }, [selectedYear, monthIndex]);

  const calendarDays = useMemo(() => {
    const days = [];
    // Previous month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [daysInMonth, firstDayOfMonth]);

  const getReportsForDay = (day: number) => {
    const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayReports = reports.filter(r => r.date === dateStr && normalizePlate(r.plate).includes(normalizePlate(searchTerm)));
    
    // Agrupar por placa y priorizar el reporte CERRADO o el último ingresado
    const uniqueReports: Record<string, WashReport> = {};
    dayReports.forEach(report => {
      const plate = normalizePlate(report.plate);
      if (!uniqueReports[plate] || report.status === 'CERRADO') {
        uniqueReports[plate] = report;
      }
    });
    
    return Object.values(uniqueReports);
  };

  const handlePrevMonth = () => {
    if (monthIndex === 0) {
      onMonthChange(months[11]);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(months[monthIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex === 11) {
      onMonthChange(months[0]);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(months[monthIndex + 1]);
    }
  };

  return (
    <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-[#0f172a] p-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/20">
            <Droplets size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedMonth} {selectedYear}</h3>
            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-1">Calendario de Lavados</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrevMonth} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <ChevronLeft size={28} />
          </button>
          <button onClick={handleNextMonth} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <ChevronRight size={28} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-8">
        <div className="grid grid-cols-7 mb-6">
          {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(day => (
            <div key={day} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-4">
          {calendarDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`min-h-[140px] rounded-[2rem] border-2 p-3 transition-all ${day ? 'bg-white border-slate-50 shadow-sm' : 'bg-slate-50/30 border-transparent'}`}
            >
              {day && (
                <>
                  <span className="text-sm font-black text-slate-300 mb-3 block ml-1">{day}</span>
                  <div className="space-y-2">
                    {getReportsForDay(day).map(report => (
                      <div 
                        key={report.id}
                        onClick={() => {
                          if (report.status === 'ABIERTO') {
                            onManageClosure(report);
                          } else {
                            const photos = [];
                            if (report.initialEvidenceUrl) photos.push({ url: report.initialEvidenceUrl, label: 'Inicial' });
                            if (report.finalEvidenceUrl) photos.push({ url: report.finalEvidenceUrl, label: 'Final' });
                            
                            if (photos.length > 0) {
                              onViewDoc(photos, `Evidencia Lavado - ${report.plate}`);
                            }
                          }
                        }}
                        className={`group px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-pointer transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-2 ${report.status === 'CERRADO' ? 'bg-emerald-500 text-white border border-emerald-600 shadow-sm' : 'bg-rose-500 text-white border border-rose-600 shadow-sm'}`}
                      >
                        <span className="truncate">{report.plate}</span>
                        <div className="shrink-0">
                          {report.status === 'CERRADO' ? (
                            <CheckCircle2 size={12} className="text-white" />
                          ) : (
                            <Clock size={12} className="text-white animate-pulse" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WashCalendar;
