
import React, { useMemo } from 'react';
import { Calibration } from '../types';
import { normalizePlate } from '../utils';
import { ChevronLeft, ChevronRight, Disc, CheckCircle2, AlertCircle } from 'lucide-react';

interface CalibrationCalendarProps {
  calibrations: Calibration[];
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  onViewDoc: (url: string, title: string) => void;
  onUpdateEvidence: (calibration: Calibration) => void;
  searchTerm: string;
}

const CalibrationCalendar: React.FC<CalibrationCalendarProps> = ({ 
  calibrations, 
  selectedMonth, 
  selectedYear, 
  onMonthChange, 
  onYearChange,
  onViewDoc,
  onUpdateEvidence,
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

  const getCalibrationsForDay = (day: number) => {
    return calibrations.filter(c => {
      if (!c.calibrationDate) return false;
      try {
        const cDate = new Date(c.calibrationDate + 'T12:00:00');
        return cDate.getFullYear() === selectedYear && 
               cDate.getMonth() === monthIndex && 
               cDate.getDate() === day;
      } catch (e) {
        return false;
      }
    });
  };

  const calibrationsWithoutExactDay = useMemo(() => {
    return calibrations.filter(c => !c.calibrationDate || c.calibrationDate === '');
  }, [calibrations]);

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
            <Disc size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedMonth} {selectedYear}</h3>
            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-1">
              Cronograma de Calibraciones ({calibrations.length} registros)
            </p>
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
                    {getCalibrationsForDay(day).map(cal => (
                      <div 
                        key={cal.id}
                        onClick={() => {
                          if (cal.certificateUrl) {
                            onViewDoc(cal.certificateUrl, `Certificado Calibración - ${cal.plate}`);
                          } else {
                            onUpdateEvidence(cal);
                          }
                        }}
                        className={`group px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-pointer transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-2 ${cal.estado === 'COMPLETADO' ? 'bg-emerald-500 text-white border border-emerald-600 shadow-sm' : 'bg-rose-500 text-white border border-rose-600 shadow-sm'}`}
                      >
                        <span className="truncate">{cal.plate}</span>
                        <div className="shrink-0">
                          {cal.estado === 'COMPLETADO' ? (
                            <CheckCircle2 size={12} className="text-white" />
                          ) : (
                            <AlertCircle size={12} className="text-white animate-pulse" />
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

      {/* Registros sin fecha exacta */}
      {calibrationsWithoutExactDay.length > 0 && (
        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle size={20} className="text-amber-500" />
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Registros de {selectedMonth} sin fecha exacta ({calibrationsWithoutExactDay.length})</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {calibrationsWithoutExactDay.map(cal => (
              <div 
                key={cal.id}
                onClick={() => {
                  if (cal.certificateUrl) {
                    onViewDoc(cal.certificateUrl, `Certificado Calibración - ${cal.plate}`);
                  } else {
                    onUpdateEvidence(cal);
                  }
                }}
                className={`group px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tight cursor-pointer transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-3 ${cal.estado === 'COMPLETADO' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
              >
                <span className="truncate">{cal.plate}</span>
                {cal.estado === 'COMPLETADO' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} className="animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationCalendar;
