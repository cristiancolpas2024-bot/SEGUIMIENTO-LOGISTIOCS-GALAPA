import React, { useState, useMemo } from 'react';
import { OperationalIndicator } from '../types';
import { Filter, TrendingUp, Activity, Target, AlertTriangle, CheckCircle2, XCircle, Search, Calendar, MapPin, Hash } from 'lucide-react';

interface OperationalDashboardProps {
  indicators: OperationalIndicator[];
}

const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ indicators }) => {
  const [filterCd, setFilterCd] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterWeek, setFilterWeek] = useState('all');
  const [filterIndicator, setFilterIndicator] = useState('all');

  const uniqueCds = useMemo(() => Array.from(new Set(indicators.map(i => i.cd))).sort(), [indicators]);
  const uniqueMonths = useMemo(() => Array.from(new Set(indicators.map(i => i.month))).sort(), [indicators]);
  const uniqueWeeks = useMemo(() => Array.from(new Set(indicators.map(i => i.week))).sort(), [indicators]);
  const uniqueIndicatorNames = useMemo(() => Array.from(new Set(indicators.map(i => i.indicator))).sort(), [indicators]);

  const filteredData = useMemo(() => {
    return indicators.filter(i => {
      const matchCd = filterCd === 'all' || i.cd === filterCd;
      const matchMonth = filterMonth === 'all' || i.month === filterMonth;
      const matchWeek = filterWeek === 'all' || i.week === filterWeek;
      const matchIndicator = filterIndicator === 'all' || i.indicator === filterIndicator;
      return matchCd && matchMonth && matchWeek && matchIndicator;
    });
  }, [indicators, filterCd, filterMonth, filterWeek, filterIndicator]);

  // Matrix structure: rows = indicators, columns = month > week
  const matrixData = useMemo(() => {
    const rows: Record<string, Record<string, { 
      monthly?: { actual: number, trigger: number, meta: number }, 
      weeks: Record<string, OperationalIndicator> 
    }>> = {};
    
    // Group weekly data
    indicators.forEach(item => {
      // Skip records that are already monthly summaries if they exist in the sheet
      const isMonthlyInSheet = !item.week || item.week.toUpperCase().includes('TOTAL') || item.week.toUpperCase() === item.month.toUpperCase();
      if (isMonthlyInSheet) return;

      if (!rows[item.indicator]) rows[item.indicator] = {};
      if (!rows[item.indicator][item.month]) rows[item.indicator][item.month] = { weeks: {} };
      
      rows[item.indicator][item.month].weeks[item.week] = item;
    });

    // Calculate monthly summaries based on user rules
    const indicatorsToSum = ['DOCUMENTOS VENCIDOS', 'COMPARENDOS', 'VARADAS EN RUTA'];
    
    Object.entries(rows).forEach(([indicatorName, months]) => {
      Object.entries(months).forEach(([monthName, data]) => {
        const weekItems = Object.values(data.weeks);
        if (weekItems.length === 0) return;

        const shouldSum = indicatorsToSum.some(name => indicatorName.toUpperCase().includes(name));
        
        if (shouldSum) {
          data.monthly = {
            actual: weekItems.reduce((acc, curr) => acc + curr.actual, 0),
            trigger: weekItems[0].trigger, // Take from first week as reference
            meta: weekItems[0].meta
          };
        } else {
          // Average
          data.monthly = {
            actual: parseFloat((weekItems.reduce((acc, curr) => acc + curr.actual, 0) / weekItems.length).toFixed(2)),
            trigger: weekItems[0].trigger,
            meta: weekItems[0].meta
          };
        }
      });
    });

    return rows;
  }, [indicators]);

  const monthsInMatrix = useMemo(() => {
    const months = new Set<string>();
    indicators.forEach(i => months.add(i.month));
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return Array.from(months).sort((a, b) => monthOrder.indexOf(a.toUpperCase()) - monthOrder.indexOf(b.toUpperCase()));
  }, [indicators]);

  const weeksPerMonth = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    indicators.forEach(i => {
      const isMonthly = !i.week || i.week.toUpperCase().includes('TOTAL') || i.week.toUpperCase() === i.month.toUpperCase();
      if (!isMonthly) {
        if (!mapping[i.month]) mapping[i.month] = [];
        if (!mapping[i.month].includes(i.week)) mapping[i.month].push(i.week);
      }
    });
    Object.keys(mapping).forEach(m => {
      mapping[m].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    });
    return mapping;
  }, [indicators]);

  const getStatusColor = (actual: number, trigger: number, meta: number, indicatorName: string) => {
    const indicatorsToSum = ['DOCUMENTOS VENCIDOS', 'COMPARENDOS', 'VARADAS EN RUTA'];
    const isSum = indicatorsToSum.some(name => indicatorName.toUpperCase().includes(name));

    if (isSum) {
      // Logic for SUM (Lower is better)
      // Green: Actual <= Meta
      // Red: Meta < Actual <= Trigger
      // Blue: Actual > Trigger
      if (actual <= meta) return 'bg-emerald-100 text-emerald-800';
      if (actual <= trigger) return 'bg-rose-100 text-rose-800';
      return 'bg-indigo-100 text-indigo-800';
    } else {
      // Logic for AVERAGE (Higher is better)
      // Green: Actual >= Meta
      // Red: Meta > Actual >= Trigger
      // Blue: Actual < Trigger
      if (actual >= meta) return 'bg-emerald-100 text-emerald-800';
      if (actual >= trigger) return 'bg-rose-100 text-rose-800';
      return 'bg-indigo-100 text-indigo-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Tablero Indicadores
          </h2>
          <p className="text-slate-500 mt-1">Matriz de control operativo - Vista Gerencial</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-slate-700 font-medium transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Centro de Distribución
          </label>
          <select 
            value={filterCd}
            onChange={(e) => setFilterCd(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todos los CDs</option>
            {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Mes
          </label>
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todos los Meses</option>
            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Semana
          </label>
          <select 
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todas las Semanas</option>
            {uniqueWeeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Indicador
          </label>
          <select 
            value={filterIndicator}
            onChange={(e) => setFilterIndicator(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todos los Indicadores</option>
            {uniqueIndicatorNames.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px] font-medium">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th colSpan={2} className="p-2 text-left font-bold text-slate-700 uppercase border-r border-slate-300 min-w-[180px]">
                  Tablero Indicadores
                </th>
                {monthsInMatrix.map(month => (
                  <th 
                    key={month} 
                    colSpan={(weeksPerMonth[month]?.length || 0) + 1}
                    className="p-1 text-center font-bold text-slate-800 uppercase border-r border-slate-300 bg-slate-200/50"
                  >
                    {month.substring(0, 3)}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-300">
                <th colSpan={2} className="border-r border-slate-300"></th>
                {monthsInMatrix.map(month => (
                  <React.Fragment key={month}>
                    <th className="p-1 text-center font-bold text-slate-600 uppercase border-r border-slate-300 bg-slate-100/50 min-w-[60px]">
                      {month.substring(0, 3)}
                    </th>
                    {weeksPerMonth[month]?.map(week => (
                      <th key={`${month}-${week}`} className="p-1 text-center font-bold text-slate-500 uppercase border-r border-slate-300 min-w-[60px]">
                        {week.replace('Semana ', 'Sem ')}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(matrixData).length === 0 ? (
                <tr>
                  <td colSpan={100} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p>No se encontraron datos para los filtros seleccionados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(matrixData).map(([indicatorName, months]) => (
                  <React.Fragment key={indicatorName}>
                    {/* Meta Row */}
                    <tr className="border-b border-slate-200">
                      <td rowSpan={3} className="p-2 font-bold text-slate-800 border-r border-slate-300 bg-white max-w-[150px] uppercase leading-tight">
                        {indicatorName}
                      </td>
                      <td className="p-1 font-bold text-slate-500 border-r border-slate-300 bg-slate-50 text-center">Meta</td>
                      {monthsInMatrix.map(month => (
                        <React.Fragment key={month}>
                          <td className="p-1 border-r border-slate-200 text-center text-slate-700 bg-slate-50/30">
                            {months[month]?.monthly ? `${months[month].monthly.meta}${indicatorName.includes('%') ? '%' : ''}` : ''}
                          </td>
                          {weeksPerMonth[month]?.map(week => (
                            <td key={`${month}-${week}`} className="p-1 border-r border-slate-200 text-center text-slate-600">
                              {months[month]?.weeks[week] ? `${months[month].weeks[week].meta}${indicatorName.includes('%') ? '%' : ''}` : ''}
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                    {/* Trigger Row */}
                    <tr className="border-b border-slate-200">
                      <td className="p-1 font-bold text-slate-500 border-r border-slate-300 bg-slate-50 text-center">Dis</td>
                      {monthsInMatrix.map(month => (
                        <React.Fragment key={month}>
                          <td className="p-1 border-r border-slate-200 text-center text-slate-700 bg-slate-50/30">
                            {months[month]?.monthly ? `${months[month].monthly.trigger}${indicatorName.includes('%') ? '%' : ''}` : ''}
                          </td>
                          {weeksPerMonth[month]?.map(week => (
                            <td key={`${month}-${week}`} className="p-1 border-r border-slate-200 text-center text-slate-600">
                              {months[month]?.weeks[week] ? `${months[month].weeks[week].trigger}${indicatorName.includes('%') ? '%' : ''}` : ''}
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                    {/* Actual Row */}
                    <tr className="border-b border-slate-300">
                      <td className="p-1 font-bold text-slate-500 border-r border-slate-300 bg-slate-50 text-center">Act</td>
                      {monthsInMatrix.map(month => (
                        <React.Fragment key={month}>
                          {/* Monthly Actual */}
                          <td className={`p-1 border-r border-slate-200 text-center font-bold ${months[month]?.monthly ? getStatusColor(months[month].monthly.actual, months[month].monthly.trigger, months[month].monthly.meta, indicatorName) : ''}`}>
                            {months[month]?.monthly ? `${months[month].monthly.actual}${indicatorName.includes('%') ? '%' : ''}` : ''}
                          </td>
                          {/* Weekly Actuals */}
                          {weeksPerMonth[month]?.map(week => {
                            const item = months[month]?.weeks[week];
                            if (!item) return <td key={`${month}-${week}`} className="p-1 border-r border-slate-200"></td>;
                            const statusClass = getStatusColor(item.actual, item.trigger, item.meta, indicatorName);
                            return (
                              <td key={`${month}-${week}`} className={`p-1 border-r border-slate-200 text-center font-bold ${statusClass}`}>
                                {item.actual}{indicatorName.includes('%') ? '%' : ''}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          <span className="text-xs font-medium text-slate-600">Cumple Meta (Verde)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" />
          <span className="text-xs font-medium text-slate-600">Entre Meta y Disparador (Rojo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-indigo-100 border border-indigo-300" />
          <span className="text-xs font-medium text-slate-600">Fuera de Rango / Crítico (Azul)</span>
        </div>
      </div>
    </div>
  );
};

export default OperationalDashboard;
