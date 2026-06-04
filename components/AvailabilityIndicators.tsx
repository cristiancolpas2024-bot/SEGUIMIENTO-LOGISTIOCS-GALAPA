import React, { useMemo, useState } from 'react';
import { Vehicle, AvailabilityRecord, FleetComposition, AvailabilitySummary } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Area, ReferenceLine, LabelList
} from 'recharts';
import { 
  Activity, Filter, Calendar, Building2, Users, Wrench, AlertTriangle, 
  ChevronLeft, ChevronRight, Download, Table as TableIcon, BarChart3, TrendingUp,
  Truck
} from 'lucide-react';
import { normalizePlate, normalizeStr } from '../utils';

interface AvailabilityIndicatorsProps {
  vehicles: Vehicle[];
  availabilityRecords: AvailabilityRecord[];
  availabilitySummary: AvailabilitySummary[];
  fleetComposition: FleetComposition[];
}

const AvailabilityIndicators: React.FC<AvailabilityIndicatorsProps> = ({
  vehicles,
  availabilityRecords,
  availabilitySummary,
  fleetComposition
}) => {
  // Filters
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterSystem, setFilterSystem] = useState('all');
  const [filterWorkshop, setFilterWorkshop] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '2026-01-01', end: new Date().toISOString().split('T')[0] });

  // Options for filters
  const cds = useMemo(() => Array.from(new Set(availabilityRecords.map(r => r.cdRegistro || r.cdOriginal).filter(Boolean))), [availabilityRecords]);
  const contractors = useMemo(() => {
    const fromBase = fleetComposition.map(fc => fc.contractor).filter(Boolean);
    const fromAvail = availabilityRecords.map(r => r.contratista).filter(Boolean);
    return Array.from(new Set([...fromBase, ...fromAvail])).sort();
  }, [fleetComposition, availabilityRecords]);
  const systems = useMemo(() => Array.from(new Set(availabilityRecords.map(r => r.sistema).filter(Boolean))), [availabilityRecords]);
  const workshops = useMemo(() => Array.from(new Set(availabilityRecords.map(r => r.taller).filter(Boolean))), [availabilityRecords]);

  // Filtered Data (for failures/frequency analysis)
  const filteredRecords = useMemo(() => {
    return availabilityRecords.filter(r => {
      const matchCd = filterCd === 'all' || 
                      (r.cdRegistro && r.cdRegistro.toUpperCase().includes(filterCd.toUpperCase())) ||
                      (r.cdOriginal && r.cdOriginal.toUpperCase().includes(filterCd.toUpperCase()));
      const matchContractor = filterContractor === 'all' || 
                               (r.contratista && r.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
      const matchSystem = filterSystem === 'all' || r.sistema === filterSystem;
      const matchWorkshop = filterWorkshop === 'all' || r.taller === filterWorkshop;
      
      let matchDate = true;
      if (dateRange.start && dateRange.end && r.fecha) {
        matchDate = r.fecha >= dateRange.start && r.fecha <= dateRange.end;
      }
      
      const matchStatus = r.vehiculoIndisponible === 1;
      
      return matchCd && matchContractor && matchSystem && matchWorkshop && matchDate && matchStatus;
    });
  }, [availabilityRecords, filterCd, filterContractor, filterSystem, filterWorkshop, dateRange]);

  // Filtered Summary Data (The new source of truth for charts)
  const filteredSummary = useMemo(() => {
    return availabilitySummary.filter(s => {
      const matchCd = filterCd === 'all' || 
                      (s.cd && s.cd.toUpperCase().includes(filterCd.toUpperCase()));
      const matchContractor = filterContractor === 'all' || 
                               (s.contratista && s.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
      
      let matchDate = true;
      if (dateRange.start && dateRange.end && s.fecha) {
        matchDate = s.fecha >= dateRange.start && s.fecha <= dateRange.end;
      }
      
      return matchCd && matchContractor && matchDate;
    });
  }, [availabilitySummary, filterCd, filterContractor, dateRange]);

  // Daily Stats from SUMMARY
  const summaryDailyStats = useMemo(() => {
    const dates = Array.from(new Set(filteredSummary.map(s => s.fecha))).sort();
    const cdsToTrack = ['GALAPA', 'LA ARENOSA'];

    return dates.map(date => {
      const dayData = filteredSummary.filter(s => s.fecha === date);
      if (dayData.length === 0) return { date, availability: 0 };

      // Average availability for the day (respecting filters)
      const totalAvailable = dayData.reduce((sum, s) => sum + s.disponibles, 0);
      const totalFleet = dayData.reduce((sum, s) => sum + s.total, 0);
      const dayAvg = totalFleet > 0 ? (totalAvailable / totalFleet) * 100 : 0;

      const stats: any = { 
        date, 
        availability: parseFloat(dayAvg.toFixed(2))
      };

      // Specific CD stats (regardless of filterCd, but respecting contractor filter)
      cdsToTrack.forEach(cdName => {
        const cdKey = cdName === 'LA ARENOSA' ? 'ARENOSA' : cdName;
        // Re-filter from the main summary to get CD specific even if filterCd is something else
        const cdDayData = availabilitySummary.filter(s => 
          s.fecha === date && 
          s.cd.toUpperCase().includes(cdKey) &&
          (filterContractor === 'all' || s.contratista.toUpperCase().includes(filterContractor.toUpperCase()))
        );

        if (cdDayData.length > 0) {
          const cdTotalAvailable = cdDayData.reduce((sum, s) => sum + s.disponibles, 0);
          const cdTotalFleet = cdDayData.reduce((sum, s) => sum + s.total, 0);
          stats[cdName] = parseFloat((cdTotalFleet > 0 ? (cdTotalAvailable / cdTotalFleet) * 100 : 100).toFixed(2));
        } else {
          stats[cdName] = null; // Use null so charts don't drop to 0 if data missing for a day
        }
      });

      return stats;
    });
  }, [filteredSummary, availabilitySummary, filterContractor]);

  // Weekly Stats from SUMMARY
  const summaryWeeklyStats = useMemo(() => {
    const weeks: Record<string, { totalDispo: number, totalFleet: number, cds: Record<string, { totalDispo: number, totalFleet: number }> }> = {};
    
    const getWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    filteredSummary.forEach(s => {
      const weekNum = getWeek(s.fecha);
      if (!weeks[weekNum]) weeks[weekNum] = { totalDispo: 0, totalFleet: 0, cds: {} };
      
      weeks[weekNum].totalDispo += s.disponibles;
      weeks[weekNum].totalFleet += s.total;

      // Track by CD properly
      let cdLabel = s.cd.toUpperCase();
      if (cdLabel.includes('GALAPA')) cdLabel = 'GALAPA';
      if (cdLabel.includes('ARENOSA')) cdLabel = 'LA ARENOSA';

      if (!weeks[weekNum].cds[cdLabel]) weeks[weekNum].cds[cdLabel] = { totalDispo: 0, totalFleet: 0 };
      weeks[weekNum].cds[cdLabel].totalDispo += s.disponibles;
      weeks[weekNum].cds[cdLabel].totalFleet += s.total;
    });

    return Object.entries(weeks).map(([week, data]) => {
      const weekResult: any = { 
        name: `SEM ${week}`, 
        availability: parseFloat((data.totalFleet > 0 ? (data.totalDispo / data.totalFleet) * 100 : 0).toFixed(2))
      };

      Object.entries(data.cds).forEach(([cd, cdData]) => {
        weekResult[cd] = parseFloat((cdData.totalFleet > 0 ? (cdData.totalDispo / cdData.totalFleet) * 100 : 0).toFixed(2));
      });

      return weekResult;
    }).sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));
  }, [filteredSummary]);

  // Monthly Stats from SUMMARY
  const summaryMonthlyStats = useMemo(() => {
    const monthsMap: Record<string, number> = {
      'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3, 'MAYO': 4, 'JUNIO': 5, 
      'JULIO': 6, 'AGOSTO': 7, 'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11
    };
    const months: Record<string, { totalDispo: number, totalFleet: number, cds: Record<string, { totalDispo: number, totalFleet: number }> }> = {};
    const monthNames = Object.keys(monthsMap);

    filteredSummary.forEach(s => {
      const date = new Date(s.fecha);
      const monthName = monthNames[date.getMonth()];
      
      if (!months[monthName]) months[monthName] = { totalDispo: 0, totalFleet: 0, cds: {} };
      
      months[monthName].totalDispo += s.disponibles;
      months[monthName].totalFleet += s.total;

      let cdLabel = s.cd.toUpperCase();
      if (cdLabel.includes('GALAPA')) cdLabel = 'GALAPA';
      if (cdLabel.includes('ARENOSA')) cdLabel = 'LA ARENOSA';

      if (!months[monthName].cds[cdLabel]) months[monthName].cds[cdLabel] = { totalDispo: 0, totalFleet: 0 };
      months[monthName].cds[cdLabel].totalDispo += s.disponibles;
      months[monthName].cds[cdLabel].totalFleet += s.total;
    });

    return Object.entries(months).map(([month, data]) => {
      const monthResult: any = { 
        name: month, 
        availability: parseFloat((data.totalFleet > 0 ? (data.totalDispo / data.totalFleet) * 100 : 0).toFixed(2))
      };

      Object.entries(data.cds).forEach(([cd, cdData]) => {
        monthResult[cd] = parseFloat((cdData.totalFleet > 0 ? (cdData.totalDispo / cdData.totalFleet) * 100 : 0).toFixed(2));
      });

      return monthResult;
    }).sort((a, b) => monthsMap[a.name] - monthsMap[b.name]);
  }, [filteredSummary]);

  // Stats & Indicators
  const indicators = useMemo(() => {
    if (filteredRecords.length === 0) return { topSystem: 'N/A', topWorkshop: 'N/A' };

    const systemCounts: Record<string, number> = {};
    const workshopCounts: Record<string, number> = {};

    filteredRecords.forEach(r => {
      if (r.sistema) systemCounts[r.sistema] = (systemCounts[r.sistema] || 0) + 1;
      if (r.taller) workshopCounts[r.taller] = (workshopCounts[r.taller] || 0) + 1;
    });

    const topSystem = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topWorkshop = Object.entries(workshopCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { topSystem, topWorkshop };
  }, [filteredRecords]);

  const dailyStats = useMemo(() => {
    // 1. Generate ALL dates in the range
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const dates: string[] = [];
    const curr = new Date(start);
    
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const cdsToTrack = ['GALAPA', 'LA ARENOSA']; // Priority CDs as requested by user
    
    const getReportedBase = (cdKey: string, contractor: string) => {
      const records = availabilityRecords.filter(r => 
        (r.cdRegistro?.toUpperCase().includes(cdKey.toUpperCase()) || r.cdOriginal?.toUpperCase().includes(cdKey.toUpperCase())) &&
        (contractor === 'all' || r.contratista?.toUpperCase().includes(contractor.toUpperCase()))
      );
      const bases = records.map(r => r.totalVH).filter(v => v > 0);
      if (bases.length > 0) {
        const counts: any = {};
        bases.forEach(b => counts[b] = (counts[b] || 0) + 1);
        return parseFloat(Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0][0]);
      }
      return fleetComposition.filter(fc => 
        fc.cd?.toUpperCase().includes(cdKey.toUpperCase()) &&
        (contractor === 'all' || fc.contractor?.toUpperCase().includes(contractor.toUpperCase()))
      ).reduce((sum, fc) => sum + fc.count, 0) || (cdKey.includes('GALAPA') ? 122 : 105);
    };

    return dates.map(date => {
      const dayRecords = availabilityRecords.filter(r => r.fecha === date);
      const stats: any = { date };
      
      // Dynamic Overall Base
      const cdFilterKey = filterCd === 'all' ? '' : filterCd.toUpperCase();
      const overallBase = (cdFilterKey.includes('GALAPA') || cdFilterKey === '') ? getReportedBase('GALAPA', filterContractor) : 0;
      const secondBase = (cdFilterKey.includes('ARENOSA') || cdFilterKey === '') ? getReportedBase('ARENOSA', filterContractor) : 0;
      const totalFleet = (overallBase + secondBase) || 1;

      const uGOverall = new Set(dayRecords.filter(r => {
        const matchCd = (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA'));
        const matchContractor = filterContractor === 'all' || (r.contratista && r.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
        return matchCd && matchContractor && r.vehiculoIndisponible === 1;
      }).map(r => r.placasKey)).size;

      const uAOverall = new Set(dayRecords.filter(r => {
        const matchCd = (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA'));
        const matchContractor = filterContractor === 'all' || (r.contratista && r.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
        return matchCd && matchContractor && r.vehiculoIndisponible === 1;
      }).map(r => r.placasKey)).size;

      const unavailableTotal = (cdFilterKey.includes('GALAPA') || cdFilterKey === '' ? uGOverall : 0) + 
                               (cdFilterKey.includes('ARENOSA') || cdFilterKey === '' ? uAOverall : 0);

      stats.availability = parseFloat(((totalFleet - unavailableTotal) / totalFleet * 100).toFixed(2));

      // CD specific stats for charts - these show regardless of filterCd (but respect contractor)
      cdsToTrack.forEach((cdName: string) => {
        const cdKey = cdName === 'LA ARENOSA' ? 'ARENOSA' : cdName;
        const cdFleet = getReportedBase(cdKey, filterContractor);
        
        if (cdFleet > 0) {
          const cdUnavailable = new Set(dayRecords.filter(r => {
            const rCd = (r.cdRegistro || r.cdOriginal || '').toUpperCase();
            const matchCd = rCd.includes(cdKey.toUpperCase());
            const matchContractor = filterContractor === 'all' || (r.contratista && r.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
            return matchCd && matchContractor && r.vehiculoIndisponible === 1;
          }).map(r => r.placasKey)).size;
          stats[cdName] = parseFloat(((cdFleet - cdUnavailable) / cdFleet * 100).toFixed(2));
        } else {
          stats[cdName] = 100;
        }
      });

      return stats;
    });
  }, [availabilityRecords, fleetComposition, filterCd, filterContractor, dateRange]);

  // Weekly Stats using Column U (semana)
  const weeklyStats = useMemo(() => {
    const weeks: Record<string, { sum: number, count: number, cds: Record<string, { sum: number, count: number }> }> = {};
    
    // Map each date in dailyStats to its semana from availabilityRecords or calculate it
    const dateToWeek: Record<string, string> = {};
    availabilityRecords.forEach(r => {
      if (r.fecha && r.semana && !dateToWeek[r.fecha]) {
        dateToWeek[r.fecha] = r.semana;
      }
    });

    const getFallBackWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      const w = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      return `${w}`;
    };

    dailyStats.forEach(d => {
      const weekKey = dateToWeek[d.date] || getFallBackWeek(d.date);
      
      if (!weeks[weekKey]) weeks[weekKey] = { sum: 0, count: 0, cds: {} };
      weeks[weekKey].sum += d.availability;
      weeks[weekKey].count += 1;

      // Track all CD properties found in dailyStats
      Object.keys(d).forEach(key => {
        if (key !== 'date' && key !== 'availability' && d[key] !== null) {
          if (!weeks[weekKey].cds[key]) weeks[weekKey].cds[key] = { sum: 0, count: 0 };
          weeks[weekKey].cds[key].sum += d[key];
          weeks[weekKey].cds[key].count += 1;
        }
      });
    });

    return Object.entries(weeks).map(([name, data]) => {
      const result: any = { name: `SEM ${name}`, availability: Number((data.sum / data.count).toFixed(2)) };
      Object.entries(data.cds).forEach(([cd, cdData]) => {
        result[cd] = Number((cdData.sum / cdData.count).toFixed(2));
      });
      return result;
    }).sort((a, b) => {
      const numA = parseInt(a.name.replace('SEM ', ''));
      const numB = parseInt(b.name.replace('SEM ', ''));
      return numA - numB;
    });
  }, [dailyStats, availabilityRecords]);

  // Monthly Stats using Column T (mes)
  const monthlyStats = useMemo(() => {
    const monthsMap: Record<string, number> = {
      'ENERO': 0, 'ENE': 0, 'FEBRERO': 1, 'FEB': 1, 'MARZO': 2, 'MAR': 2,
      'ABRIL': 3, 'ABR': 3, 'MAYO': 4, 'MAY': 4, 'JUNIO': 5, 'JUN': 5,
      'JULIO': 6, 'JUL': 6, 'AGOSTO': 7, 'AGO': 7, 'SEPTIEMBRE': 8, 'SEP': 8,
      'OCTUBRE': 9, 'OCT': 9, 'NOVIEMBRE': 10, 'NOV': 10, 'DICIEMBRE': 11, 'DIC': 11
    };
    const months: Record<string, { sum: number, count: number, cds: Record<string, { sum: number, count: number }> }> = {};
    
    // Map each date in dailyStats to its mes from availabilityRecords or calculate it
    const dateToMonth: Record<string, string> = {};
    availabilityRecords.forEach(r => {
      if (r.fecha && r.mes && !dateToMonth[r.fecha]) {
        dateToMonth[r.fecha] = r.mes;
      }
    });

    const getFallBackMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      const mNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      return mNames[d.getMonth()];
    };

    dailyStats.forEach(d => {
      const monthKey = (dateToMonth[d.date] || getFallBackMonth(d.date)).toUpperCase();
      
      if (!months[monthKey]) months[monthKey] = { sum: 0, count: 0, cds: {} };
      months[monthKey].sum += d.availability;
      months[monthKey].count += 1;

      // Track all CD properties found in dailyStats
      Object.keys(d).forEach(key => {
        if (key !== 'date' && key !== 'availability' && d[key] !== null) {
          if (!months[monthKey].cds[key]) months[monthKey].cds[key] = { sum: 0, count: 0 };
          months[monthKey].cds[key].sum += d[key];
          months[monthKey].cds[key].count += 1;
        }
      });
    });

    return Object.entries(months).map(([name, data]) => {
      const result: any = { name, availability: Number((data.sum / data.count).toFixed(2)) };
      Object.entries(data.cds).forEach(([cd, cdData]) => {
        result[cd] = Number((cdData.sum / cdData.count).toFixed(2));
      });
      return result;
    }).sort((a, b) => {
      const valA = monthsMap[a.name];
      const valB = monthsMap[b.name];
      return (valA ?? 0) - (valB ?? 0);
    });
  }, [dailyStats, availabilityRecords]);

  const chartCds = useMemo(() => {
    const cdsSet = new Set<string>();
    filteredRecords.forEach(r => {
      const cd = (r.cdRegistro || r.cdOriginal || 'SIN CD').toUpperCase();
      if (cd.includes('GALAPA')) cdsSet.add('GALAPA');
      else if (cd.includes('ARENOSA')) cdsSet.add('LA ARENOSA');
      else cdsSet.add(cd);
    });
    return Array.from(cdsSet).sort();
  }, [filteredRecords]);

  const COLORS = {
    GALAPA: '#6366F1',
    LA_ARENOSA: '#F97316',
    META: '#EF4444',
    GRID: '#F1F5F9',
    TEXT: '#64748B',
    TOOLTIP: '#0F172A'
  };

  const getCdColor = (cd: string) => {
    const upperCd = cd.toUpperCase();
    if (upperCd.includes('GALAPA')) return COLORS.GALAPA;
    if (upperCd.includes('ARENOSA')) return COLORS.LA_ARENOSA;
    return '#94A3B8'; // default slate-400
  };

  // Frequency Data (Count of reports)
  const systemFrequencyData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredRecords.forEach(r => {
      let system = r.sistema?.trim() || 'SIN SISTEMA';
      system = system.toUpperCase();
      let cd = (r.cdRegistro || r.cdOriginal || 'SIN CD').toUpperCase();
      if (cd.includes('GALAPA')) cd = 'GALAPA';
      else if (cd.includes('ARENOSA')) cd = 'LA ARENOSA';

      if (!dataMap[system]) dataMap[system] = {};
      dataMap[system][cd] = (dataMap[system][cd] || 0) + 1;
    });
    
    const getSum = (obj: any) => Object.entries(obj)
      .filter(([k, v]) => k !== 'name' && typeof v === 'number')
      .reduce((sum, [k, v]) => sum + (v as number), 0);

    return Object.entries(dataMap).map(([system, cdsData]) => ({
      name: system,
      ...cdsData
    }))
    .sort((a, b) => getSum(b) - getSum(a)) // Highest at index 0 (top of chart)
    .slice(0, 15); // Show top 15
  }, [filteredRecords]);

  const workshopFrequencyData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredRecords.forEach(r => {
      let workshop = r.taller?.trim() || 'SIN TALLER';
      workshop = workshop.toUpperCase();
      let cd = (r.cdRegistro || r.cdOriginal || 'SIN CD').toUpperCase();
      if (cd.includes('GALAPA')) cd = 'GALAPA';
      else if (cd.includes('ARENOSA')) cd = 'LA ARENOSA';

      if (!dataMap[workshop]) dataMap[workshop] = {};
      dataMap[workshop][cd] = (dataMap[workshop][cd] || 0) + 1;
    });

    const getSum = (obj: any) => Object.entries(obj)
      .filter(([k, v]) => k !== 'name' && typeof v === 'number')
      .reduce((sum, [k, v]) => sum + (v as number), 0);

    return Object.entries(dataMap).map(([workshop, cdsData]) => ({
      name: workshop,
      ...cdsData
    }))
    .sort((a, b) => getSum(b) - getSum(a))
    .slice(0, 10); // Show top 10
  }, [filteredRecords]);

  const plateFrequencyData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredRecords.forEach(r => {
      let plate = r.placa?.trim() || 'N/A';
      plate = plate.toUpperCase();
      let cd = (r.cdRegistro || r.cdOriginal || 'SIN CD').toUpperCase();
      if (cd.includes('GALAPA')) cd = 'GALAPA';
      else if (cd.includes('ARENOSA')) cd = 'LA ARENOSA';

      if (!dataMap[plate]) dataMap[plate] = {};
      dataMap[plate][cd] = (dataMap[plate][cd] || 0) + 1;
    });

    const getSum = (obj: any) => Object.entries(obj)
      .filter(([k, v]) => k !== 'name' && typeof v === 'number')
      .reduce((sum, [k, v]) => sum + (v as number), 0);

    return Object.entries(dataMap).map(([plate, cdsData]) => ({
      name: plate,
      ...cdsData
    }))
    .sort((a, b) => getSum(b) - getSum(a))
    .slice(0, 12);
  }, [filteredRecords]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid TZ issues
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      return `${day}-${months[date.getMonth()]}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <TrendingUp size={40} className="text-indigo-600" /> Disponibilidad
          </h2>
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Análisis operativo basado en disponibilidad</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CD</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterCd}
              onChange={(e) => setFilterCd(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[160px]"
            >
              <option value="all">Todos los CD</option>
              {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contratista</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterContractor}
              onChange={(e) => setFilterContractor(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[180px]"
            >
              <option value="all">Todos los Contratistas</option>
              {contractors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sistema</label>
          <div className="relative">
            <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[160px]"
            >
              <option value="all">Todos los Sistemas</option>
              {systems.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taller</label>
          <div className="relative">
            <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterWorkshop}
              onChange={(e) => setFilterWorkshop(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[160px]"
            >
              <option value="all">Todos los Talleres</option>
              {workshops.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango de Fechas</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-xs font-black">A</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
      {/* Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Activity size={120} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Disponibilidad Promedio</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-extrabold" style={{ fontSize: '3.5rem', lineHeight: '1' }}>
              {summaryDailyStats.length > 0 
                ? (summaryDailyStats.reduce((acc, curr) => acc + curr.availability, 0) / summaryDailyStats.length).toFixed(1) 
                : '0.0'}%
            </h3>
          </div>
          <p className="text-[10px] mt-4 font-bold opacity-60 uppercase tracking-widest">Basado en periodo seleccionado</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 border-l-[10px] border-l-[#6366F1] shadow-xl shadow-indigo-100/50 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sistema con más fallas</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{indicators.topSystem}</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-rose-500">
            <AlertTriangle size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Crítico para mantenimiento</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 border-l-[10px] border-l-[#6366F1] shadow-xl shadow-indigo-100/50 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taller con más reportes</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{indicators.topWorkshop}</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-indigo-500">
            <Wrench size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Mayor flujo de vehículos</span>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Disponibilidad Diaria (%)
            </h3>
          </div>
          <div style={{ position: 'relative', height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryDailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.GRID} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: COLORS.TEXT, fontSize: 9, fontWeight: 700 }}
                  tickFormatter={formatDateLabel}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: COLORS.TEXT, fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: COLORS.TOOLTIP,
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  labelStyle={{ fontWeight: 900, fontSize: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <ReferenceLine y={92} stroke={COLORS.META} strokeWidth={2} strokeDasharray="5 5" label={{ position: 'right', value: 'META 92%', fill: COLORS.META, fontSize: 10, fontWeight: 900 }} />
                <Line 
                  name="GENERAL"
                  type="monotone" 
                  dataKey="availability" 
                  stroke={COLORS.TEXT} 
                  strokeWidth={1} 
                  strokeDasharray="5 5"
                  dot={false}
                  tension={0.3}
                />
                {['GALAPA', 'LA ARENOSA'].map((cd) => (
                  <Line 
                    key={cd}
                    name={cd}
                    type="monotone" 
                    dataKey={cd} 
                    stroke={getCdColor(cd)} 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: getCdColor(cd), strokeWidth: 0 }}
                    tension={0.3}
                    connectNulls
                  >
                    <LabelList 
                      dataKey={cd} 
                      position="top" 
                      content={(props: any) => {
                        const { x, y, value, index, data } = props;
                        if (value === null || value === undefined) return null;
                        // Avoid overcrowding: only show first, last, and points that change significantly, 
                        // or just show them every 5 points.
                        if (index % 5 !== 0 && index !== (data?.length || 0) - 1) return null;
                        
                        return (
                          <text 
                            x={x} 
                            y={y - 12} 
                            fill={getCdColor(cd)} 
                            fontSize={8} 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {Math.round(value)}%
                          </text>
                        );
                      }}
                    />
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" /> Disponibilidad Semanal (%)
            </h3>
          </div>
          <div style={{ position: 'relative', height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryWeeklyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.GRID} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: COLORS.TEXT, fontSize: 9, fontWeight: 700 }} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: COLORS.TEXT, fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: COLORS.TOOLTIP, color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                <ReferenceLine y={92} stroke={COLORS.META} strokeWidth={2} strokeDasharray="5 5" />
                {['GALAPA', 'LA ARENOSA'].map((cd) => (
                  <Bar 
                    key={cd}
                    dataKey={cd} 
                    name={cd} 
                    fill={getCdColor(cd)} 
                    radius={[4, 4, 0, 0]} 
                    barSize={25} 
                  >
                    <LabelList 
                      dataKey={cd} 
                      position="top" 
                      style={{ fill: getCdColor(cd), fontSize: 9, fontWeight: 900 }} 
                      formatter={(v: number) => `${v}%`}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Disponibilidad Mensual (%)
          </h3>
        </div>
        <div style={{ position: 'relative', height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryMonthlyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.GRID} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: COLORS.TEXT, fontSize: 10, fontWeight: 700 }} 
              />
              <YAxis 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: COLORS.TEXT, fontSize: 10, fontWeight: 700 }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: COLORS.TOOLTIP, color: '#fff' }}
                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
              <ReferenceLine y={92} stroke={COLORS.META} strokeWidth={2} strokeDasharray="5 5" />
              {['GALAPA', 'LA ARENOSA'].map((cd) => (
                <Bar 
                  key={cd}
                  dataKey={cd} 
                  name={cd} 
                  fill={getCdColor(cd)} 
                  radius={[6, 6, 0, 0]} 
                  barSize={40} 
                >
                  <LabelList 
                    dataKey={cd} 
                    position="top" 
                    style={{ fill: getCdColor(cd), fontSize: 10, fontWeight: 900 }} 
                    formatter={(v: number) => `${v}%`}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Frequency Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-px flex-1 bg-slate-200"></div>
          <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.3em]">Frecuencia de Reportes (Veces)</h2>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Frequency Chart */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" /> Frecuencia por Sistema
              </h3>
            </div>
            <div style={{ position: 'relative', height: '380px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={systemFrequencyData} margin={{ left: 40, right: 30 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={COLORS.GRID} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: COLORS.TEXT, fontSize: 10 }} />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: COLORS.TEXT, fontSize: 8, fontWeight: 800 }}
                    width={100}
                    interval={0}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: COLORS.TOOLTIP, color: '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  {chartCds.map(cd => (
                    <Bar key={cd} dataKey={cd} name={cd} fill={getCdColor(cd)} radius={[0, 4, 4, 0]}>
                      <LabelList 
                        dataKey={cd} 
                        position="right" 
                        style={{ fill: getCdColor(cd), fontSize: 9, fontWeight: 900 }} 
                        formatter={(v: number) => v > 0 ? v : ''}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workshop Frequency Chart */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Wrench size={18} className="text-indigo-600" /> Frecuencia por Taller
              </h3>
            </div>
            <div style={{ position: 'relative', height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={workshopFrequencyData} margin={{ left: 40, right: 30 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={COLORS.GRID} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: COLORS.TEXT, fontSize: 10 }} />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: COLORS.TEXT, fontSize: 8, fontWeight: 800 }}
                    width={100}
                    interval={0}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: COLORS.TOOLTIP, color: '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  {chartCds.map(cd => (
                    <Bar key={cd} dataKey={cd} name={cd} fill={getCdColor(cd)} radius={[0, 4, 4, 0]}>
                      <LabelList 
                        dataKey={cd} 
                        position="right" 
                        style={{ fill: getCdColor(cd), fontSize: 9, fontWeight: 900 }} 
                        formatter={(v: number) => v > 0 ? v : ''}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Plate Frequency Chart */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Truck size={18} className="text-indigo-600" /> Frecuencia por Placa
            </h3>
          </div>
          <div style={{ position: 'relative', height: '340px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={plateFrequencyData} margin={{ left: 40, right: 30 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={COLORS.GRID} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: COLORS.TEXT, fontSize: 10 }} />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: COLORS.TEXT, fontSize: 8, fontWeight: 800 }}
                  width={100}
                  interval={0}
                />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: COLORS.TOOLTIP, color: '#fff' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                {chartCds.map(cd => (
                  <Bar key={cd} dataKey={cd} name={cd} fill={getCdColor(cd)} radius={[0, 4, 4, 0]}>
                    <LabelList 
                      dataKey={cd} 
                      position="right" 
                      style={{ fill: getCdColor(cd), fontSize: 9, fontWeight: 900 }} 
                      formatter={(v: number) => v > 0 ? v : ''}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <TableIcon size={18} className="text-indigo-600" /> Reporte Detallado de Indisponibilidad
          </h3>
          <span className="bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            {filteredRecords.length} Registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">CD</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sistema</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Placa</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Novedad</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Taller</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ingreso</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{r.fecha}</td>
                  <td className="px-6 py-4 text-xs font-black text-slate-900">{r.cdRegistro || 'SIN CD'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {r.sistema}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono font-black text-xs tracking-tighter">
                      {r.placa}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate font-medium" title={r.detalle}>
                    {r.detalle}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{r.taller}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{r.fechaIngreso}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                      r.diasIndisponible > 5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {r.diasIndisponible}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-black uppercase tracking-widest text-sm">
                    No hay registros para los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityIndicators;
