
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Driver, Report, MileageLog, Calibration, WashReport, Fine, Preventive, AvailabilityRecord, FleetComposition, OperationalIndicator, CheckList, FuelPerformance, PlateAdherence, Corrective, UnavailabilityRecord, OperatorRecord, ControlTowerRecord, AuditRecord, AuditMasterVehicle, FleetListRecord, AvailabilitySummary, FleetStandardAudit, InventoryRecord } from './types';
import DocumentCard from './components/DocumentCard';
import DocumentViewer from './components/DocumentViewer';
import DriverStats from './components/DriverStats';
import DriverCard from './components/DriverCard';
import FineStats from './components/FineStats';
import MonthlyReport from './components/MonthlyReport';
import FineCard from './components/FineCard';
import FineForm from './components/FineForm';
import FineSupportForm from './components/FineSupportForm';
import ReportCard from './components/ReportCard';
import ReportForm from './components/ReportForm';
import VehicleStats from './components/VehicleStats';
import ClosureForm from './components/ClosureForm';
import WorkshopEntryForm from './components/WorkshopEntryForm';
import WashCard from './components/WashCard';
import WashStats from './components/WashStats';
import WashForm from './components/WashForm';
import CleaningForm from './components/CleaningForm';
import CleaningCalendar from './components/CleaningCalendar';
import CalibrationCard from './components/CalibrationCard';
import CalibrationForm from './components/CalibrationForm';
import CalibrationStats from './components/CalibrationStats';
import CalibrationCalendar from './components/CalibrationCalendar';
import MileageEntryForm from './components/MileageEntryForm';
import WorkshopVisitItem from './components/WorkshopVisitItem';
import WorkshopStats from './components/WorkshopStats';
import WorkshopVisitClosureForm from './components/WorkshopVisitClosureForm';
import WorkshopModule from './components/WorkshopModule';
import DocumentUpdateForm from './components/DocumentUpdateForm';
import WorkshopCalendar from './components/WorkshopCalendar';
import WashCalendar from './components/WashCalendar';
import Dashboard from './components/Dashboard';
import PreventiveMaintenanceModule from './components/PreventiveMaintenanceModule';
import AvailabilityModule from './components/AvailabilityModule';
import AvailabilityIndicators from './components/AvailabilityIndicators';
import OperationalDashboard from './components/OperationalDashboard';
import CheckListModule from './components/CheckListModule';
import FuelPerformanceModule from './components/FuelPerformanceModule';
import PlateAdherenceModule from './components/PlateAdherenceModule';
import FleetLinksModule from './components/FleetLinksModule';
import CorrectivesModule from './components/CorrectivesModule';
import UnavailabilityModule from './components/UnavailabilityModule';
import OperatorsModule from './components/OperatorsModule';
import ControlTowerModule from './components/ControlTowerModule';
import FleetStandardModule from './components/FleetStandardModule';
import ExecutiveAuditDashboard from './components/ExecutiveAuditDashboard';
import CalibrationVisuals from './components/CalibrationVisuals';
import InventoryModule from './components/InventoryModule';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, ReferenceLine, LabelList
} from 'recharts';

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchFinesFromSheet,
  fetchReportsFromSheet,
  fetchWashReportsFromSheet,
  fetchCleaningReportsFromSheet,
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  fetchWorkshopVisitsFromSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitWashToSheet,
  submitCleaningToSheet,
  submitFineToSheet,
  submitCalibrationToSheet,
  submitCalibrationUpdateToSheet,
  submitDocumentUpdateToSheet,
  submitWorkshopVisitUpdateToSheet,
  fetchPreventivesFromSheet,
  fetchAvailabilityFromSheet,
  fetchOperationalIndicatorsFromSheet,
  fetchCheckListFromSheet,
  fetchFuelPerformanceFromSheet,
  fetchPlateAdherenceFromSheet,
  fetchCorrectivesFromSheet,
  fetchUnavailabilityFromSheet,
  fetchOperatorsFromSheet,
  fetchControlTowerFromSheet,
  fetchAuditRecordsFromSheet,
  fetchAvailabilitySummaryFromSheet,
  fetchFleetStandardAuditFromSheet,
  fetchInventoryFromSheet
} from './services/sheetService';

import { normalizePlate, normalizeStr, getWeekNumber } from './utils';
import { 
  RefreshCw, Users, Truck, Search, Shield, ShieldCheck, Gavel, Menu, LogOut, Loader2, 
  Building2, ListFilter, CalendarDays, ClipboardList, Sparkles, Droplets, 
  Disc, Store, Gauge, Plus, History, Filter, Hash, Calendar, Clock, MapPin,
  UserCircle, LayoutGrid, Settings, ChevronLeft, ChevronDown, ChevronUp, Wrench, Lock, X, TrendingUp, Activity, Fuel, ClipboardCheck, Link as LinkIcon, AlertTriangle, Zap, Package
} from 'lucide-react';

type AppMode = 'root_menu' | 'flota_menu' | 'camiones' | 'montacargas' | 'talleres';
type ActiveView = 'vehiculos' | 'conductores' | 'comparendos' | 'kilometrajes' | 'novedades' | 'fives' | 'lavados' | 'limpieza' | 'calibraciones' | 'visitas' | 'disponibilidad' | 'indicadoresDisponibilidad' | 'indicadoresOperativos' | 'checklist' | 'rendimiento' | 'adherencia' | 'enlaces' | 'correctivos' | 'indisponibilidad' | 'operadores' | 'torre_preventivos' | 'estandar_flota' | 'auditoria_calidad_seguridad' | 'inventario';

function getCachedData<T>(key: string, defaultValue: T): T {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    return cached ? JSON.parse(cached) : defaultValue;
  } catch (e) {
    console.warn(`Error reading cache for ${key}:`, e);
    return defaultValue;
  }
}

function setCachedData(key: string, data: any): void {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Error writing cache for ${key}:`, e);
  }
}

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('camiones');
  const [activeView, setActiveView] = useState<ActiveView>('kilometrajes');
  const [expandedSection, setExpandedSection] = useState<string | null>('gestion');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterWorkshop, setFilterWorkshop] = useState('all');
  
  const [reportViewMode, setReportViewMode] = useState<'grid' | 'table'>('grid');
  const [vehicleViewMode, setVehicleViewMode] = useState<'grid' | 'table'>('grid');
  const [driverViewMode, setDriverViewMode] = useState<'grid' | 'table'>('grid');
  
  // Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCachedData('vehicles', []));
  const [drivers, setDrivers] = useState<Driver[]>(() => getCachedData('drivers', []));
  const [fines, setFines] = useState<Fine[]>(() => getCachedData('fines', []));
  const [reports, setReports] = useState<Report[]>(() => getCachedData('reports', []));
  const [washReports, setWashReports] = useState<WashReport[]>(() => getCachedData('washReports', []));
  const [cleaningReports, setCleaningReports] = useState<WashReport[]>(() => getCachedData('cleaningReports', []));
  const [calibrations, setCalibrations] = useState<Calibration[]>(() => getCachedData('calibrations', []));
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>(() => getCachedData('mileageLogs', []));
  const [workshopVisits, setWorkshopVisits] = useState<Report[]>(() => getCachedData('workshopVisits', []));
  const [preventives, setPreventives] = useState<Preventive[]>(() => getCachedData('preventives', []));
  const [availabilityRecords, setAvailabilityRecords] = useState<AvailabilityRecord[]>(() => getCachedData('availabilityRecords', []));
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary[]>(() => getCachedData('availabilitySummary', []));
  const [fleetBase, setFleetBase] = useState<FleetListRecord[]>(() => getCachedData('fleetBase', []));
  const [operationalIndicators, setOperationalIndicators] = useState<OperationalIndicator[]>(() => getCachedData('operationalIndicators', []));
  const [checkLists, setCheckLists] = useState<CheckList[]>(() => getCachedData('checkLists', []));
  const [fuelPerformanceData, setFuelPerformanceData] = useState<FuelPerformance[]>(() => getCachedData('fuelPerformanceData', []));
  const [plateAdherenceData, setPlateAdherenceData] = useState<PlateAdherence[]>(() => getCachedData('plateAdherenceData', []));
  const [correctives, setCorrectives] = useState<Corrective[]>(() => getCachedData('correctives', []));
  const [unavailabilityRecords, setUnavailabilityRecords] = useState<UnavailabilityRecord[]>(() => getCachedData('unavailabilityRecords', []));
  const [operators, setOperators] = useState<OperatorRecord[]>(() => getCachedData('operators', []));
  const [controlTowerRecords, setControlTowerRecords] = useState<ControlTowerRecord[]>(() => getCachedData('controlTowerRecords', []));
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(() => getCachedData('auditRecords', []));
  const [fleetStandardAuditRecords, setFleetStandardAuditRecords] = useState<FleetStandardAudit[]>(() => getCachedData('fleetStandardAuditRecords', []));
  const [auditMasterVehicles, setAuditMasterVehicles] = useState<AuditMasterVehicle[]>(() => getCachedData('auditMasterVehicles', []));
  const [inventoryHeaders, setInventoryHeaders] = useState<string[]>(() => getCachedData('inventoryHeaders', []));
  const [inventoryData, setInventoryData] = useState<InventoryRecord[]>(() => getCachedData('inventoryData', []));
  const [isSyncingInventory, setIsSyncingInventory] = useState(false);

  // UI States
  const [viewDoc, setViewDoc] = useState<{ url: string | string[] | {url: string, label?: string}[], title: string } | null>(null);
  const [fineStatusFilter, setFineStatusFilter] = useState<'all' | 'PENDIENTE' | 'PAGADO'>('all');
  const [showFineForm, setShowFineForm] = useState(false);
  const [managingFineSupport, setManagingFineSupport] = useState<Fine | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showWashForm, setShowWashForm] = useState(false);
  const [showCleaningForm, setShowCleaningForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [updatingCalibration, setUpdatingCalibration] = useState<Calibration | null>(null);
  const [showDocUpdateForm, setShowDocUpdateForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [registeringEntry, setRegisteringEntry] = useState<Report | null>(null);
  const [closingWorkshopVisit, setClosingWorkshopVisit] = useState<Report | null>(null);
  const [closingCleaning, setClosingCleaning] = useState<WashReport | null>(null);
  const [workshopViewMode, setWorkshopViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calibrationViewMode, setCalibrationViewMode] = useState<'list' | 'calendar' | 'visual'>('calendar');
  const [washViewMode, setWashViewMode] = useState<'list' | 'calendar'>('calendar');
  const [cleaningViewMode, setCleaningViewMode] = useState<'list' | 'calendar'>('calendar');

  // Mileage Filters
  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Vehicle Filters
  const [vehicleDocFilter, setVehicleDocFilter] = useState<'all' | 'soat' | 'rtm' | 'plc' | 'ext'>('all');

  // Driver Filters
  const [driverDocFilter, setDriverDocFilter] = useState<'all' | 'license' | 'defensive' | 'medical'>('all');

  // Auth State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleFlotaAccess = () => {
    setAppMode('camiones');
    setActiveView('kilometrajes');
    setExpandedSection('gestion');
  };

  const verifyPassword = () => {
    if (passwordInput === '1506') {
      setAppMode('camiones');
      setActiveView('kilometrajes');
      setExpandedSection('gestion');
      setShowPasswordModal(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  useEffect(() => {
    handleSyncData();
    
    // Auto-refresh data every 5 minutes
    const intervalId = setInterval(() => {
      handleSyncData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleSyncData = async () => {
    setIsSyncing(true);
    setIsSyncingInventory(true);
    
    // Fetch inventory
    fetchInventoryFromSheet()
      .then(result => {
        if (result && result.headers && result.data) {
          setInventoryHeaders(result.headers);
          setInventoryData(result.data);
          setCachedData('inventoryHeaders', result.headers);
          setCachedData('inventoryData', result.data);
        }
      })
      .catch(err => console.warn("Error refreshing inventory:", err))
      .finally(() => setIsSyncingInventory(false));

    // We will fetch all data sources in parallel. Each data source updates
    // its state and stores its results in the offline cache immediately upon receipt.
    const tasks = [
      { fn: fetchVehiclesFromSheet, set: setVehicles, key: 'vehicles' },
      { fn: fetchDriversFromSheet, set: setDrivers, key: 'drivers' },
      { fn: fetchMileageLogsFromSheet, set: setMileageLogs, key: 'mileageLogs' },
      { fn: fetchWorkshopVisitsFromSheet, set: setWorkshopVisits, key: 'workshopVisits' },
      { fn: fetchFinesFromSheet, set: setFines, key: 'fines' },
      { fn: fetchReportsFromSheet, set: setReports, key: 'reports' },
      { fn: fetchWashReportsFromSheet, set: setWashReports, key: 'washReports' },
      { fn: fetchCleaningReportsFromSheet, set: setCleaningReports, key: 'cleaningReports' },
      { fn: fetchCalibrationsFromSheet, set: setCalibrations, key: 'calibrations' },
      { fn: fetchPreventivesFromSheet, set: setPreventives, key: 'preventives' },
      { fn: fetchAvailabilityFromSheet, set: setAvailabilityRecords, key: 'availabilityRecords' },
      { fn: fetchOperationalIndicatorsFromSheet, set: setOperationalIndicators, key: 'operationalIndicators' },
      { fn: fetchAvailabilitySummaryFromSheet, set: setAvailabilitySummary, key: 'availabilitySummary' },
      { fn: fetchCheckListFromSheet, set: setCheckLists, key: 'checkLists' },
      { fn: fetchFuelPerformanceFromSheet, set: setFuelPerformanceData, key: 'fuelPerformanceData' },
      { fn: fetchPlateAdherenceFromSheet, set: setPlateAdherenceData, key: 'plateAdherenceData' },
      { fn: fetchCorrectivesFromSheet, set: setCorrectives, key: 'correctives' },
      { fn: fetchUnavailabilityFromSheet, set: setUnavailabilityRecords, key: 'unavailabilityRecords' },
      { fn: fetchOperatorsFromSheet, set: setOperators, key: 'operators' },
      { fn: fetchControlTowerFromSheet, set: setControlTowerRecords, key: 'controlTowerRecords' },
      { fn: fetchAuditRecordsFromSheet, set: setAuditRecords, key: 'auditRecords' },
      { fn: fetchFleetStandardAuditFromSheet, set: setFleetStandardAuditRecords, key: 'fleetStandardAuditRecords' },
      { 
        fn: () => import('./services/sheetService').then(m => m.fetchAuditMasterListFromSheet()), 
        set: setAuditMasterVehicles, 
        key: 'auditMasterVehicles' 
      },
      { 
        fn: () => import('./services/sheetService').then(m => m.fetchFleetBaseData()), 
        set: setFleetBase, 
        key: 'fleetBase' 
      }
    ];

    try {
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const data = await task.fn();
            if (data && (Array.isArray(data) ? data.length > 0 : true)) {
              task.set(data);
              setCachedData(task.key, data);
            }
          } catch (taskErr) {
            console.warn(`Error refreshing data for key: ${task.key}`, taskErr);
          }
        })
      );
    } catch (globalErr) {
      console.error("Critical error in parallel state synchronization:", globalErr);
    } finally {
      setIsSyncing(false);
    }
  };

  const uniqueCds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const uniqueContractors = useMemo(() => Array.from(new Set(vehicles.map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);
  const uniqueSources = useMemo(() => Array.from(new Set(reports.map(r => r.source).filter(Boolean))).sort(), [reports]);
  const uniqueWorkshops = useMemo(() => Array.from(new Set(workshopVisits.map(v => v.workshop).filter(Boolean))).sort(), [workshopVisits]);
  
  const derivedFleetComposition = useMemo((): FleetComposition[] => {
    const compositionMap: Record<string, number> = {};
    // Use fleetBase for availability-related components as it's the official denominator defined by the user
    fleetBase.forEach(v => {
      const key = `${v.cd || 'GENERAL'}|${v.contratista || 'GENERAL'}`;
      compositionMap[key] = (compositionMap[key] || 0) + 1;
    });
    
    if (Object.keys(compositionMap).length === 0) {
      // Fallback to vehicles if fleetBase is not yet loaded or empty
      vehicles.forEach(v => {
        const key = `${v.cd || 'GENERAL'}|${v.contractor || 'GENERAL'}`;
        compositionMap[key] = (compositionMap[key] || 0) + 1;
      });
    }

    return Object.entries(compositionMap).map(([key, count]) => {
      const [cd, contractor] = key.split('|');
      return { cd, contractor, count };
    });
  }, [fleetBase, vehicles]);

  const filteredWashReports = useMemo(() => {
    return washReports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const rMonth = normalizeStr(r.month);
      const sMonth = normalizeStr(selectedMonth);
      const matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
      
      // Year check
      let matchYear = true;
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd);
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor);
      
      return matchMonth && matchYear && matchSearch && matchCd && matchContractor;
    });
  }, [washReports, vehicles, selectedMonth, searchTerm, filterCd, filterContractor, selectedYear]);

  const washStats = useMemo(() => {
    const total = filteredWashReports.length;
    const completed = filteredWashReports.filter(r => r.status === 'CERRADO').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredWashReports]);

  const filteredCleaningReports = useMemo(() => {
    return cleaningReports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const rMonth = normalizeStr(r.month);
      const sMonth = normalizeStr(selectedMonth);
      const matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
      
      // Year check
      let matchYear = true;
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd);
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor);
      
      return matchMonth && matchYear && matchSearch && matchCd && matchContractor;
    });
  }, [cleaningReports, vehicles, selectedMonth, searchTerm, filterCd, filterContractor, selectedYear]);

  const cleaningStats = useMemo(() => {
    const total = filteredCleaningReports.length;
    const completed = filteredCleaningReports.filter(r => r.status === 'CERRADO').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredCleaningReports]);

  const filteredVehiclesForWash = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchContractor && matchSearch;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      
      let matchMonth = false;
      let matchYear = true;
      
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const rMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          const sMonth = selectedMonth;
          matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || r.contractor === filterContractor;
      const matchSource = filterSource === 'all' || r.source === filterSource;
      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm)) || 
                          (r.source && r.source.toUpperCase().includes(searchTerm.toUpperCase()));
      
      return matchMonth && matchYear && matchCd && matchContractor && matchSearch && matchSource;
    });
  }, [reports, vehicles, selectedMonth, filterCd, filterContractor, filterSource, searchTerm, selectedYear]);

  const statsReports = useMemo(() => {
    const baseFiltered = reports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      
      let matchMonth = false;
      let matchYear = true;
      
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const rMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          const sMonth = selectedMonth;
          matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || r.contractor === filterContractor;
      const matchSource = filterSource === 'all' || r.source === filterSource;
      return matchMonth && matchYear && matchCd && matchContractor && matchSource;
    });
    
    return {
      total: baseFiltered.length,
      completed: baseFiltered.filter(r => r.status === 'COMPLETADOS').length,
      pending: baseFiltered.filter(r => r.status === 'PENDIENTES').length,
      searchCount: filteredReports.length
    };
  }, [reports, vehicles, selectedMonth, filterCd, filterContractor, filterSource, filteredReports, selectedYear]);

  const reportComplianceData = useMemo(() => {
    const yearReports = reports.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date + "T12:00:00");
      return !isNaN(d.getTime()) && d.getFullYear() === selectedYear;
    });

    const weeks: { [key: string]: { total: number, completed: number } } = {};
    
    yearReports.forEach(r => {
      const d = new Date(r.date + "T12:00:00");
      const week = getWeekNumber(d);
      const weekKey = `S${week}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { total: 0, completed: 0 };
      }
      
      weeks[weekKey].total += 1;
      if (r.status === 'COMPLETADOS') {
        weeks[weekKey].completed += 1;
      }
    });

    return Object.keys(weeks)
      .sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)))
      .map(key => ({
        name: key,
        percentage: weeks[key].total > 0 ? Math.round((weeks[key].completed / weeks[key].total) * 100) : 0,
        total: weeks[key].total,
        completed: weeks[key].completed
      }))
      .slice(-12);
  }, [reports, selectedYear]);

  const filteredCalibrations = useMemo(() => {
    return calibrations.filter(c => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(c.plate));
      const cMonth = (c.month || "").trim().toUpperCase();
      const sMonth = selectedMonth.trim().toUpperCase();
      const matchMonth = selectedMonth === 'TODOS' || cMonth === sMonth || cMonth.includes(sMonth) || sMonth.includes(cMonth);
      const matchYear = c.year === selectedYear;
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || (c.cd && c.cd.toUpperCase().trim() === filterCd.toUpperCase().trim());
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || (c.contractor && c.contractor.toUpperCase().trim() === filterContractor.toUpperCase().trim());
      const matchSearch = normalizePlate(c.plate).includes(normalizePlate(searchTerm));
      return matchMonth && matchYear && matchCd && matchContractor && matchSearch;
    });
  }, [calibrations, vehicles, filterCd, filterContractor, searchTerm, selectedMonth, selectedYear]);

  const statsCalibrations = useMemo(() => {
    return {
      total: filteredCalibrations.length,
      completed: filteredCalibrations.filter(c => {
        const est = (c.estado || "").toUpperCase().trim();
        return est === 'COMPLETADO' || est === 'CERRADO' || est === 'REALIZADO' || est === 'OK';
      }).length,
      pending: filteredCalibrations.filter(c => {
        const est = (c.estado || "").toUpperCase().trim();
        return !(est === 'COMPLETADO' || est === 'CERRADO' || est === 'REALIZADO' || est === 'OK');
      }).length,
      searchCount: filteredCalibrations.length
    };
  }, [filteredCalibrations]);

  const filteredFines = useMemo(() => {
    return fines.filter(f => {
      const fMonth = normalizeStr(f.month || '');
      const sMonth = normalizeStr(selectedMonth);
      
      // Doble validación: por texto en columna MES o por la FECHA del registro
      let matchMonthByDate = false;
      if (f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const dMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          matchMonthByDate = dMonth === sMonth;
        }
      }

      const matchMonth = selectedMonth === 'TODOS' || (fMonth !== "" && (fMonth === sMonth || fMonth.includes(sMonth) || sMonth.includes(fMonth))) || 
                         (fMonth === "" && matchMonthByDate);
      
      let matchYear = true;
      if (f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          // Si el mes coincide plenamente, permitimos el registro aunque el año varíe ligeramente (evita discrepancias por typos)
          matchYear = selectedMonth === 'TODOS' || d.getFullYear() === selectedYear || matchMonth;
        }
      }

      const matchCd = filterCd === 'all' || f.cd === filterCd;
      const matchContractor = filterContractor === 'all' || f.contractor === filterContractor;
      let matchStatus = fineStatusFilter === 'all' || f.status === fineStatusFilter;
      
      if (fineStatusFilter === 'WITH_EVIDENCE') {
        matchStatus = !!(f.evidenceUrl && f.evidenceUrl.startsWith('http'));
      } else if (fineStatusFilter === 'WITHOUT_EVIDENCE') {
        matchStatus = !(f.evidenceUrl && f.evidenceUrl.startsWith('http'));
      }

      const matchSearch = normalizePlate(f.plate).includes(normalizePlate(searchTerm));
      
      return matchMonth && matchYear && matchCd && matchContractor && matchStatus && matchSearch;
    });
  }, [fines, selectedMonth, selectedYear, filterCd, filterContractor, fineStatusFilter, searchTerm]);

  const statsFines = useMemo(() => {
    // Para las estadísticas, contamos todos los registros que coinciden con el mes/año, 
    // ignorando el término de búsqueda para que el total coincida con el Excel
    const baseFiltered = fines.filter(f => {
      const fMonth = normalizeStr(f.month || '');
      const sMonth = normalizeStr(selectedMonth);
      
      let matchMonthByDate = false;
      if (f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const dMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          matchMonthByDate = dMonth === sMonth;
        }
      }

      // If the record has a month, it must match. 
      // If it doesn't have a month, we try to match by date.
      // If it has neither, it's only shown if we are in a special "SIN MES" view (not implemented yet, so we'll skip for now to avoid duplicates)
      const matchMonth = selectedMonth === 'TODOS' || (fMonth !== "" && (fMonth === sMonth || fMonth.includes(sMonth) || sMonth.includes(fMonth))) || 
                         (fMonth === "" && matchMonthByDate);
      
      // Para el conteo total, priorizamos el mes para que coincida con el Excel
      const matchCd = filterCd === 'all' || f.cd === filterCd;
      const matchContractor = filterContractor === 'all' || f.contractor === filterContractor;
      return matchMonth && matchCd && matchContractor;
    });

    const totalRecords = baseFiltered.length;
    const withFines = baseFiltered.filter(f => f.status === 'PENDIENTE').length;
    const withoutFines = baseFiltered.filter(f => f.status === 'PAGADO').length;
    const withEvidence = baseFiltered.filter(f => f.evidenceUrl && f.evidenceUrl.startsWith('http')).length;
    const withoutEvidence = baseFiltered.filter(f => !(f.evidenceUrl && f.evidenceUrl.startsWith('http'))).length;
    const rawTotal = filterCd === 'all' && filterContractor === 'all' ? fines.length : fines.filter(f => (filterCd === 'all' || f.cd === filterCd) && (filterContractor === 'all' || f.contractor === filterContractor)).length;
    return { totalDrivers: totalRecords, withFines, withoutFines, withEvidence, withoutEvidence, rawTotal };
  }, [fines, selectedMonth, filterCd, filterContractor]);

  const monthlySummary = useMemo(() => {
    const summary: Record<string, { total: number, uniqueDrivers: Set<string> }> = {};
    fines.filter(f => filterCd === 'all' || f.cd === filterCd).forEach(f => {
      let m = (f.month || '').toUpperCase();
      if (!m && f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          m = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
      }
      if (!m) m = 'SIN MES/FECHA';

      if (!summary[m]) summary[m] = { total: 0, uniqueDrivers: new Set() };
      summary[m].total++;
      if (f.driverName) summary[m].uniqueDrivers.add(f.driverName.toUpperCase());
    });
    return Object.entries(summary).map(([month, data]) => ({
      month,
      total: data.total,
      uniqueDrivers: data.uniqueDrivers.size
    })).sort((a, b) => {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const idxA = months.indexOf(a.month);
      const idxB = months.indexOf(b.month);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [fines, filterCd]);

  const statsVehicles = useMemo(() => {
    const filtered = vehicles.filter(v => 
      (filterCd === 'all' || v.cd === filterCd) && 
      (filterContractor === 'all' || v.contractor === filterContractor) &&
      normalizePlate(v.plate).includes(normalizePlate(searchTerm))
    );
    return {
      total: filtered.length,
      soatWarning: filtered.filter(v => v.soat.status !== 'active').length,
      rtmWarning: filtered.filter(v => v.rtm.status !== 'active').length,
      plcWarning: filtered.filter(v => v.plc.status !== 'active').length,
      extWarning: filtered.filter(v => v.extinguisher.status !== 'active').length
    };
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const matchDoc = vehicleDocFilter === 'all' || 
        (vehicleDocFilter === 'soat' && v.soat.status !== 'active') ||
        (vehicleDocFilter === 'rtm' && v.rtm.status !== 'active') ||
        (vehicleDocFilter === 'plc' && v.plc.status !== 'active') ||
        (vehicleDocFilter === 'ext' && v.extinguisher.status !== 'active');
      
      return matchCd && matchContractor && matchSearch && matchDoc;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm, vehicleDocFilter]);

  const statsDrivers = useMemo(() => {
    const filtered = drivers.filter(d => 
      (filterCd === 'all' || d.cd === filterCd) && 
      (filterContractor === 'all' || d.contractor === filterContractor) &&
      d.name.toUpperCase().includes(searchTerm.toUpperCase())
    );
    return {
      total: filtered.length,
      licenseWarning: filtered.filter(d => d.license.status !== 'active').length,
      defensiveWarning: filtered.filter(d => d.defensiveDriving.status !== 'active').length,
      medicalWarning: filtered.filter(d => d.medicalExam.status !== 'active').length
    };
  }, [drivers, filterCd, filterContractor, searchTerm]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchCd = filterCd === 'all' || d.cd === filterCd;
      const matchContractor = filterContractor === 'all' || d.contractor === filterContractor;
      const matchSearch = d.name.toUpperCase().includes(searchTerm.toUpperCase());
      const matchDoc = driverDocFilter === 'all' || 
        (driverDocFilter === 'license' && d.license.status !== 'active') ||
        (driverDocFilter === 'defensive' && d.defensiveDriving.status !== 'active') ||
        (driverDocFilter === 'medical' && d.medicalExam.status !== 'active');
      
      return matchCd && matchContractor && matchSearch && matchDoc;
    });
  }, [drivers, filterCd, filterContractor, searchTerm, driverDocFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {isSyncing && (vehicles.length === 0 || drivers.length === 0) && (
        <div className="fixed inset-0 bg-[#0f172a] z-[100] flex flex-col items-center justify-center p-8">
          {/* Central Logo Area */}
          <div className="w-48 h-48 bg-white/5 border border-white/10 rounded-[3rem] shadow-2xl flex items-center justify-center mb-10 relative">
            <LayoutGrid size={80} className="text-white/80 animate-pulse" />
            <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-2xl shadow-lg">
              <RefreshCw size={28} className="text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-4 text-center">Sincronizando Sistema</h2>
          <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.4em] opacity-80 mb-8 max-w-sm text-center">Cargando base de datos por primera vez...</p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-full border border-white/15">
              <Loader2 className="text-indigo-400 animate-spin" size={18} />
              <span className="text-white/80 font-semibold text-xs tracking-wider uppercase">Por favor, espera un momento</span>
            </div>
            
            <button 
              onClick={() => setIsSyncing(false)} 
              className="mt-4 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors hover:underline focus:outline-none"
            >
              Continuar sin conexión
            </button>
          </div>
        </div>
      )}
      
      {appMode === 'root_menu' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Central Logo Area */}
          <div className="relative z-10 flex flex-col items-center text-center mb-16">
            <div className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center mb-10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <LayoutGrid size={80} className="text-slate-800" />
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-2xl shadow-lg border-4 border-white">
                  <Settings size={28} className="text-white animate-spin-slow" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">SISTEMA DE GESTIÓN</h1>
            <p className="text-indigo-400 font-black text-sm uppercase tracking-[0.5em] opacity-80">CONTROL CENTRALIZADO DE ACTIVOS</p>
          </div>

          {/* Root Menu Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
            <button 
              onClick={handleFlotaAccess}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-indigo-600/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30">
                <Truck size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">FLOTA BARRANQUILLA</h3>
                <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-widest">Gestión de vehículos y equipos</p>
              </div>
            </button>

            <button 
              onClick={() => setAppMode('talleres')}
              className="group bg-white/5 hover:bg-amber-600/20 border border-white/10 hover:border-amber-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-amber-600/20 rounded-[1.5rem] flex items-center justify-center text-amber-400 shadow-xl shadow-amber-600/10 group-hover:scale-110 transition-transform border border-amber-500/30">
                <Wrench size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">TALLERES</h3>
                <p className="text-amber-400/60 text-[10px] font-bold uppercase tracking-widest">Control de mantenimiento y servicios</p>
              </div>
            </button>
          </div>
        </div>
      ) : appMode === 'flota_menu' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Top Left Icon */}
          <div className="absolute top-8 left-8">
            <button onClick={() => setAppMode('root_menu')} className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
              <ChevronLeft size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Menú Principal</span>
            </button>
          </div>

          {/* Central Logo Area */}
          <div className="relative z-10 flex flex-col items-center text-center mb-8 md:mb-16">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl flex items-center justify-center mb-6 md:mb-10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-[2rem] md:rounded-[3rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <ClipboardList size={48} className="md:size-20 text-slate-800" />
                <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-amber-400 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg border-2 md:border-4 border-white">
                  <Settings size={18} className="md:size-7 text-slate-900 animate-spin-slow" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-[0.2em] mb-2 md:mb-4">FLOTA BARRANQUILLA</h1>
            <p className="text-indigo-400 font-black text-[10px] md:text-sm uppercase tracking-[0.3em] md:tracking-[0.5em] opacity-80">GESTIÓN Y CONTROL DE ACTIVOS</p>
          </div>

          {/* Menu Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 w-full max-w-4xl relative z-10 px-4 md:px-0">
            <button 
              onClick={() => { setAppMode('camiones'); setActiveView('indicadoresOperativos'); }}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-4 md:p-10 rounded-2xl md:rounded-[3rem] transition-all duration-500 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-6 shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2"
            >
              <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600/20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30 shrink-0">
                <Truck size={20} className="md:size-9" />
              </div>
              <div>
                <h3 className="text-base md:text-2xl font-black text-white uppercase tracking-widest mb-0.5 md:mb-1">CAMIONES</h3>
                <p className="text-indigo-400/60 text-[7px] md:text-[10px] font-bold uppercase tracking-widest">Control de flota pesada</p>
              </div>
            </button>

            <button 
              onClick={() => { setAppMode('camiones'); setActiveView('enlaces'); }}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-4 md:p-10 rounded-2xl md:rounded-[3rem] transition-all duration-500 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-6 shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2"
            >
              <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600/20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30 shrink-0">
                <LinkIcon size={20} className="md:size-9" />
              </div>
              <div>
                <h3 className="text-base md:text-2xl font-black text-white uppercase tracking-widest mb-0.5 md:mb-1">ENLACES FLOTA</h3>
                <p className="text-indigo-400/60 text-[7px] md:text-[10px] font-bold uppercase tracking-widest">Acceso rápido a plataformas externas</p>
              </div>
            </button>
          </div>
        </div>
      ) : appMode === 'talleres' ? (
        <WorkshopModule onBack={() => setAppMode('root_menu')} vehicles={vehicles} />
      ) : (
        <>
          {/* SIDEBAR PREMIUM */}
          {activeView !== 'enlaces' && (
            <>
              {isSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 xl:hidden animate-in fade-in duration-300" 
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}
              <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform xl:relative xl:translate-x-0`}>
            <div className="p-8 flex flex-col h-full space-y-2">
              <div className="mb-10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">BQA</div>
                    <span className="text-white font-black text-xs tracking-widest uppercase">Gestión Flota</span>
                 </div>
                 <button onClick={handleSyncData} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Sincronizar">
                    <RefreshCw size={20} className={isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
                 </button>
              </div>
              
              <nav className="flex-grow space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {/* GESTIÓN SECTION */}
                <div className="space-y-2">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'gestion' ? null : 'gestion')}
                    className="w-full px-6 py-2 flex items-center justify-between group hover:bg-white/5 rounded-xl transition-all"
                  >
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100 transition-opacity">GESTIÓN</p>
                    {expandedSection === 'gestion' ? <ChevronUp size={14} className="text-emerald-400" /> : <ChevronDown size={14} className="text-emerald-400" />}
                  </button>

                  {expandedSection === 'gestion' && (
                    <div className="space-y-1 ml-2 border-l border-white/5 pl-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {[
                         { id: 'kilometrajes', label: 'Kilometrajes', icon: <Gauge size={18}/> },
                         { id: 'novedades', label: 'Novedades', icon: <ClipboardList size={18}/> },
                         { id: 'inventario', label: 'Inventario', icon: <Package size={18}/> },
                       ].map(item => (
                         <button 
                           key={item.id}
                           onClick={() => { 
                             setActiveView(item.id as ActiveView); 
                             setIsSidebarOpen(false); 
                           }} 
                           className={`w-full flex items-center gap-4 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === item.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                         >
                           {item.icon} {item.label}
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              </nav>

          <button onClick={handleSyncData} className="mt-auto w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar
          </button>
        </div>
      </aside>
            </>
          )}

      <main className="flex-grow flex flex-col h-screen overflow-hidden pb-16 xl:pb-0">
        {/* HEADER */}
        <header className="bg-white border-b p-3 md:p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 md:gap-4 flex-grow">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 text-slate-600"><Menu/></button>
            <div className="bg-slate-50 border rounded-xl px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 md:gap-3 w-full max-w-md shadow-inner">
              <Search size={14} className="text-slate-400 md:size-4" />
              <input 
                type="text" 
                placeholder="BUSCAR..." 
                className="bg-transparent font-black uppercase text-[9px] md:text-[10px] outline-none flex-grow" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value.toUpperCase())} 
              />
            </div>
          </div>
          <div className="ml-2 md:ml-4 flex items-center gap-2 md:gap-3">
             {activeView !== 'operadores' && (
               <>
                 <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                   <Building2 size={12} className="text-slate-400" />
                   <select className="bg-transparent font-black text-[9px] uppercase outline-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                      <option value="all">TODOS LOS CD</option>
                      {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                   </select>
                 </div>
                 <button onClick={() => {
                    if(activeView === 'novedades') setShowReportForm(true);


                    else if(activeView === 'calibraciones') setShowCalibrationForm(true);
                 }} className="p-2 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                    <Plus size={18} className="md:size-5" />
                 </button>
               </>
             )}
          </div>
        </header>

        {/* BOTTOM NAV MOBILE */}
        <nav className="fixed bottom-4 left-4 right-4 bg-[#0f172a] border border-slate-800 rounded-[2rem] flex justify-around items-center p-3 z-40 xl:hidden shadow-2xl shadow-indigo-950/40">
          {[
            { id: 'kilometrajes', icon: <Gauge size={22} className="stroke-[2.25]" />, label: 'KMs' },
            { id: 'novedades', icon: <ClipboardList size={22} className="stroke-[2.25]" />, label: 'Novs' },
            { id: 'inventario', icon: <Package size={22} className="stroke-[2.25]" />, label: 'Inv' },
            { id: 'enlaces', icon: <LinkIcon size={22} className="stroke-[2.25]" />, label: 'Links' },
          ].map(item => {
            const isActive = activeView === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 relative ${isActive ? 'text-indigo-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {isActive && (
                  <span className="absolute -top-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-md shadow-indigo-500" />
                )}
                {item.icon}
                <span className={`text-[8px] font-black uppercase tracking-widest mt-1 text-center truncate ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* CONTENT AREA */}
        <div className="flex-grow p-3 md:p-8 pb-32 xl:pb-8 overflow-y-auto bg-[#F0F4FF] custom-scrollbar">
          
          {activeView === 'indicadoresOperativos' && (
            <OperationalDashboard 
              indicators={operationalIndicators}
            />
          )}

          {activeView === 'checklist' && (
            <CheckListModule checkLists={checkLists} />
          )}

          {activeView === 'rendimiento' && (
            <FuelPerformanceModule fuelData={fuelPerformanceData} />
          )}

          {activeView === 'adherencia' && (
            <PlateAdherenceModule data={plateAdherenceData} />
          )}

          {activeView === 'enlaces' && (
            <FleetLinksModule />
          )}

          {activeView === 'indicadoresDisponibilidad' && (
            <AvailabilityIndicators 
              vehicles={vehicles}
              availabilityRecords={availabilityRecords}
              availabilitySummary={availabilitySummary}
              fleetComposition={derivedFleetComposition}
            />
          )}

          {activeView === 'estandar_flota' && (
            <FleetStandardModule 
              data={auditRecords} 
              masterList={auditMasterVehicles}
            />
          )}

          {activeView === 'torre_preventivos' && (
            <PreventiveMaintenanceModule data={preventives} />
          )}

          {activeView === 'auditoria_calidad_seguridad' && (
            <ExecutiveAuditDashboard />
          )}

          {activeView === 'disponibilidad' && (
            <AvailabilityModule 
              availability={availabilityRecords}
              fleetBase={fleetBase}
            />
          )}

          {activeView === 'vehiculos' && (
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20 px-1 md:px-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <Shield size={24} className="text-indigo-600" /> Seguimiento Documental
                </h2>
                <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-full md:w-auto">
                  <button 
                    onClick={() => setVehicleViewMode('grid')}
                    className={`flex-grow md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${vehicleViewMode === 'grid' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <LayoutGrid size={12} /> Cuadrícula
                    </div>
                  </button>
                  <button 
                    onClick={() => setVehicleViewMode('table')}
                    className={`flex-grow md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${vehicleViewMode === 'table' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ListFilter size={12} /> Tabla
                    </div>
                  </button>
                </div>
              </div>

              <VehicleStats 
                total={statsVehicles.total}
                soatWarning={statsVehicles.soatWarning}
                rtmWarning={statsVehicles.rtmWarning}
                plcWarning={statsVehicles.plcWarning}
                extWarning={statsVehicles.extWarning}
                onFilter={setVehicleDocFilter}
                activeFilter={vehicleDocFilter}
              />

              {vehicleViewMode === 'table' ? (
                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                          <th className="p-3 md:p-4">Placa</th>
                          <th className="p-3 md:p-4">CD</th>
                          <th className="p-3 md:p-4">Contratista</th>
                          <th className="p-3 md:p-4">SOAT</th>
                          <th className="p-3 md:p-4">RTM</th>
                          <th className="p-3 md:p-4">EXT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                        {filteredVehicles.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 md:p-4">
                              <span className="bg-slate-900 px-2 py-1 rounded text-white font-mono font-black tracking-tighter">
                                {v.plate}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 font-black uppercase text-slate-400 text-[9px]">{v.cd}</td>
                            <td className="p-3 md:p-4 font-black uppercase text-slate-600 text-[9px] truncate max-w-[80px] md:max-w-none">{v.contractor}</td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                v.soat.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {v.soat.expiryDate}
                              </span>
                            </td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                v.rtm.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {v.rtm.expiryDate}
                              </span>
                            </td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                v.extinguisher.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {v.extinguisher.expiryDate}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {filteredVehicles.map(v => (
                    <div key={v.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-500">
                      <div className="flex flex-col lg:flex-row">
                        <div className="lg:w-[280px] bg-[#0f172a] p-5 md:p-8 flex flex-row lg:flex-col items-center justify-between lg:justify-center shrink-0 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                          <div className="bg-white/5 px-4 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl border border-white/10 text-center mb-0 lg:mb-6 shadow-2xl relative z-10">
                              <h2 className="text-xl md:text-3xl font-mono font-black text-white tracking-tighter">{v.plate}</h2>
                          </div>
                          <div className="space-y-1 md:space-y-2 w-auto lg:w-full relative z-10 text-right lg:text-left">
                             <div className="flex items-center justify-end lg:justify-start gap-2 text-indigo-400">
                               <Building2 size={12} className="md:size-14"/>
                               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{v.cd}</span>
                             </div>
                             <div className="flex items-center justify-end lg:justify-start gap-2 text-slate-400">
                               <Users size={12} className="md:size-14"/>
                               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate max-w-[120px] md:max-w-none">{v.contractor}</span>
                             </div>
                          </div>
                        </div>
                        <div className="flex-grow p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                           <DocumentCard title="SOAT" doc={v.soat} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                           <DocumentCard title="RTM" doc={v.rtm} icon={<RefreshCw/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                           <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="max-w-7xl mx-auto space-y-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <Users size={24} className="text-indigo-600" /> Directorio de Conductores
                 </h2>
                 <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                   <button 
                     onClick={() => setDriverViewMode('grid')}
                     className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${driverViewMode === 'grid' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     <div className="flex items-center gap-2">
                       <LayoutGrid size={12} /> Cuadrícula
                     </div>
                   </button>
                   <button 
                     onClick={() => setDriverViewMode('table')}
                     className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${driverViewMode === 'table' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     <div className="flex items-center gap-2">
                       <ListFilter size={12} /> Tabla
                     </div>
                   </button>
                 </div>
               </div>
               
               <DriverStats 
                 total={statsDrivers.total}
                 licenseWarning={statsDrivers.licenseWarning}
                 defensiveWarning={statsDrivers.defensiveWarning}
                 medicalWarning={statsDrivers.medicalWarning}
                 onFilter={setDriverDocFilter}
                 activeFilter={driverDocFilter}
               />

               {driverViewMode === 'table' ? (
                 <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                           <th className="p-4">Nombre</th>
                           <th className="p-4">CD</th>
                           <th className="p-4">Contratista</th>
                           <th className="p-4">Licencia</th>
                           <th className="p-4">Manejo Def.</th>
                           <th className="p-4">Ex. Médico</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                         {filteredDrivers.map(d => (
                           <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                             <td className="p-4 font-black uppercase">{d.name}</td>
                             <td className="p-4 font-black uppercase text-slate-400">{d.cd}</td>
                             <td className="p-4 font-black uppercase text-slate-600">{d.contractor}</td>
                             <td className="p-4">
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                 d.license.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                               }`}>
                                 {d.license.expiryDate}
                               </span>
                             </td>
                             <td className="p-4">
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                 d.defensiveDriving.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                               }`}>
                                 {d.defensiveDriving.expiryDate}
                               </span>
                             </td>
                             <td className="p-4">
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                 d.medicalExam.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                               }`}>
                                 {d.medicalExam.expiryDate}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                  {filteredDrivers.map(d => (
                    <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                  ))}
                 </div>
               )}
            </div>
          )}

          {activeView === 'comparendos' && (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Gavel size={40} className="text-rose-600" /> Gestión Comparendos
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Control y seguimiento de infracciones</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterCd}
                        onChange={e => setFilterCd(e.target.value)}
                      >
                        <option value="all">TODOS LOS CD</option>
                        {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterContractor}
                        onChange={e => setFilterContractor(e.target.value)}
                      >
                        <option value="all">TODOS LOS CONTRATISTAS</option>
                        {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedYear}
                              onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">ESTADO</span>
                        <div className="flex items-center gap-2">
                          <select className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer" value={fineStatusFilter} onChange={e => setFineStatusFilter(e.target.value as any)}>
                            <option value="all">TODOS</option>
                            <option value="PENDIENTE">PENDIENTES</option>
                            <option value="PAGADO">PAGADOS</option>
                            <option value="WITH_EVIDENCE">CON SOPORTE</option>
                            <option value="WITHOUT_EVIDENCE">SIN SOPORTE</option>
                          </select>
                          {fineStatusFilter !== 'all' && (
                            <button 
                              onClick={() => setFineStatusFilter('all')}
                              className="text-[8px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-tighter"
                            >
                              [Limpiar]
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               <FineStats 
                 totalDrivers={statsFines.totalDrivers}
                 withFines={statsFines.withFines}
                 withoutFines={statsFines.withoutFines}
                 withEvidence={statsFines.withEvidence}
                 withoutEvidence={statsFines.withoutEvidence}
                 rawTotal={statsFines.rawTotal}
                 month={selectedMonth}
                 activeFilter={fineStatusFilter}
                 onFilterChange={(f) => setFineStatusFilter(f as any)}
               />

               <MonthlyReport 
                 summary={monthlySummary}
                 selectedMonth={selectedMonth}
                 onSelectMonth={setSelectedMonth}
               />

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFines.map(f => (
                    <FineCard key={f.id} fine={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onAddSupport={setManagingFineSupport} />
                  ))}
               </div>
               {filteredFines.length === 0 && (
                 <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-200 text-center">
                    <Gavel size={64} className="text-slate-200 mx-auto mb-6" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado comparendos con los filtros aplicados para {selectedMonth} {selectedYear}</p>
                 </div>
               )}
            </div>
          )}

          {activeView === 'inventario' && (
            <div className="max-w-7xl mx-auto">
              <InventoryModule 
                headers={inventoryHeaders} 
                data={inventoryData} 
                onRefresh={handleSyncData}
                isSyncing={isSyncingInventory}
                vehicles={vehicles}
              />
            </div>
          )}

          {activeView === 'kilometrajes' && (
            <MileageEntryForm 
              vehicles={vehicles} 
              mileageLogs={mileageLogs} 
              onSubmit={async (data) => {
                try {
                  await submitMileageToSheet(data);
                  console.log("✅ Kilometraje guardado con éxito.");
                  // Intentamos sincronizar pero no bloqueamos el éxito previo
                  handleSyncData().catch(e => console.error("Error syncing after save:", e));
                } catch (err) {
                  console.error("Error submitting mileage:", err);
                }
              }} 
              externalCd={filterCd} 
              setExternalCd={setFilterCd} 
              externalContractor={filterContractor} 
              setExternalContractor={setFilterContractor} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              statusFilter={mileageStatusFilter} 
              setStatusFilter={setMileageStatusFilter} 
              selectedWeek={selectedWeek} 
              onWeekChange={setSelectedWeek} 
            />
          )}

          {activeView === 'novedades' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <ClipboardList size={40} className="text-indigo-600" /> Gestión de Novedades
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Control mensual de operaciones de taller</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => setReportViewMode('grid')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${reportViewMode === 'grid' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={12} /> Cuadrícula
                        </div>
                      </button>
                      <button 
                        onClick={() => setReportViewMode('table')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${reportViewMode === 'table' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <ListFilter size={12} /> Tabla
                        </div>
                      </button>
                    </div>

                    {/* Filtros CD, Contratista y Origen */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterCd}
                        onChange={e => setFilterCd(e.target.value)}
                      >
                        <option value="all">TODOS LOS CD</option>
                        {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterContractor}
                        onChange={e => setFilterContractor(e.target.value)}
                      >
                        <option value="all">TODOS LOS CONTRATISTAS</option>
                        {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value)}
                      >
                        <option value="all">TODOS LOS ORIGENES</option>
                        {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedYear}
                              onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowReportForm(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-[#0f172a] text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={20}/> Crear Novedad
                    </button>
                  </div>
               </div>

               {reportViewMode === 'table' ? (
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Placa</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Taller</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Días</th>
                            <th className="p-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                          {filteredReports.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-black">{r.date}</td>
                              <td className="p-4">
                                <span className="bg-slate-900 px-2 py-1 rounded text-white font-mono font-black tracking-tighter">
                                  {r.plate}
                                </span>
                              </td>
                              <td className="p-4 uppercase font-black text-slate-400 truncate max-w-[200px]">{r.novelty}</td>
                              <td className="p-4 uppercase font-black text-slate-600">{r.workshop}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                  r.status === 'COMPLETADOS' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="p-4 font-black">{r.daysInShop || '0'}d</td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => setClosingReport(r)}
                                  className="text-indigo-600 font-black uppercase tracking-widest text-[8px] hover:underline"
                                >
                                  Gestionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredReports.map(r => (
                      <ReportCard 
                        key={r.id} 
                        report={r} 
                        onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                        onManageClosure={setClosingReport} 
                        onManageEntry={setRegisteringEntry}
                      />
                    ))}
                    {filteredReports.length === 0 && (
                      <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado novedades con los filtros seleccionados</p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Disc size={40} className="text-indigo-600" /> Cumplimiento Calibración
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Monitoreo de presión y desgaste</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                        <button 
                          onClick={() => setCalibrationViewMode('calendar')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Cronograma
                        </button>
                        <button 
                          onClick={() => setCalibrationViewMode('list')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Lista
                        </button>
                        <button 
                          onClick={() => setCalibrationViewMode('visual')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'visual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Visual
                        </button>
                      </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MES"
                              disabled
                            >
                              <option value="MES">MES</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Filtros CD y Contratista */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Building2 size={14} className="text-indigo-400" /> Filtrar por CD
                    </p>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                      value={filterCd}
                      onChange={e => setFilterCd(e.target.value)}
                    >
                      <option value="all">TODOS LOS CENTROS</option>
                      {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                    </select>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <UserCircle size={14} className="text-indigo-400" /> Filtrar por Contratista
                    </p>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                      value={filterContractor}
                      onChange={e => setFilterContractor(e.target.value)}
                    >
                      <option value="all">TODOS LOS OPERADORES</option>
                      {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
               </div>

               <CalibrationStats 
                 total={statsCalibrations.total}
                 completed={statsCalibrations.completed}
                 pending={statsCalibrations.pending}
                 searchCount={statsCalibrations.searchCount}
                 month={selectedMonth}
               />

               {calibrationViewMode === 'visual' ? (
                 <CalibrationVisuals 
                   calibrations={calibrations}
                   selectedYear={selectedYear}
                   selectedMonth={selectedMonth}
                   selectedCd={filterCd}
                   selectedContractor={filterContractor}
                 />
               ) : calibrationViewMode === 'list' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCalibrations.map(c => (
                      <CalibrationCard 
                        key={c.id} 
                        calibration={c} 
                        onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                        onUpdateEvidence={(cal) => {
                          setUpdatingCalibration(cal);
                          setShowCalibrationForm(true);
                        }}
                      />
                    ))}
                    {filteredCalibrations.length === 0 && (
                      <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <Disc size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado calibraciones con los filtros seleccionados</p>
                      </div>
                    )}
                 </div>
               ) : (
                 <CalibrationCalendar 
                   calibrations={filteredCalibrations}
                   selectedMonth={selectedMonth}
                   selectedYear={selectedYear}
                   onMonthChange={setSelectedMonth}
                   onYearChange={setSelectedYear}
                   onViewDoc={(url, t) => setViewDoc({url, title: t})}
                   onUpdateEvidence={(cal) => {
                     setUpdatingCalibration(cal);
                     setShowCalibrationForm(true);
                   }}
                   searchTerm={searchTerm}
                 />
               )}
            </div>
          )}
          {activeView === 'correctivos' && (
            <div className="max-w-7xl mx-auto pb-20">
              <CorrectivesModule data={correctives} onRefresh={handleSyncData} />
            </div>
          )}

          {activeView === 'indisponibilidad' && (
            <div className="max-w-7xl mx-auto pb-20">
              <UnavailabilityModule data={unavailabilityRecords} onRefresh={handleSyncData} />
            </div>
          )}

          {activeView === 'operadores' && (
            <div className="max-w-7xl mx-auto pb-20">
              <OperatorsModule data={operators} onRefresh={handleSyncData} />
            </div>
          )}
        </div>
          </main>
        </>
      )}

      {/* MODALS & FORMS */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <Lock size={36} className="text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">ACCESO RESTRINGIDO</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Ingrese la clave para continuar</p>

              <div className="w-full space-y-4">
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                  placeholder="••••"
                  autoFocus
                  className={`w-full bg-white/5 border ${passwordError ? 'border-rose-500 animate-shake' : 'border-white/10'} rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all`}
                />
                {passwordError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">Clave incorrecta</p>}
                
                <button 
                  onClick={verifyPassword}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                  VERIFICAR ACCESO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
      {showFineForm && <FineForm vehicles={vehicles} drivers={drivers} onClose={() => setShowFineForm(false)} onSubmit={async (d) => { await submitFineToSheet(d); handleSyncData(); }} />}
      {managingFineSupport && <FineSupportForm fine={managingFineSupport} onClose={() => setManagingFineSupport(null)} onSubmit={async (d) => { await submitFineToSheet(d); handleSyncData(); }} />}
      {showDocUpdateForm && <DocumentUpdateForm vehicles={vehicles} onClose={() => setShowDocUpdateForm(false)} onSubmit={async (d) => { await submitDocumentUpdateToSheet(d); handleSyncData(); }} />}
      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => setShowReportForm(false)} onSubmit={async (d) => { await submitReportToSheet(d); handleSyncData(); }} />}
      {showWashForm && <WashForm vehicles={vehicles} onClose={() => setShowWashForm(false)} onSubmit={async (d) => { await submitWashToSheet(d); handleSyncData(); }} />}
      {showCleaningForm && <CleaningForm vehicles={vehicles} onClose={() => setShowCleaningForm(false)} onSubmit={async (d) => { await submitCleaningToSheet(d); handleSyncData(); }} />}
      {closingCleaning && <CleaningForm vehicles={vehicles} preSelectedPlate={closingCleaning.plate} initialDate={closingCleaning.date} onClose={() => setClosingCleaning(null)} onSubmit={async (d) => { await submitCleaningToSheet(d); handleSyncData(); }} />}
      {showCalibrationForm && (
        <CalibrationForm 
          vehicles={vehicles} 
          calibrationToUpdate={updatingCalibration || undefined}
          onClose={() => {
            setShowCalibrationForm(false);
            setUpdatingCalibration(null);
          }} 
          onSubmit={async (d: any) => { 
            if (d.isUpdate) {
              await submitCalibrationUpdateToSheet(d);
            } else {
              await submitCalibrationToSheet(d);
            }
            handleSyncData(); 
          }} 
        />
      )}
      {closingReport && (
        <ClosureForm 
          report={closingReport} 
          onClose={() => setClosingReport(null)} 
          onSubmit={async (id, d) => { 
            const selectedVehicle = vehicles.find(v => v.plate === closingReport.plate);
            const finalReport = {
              ...closingReport, 
              ...d,
              cd: selectedVehicle?.cd || closingReport.cd || 'GENERAL',
              contractor: selectedVehicle?.contractor || closingReport.contractor || 'GENERAL'
            } as any;
            await submitReportToSheet(finalReport); 
            handleSyncData(); 
          }} 
        />
      )}
      {registeringEntry && (
        <WorkshopEntryForm 
          report={registeringEntry} 
          onClose={() => setRegisteringEntry(null)} 
          onSubmit={async (d) => { 
            const selectedVehicle = vehicles.find(v => v.plate === registeringEntry.plate);
            const finalReport = {
              ...registeringEntry, 
              ...d,
              cd: selectedVehicle?.cd || registeringEntry.cd || 'GENERAL',
              contractor: selectedVehicle?.contractor || registeringEntry.contractor || 'GENERAL'
            } as any;
            await submitReportToSheet(finalReport); 
            handleSyncData(); 
          }} 
        />
      )}
      {closingWorkshopVisit && <WorkshopVisitClosureForm visit={closingWorkshopVisit} onClose={() => setClosingWorkshopVisit(null)} onSubmit={async (d) => { 
        const res = await submitWorkshopVisitUpdateToSheet(d); 
        if (res.success) {
          handleSyncData(); 
        } else {
          alert("Error al guardar evidencias: " + (res.message || "No se encontró el registro en la hoja"));
        }
      }} />}
    </div>
  );
};

export default App;
