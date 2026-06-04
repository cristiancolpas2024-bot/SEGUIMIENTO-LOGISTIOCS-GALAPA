
import React from 'react';
import { Calendar, Users, BarChart3 } from 'lucide-react';

interface MonthlyReportProps {
  summary: Array<{
    month: string;
    total: number;
    uniqueDrivers: number;
  }>;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ summary, selectedMonth, onSelectMonth }) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 mb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <BarChart3 size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Resumen de Registros por Mes</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Comparativa histórica de conductores registrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((item) => (
          <div 
            key={item.month}
            onClick={() => onSelectMonth(item.month)}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group ${
              selectedMonth === item.month 
                ? 'border-indigo-500 bg-indigo-50/30' 
                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                selectedMonth === item.month ? 'text-indigo-600' : 'text-slate-400'
              }`}>
                {item.month}
              </span>
              <Calendar size={14} className={selectedMonth === item.month ? 'text-indigo-500' : 'text-slate-300'} />
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total Registros</p>
                <p className={`text-2xl font-black tracking-tighter ${
                  selectedMonth === item.month ? 'text-indigo-600' : 'text-slate-700'
                }`}>
                  {item.total}
                </p>
              </div>
              
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Users size={12} className="text-slate-400" />
                <p className="text-[9px] font-black text-slate-500 uppercase">
                  {item.uniqueDrivers} <span className="text-slate-400">Conductores Únicos</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyReport;
