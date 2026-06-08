import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, Calibration, WashReport, Fine, Preventive, AvailabilityRecord, AvailabilitySummary, FleetComposition, OperationalIndicator, WorkshopRecord, CheckList, FuelPerformance, PlateAdherence, Corrective, UnavailabilityRecord, OperatorRecord, ControlTowerRecord, AuditRecord, AuditMasterVehicle, FleetListRecord, FleetStandardAudit, InventoryRecord } from '../types';
import { calculateStatus, normalizePlate, normalizeStr, getDaysDiff } from '../utils';

const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxZqiYK7i3QcTnZJIom0duCYJa-q2U-fFtyh-gwe1eP-IhBp25I_XnOPRVAPTC-RlRu/exec'; 
const GOOGLE_SCRIPT_FINES_URL = 'https://script.google.com/macros/s/AKfycbxZqiYK7i3QcTnZJIom0duCYJa-q2U-fFtyh-gwe1eP-IhBp25I_XnOPRVAPTC-RlRu/exec';
const GOOGLE_SCRIPT_WORKSHOP_URL = 'https://script.google.com/macros/s/AKfycbxZqiYK7i3QcTnZJIom0duCYJa-q2U-fFtyh-gwe1eP-IhBp25I_XnOPRVAPTC-RlRu/exec';
const GOOGLE_SCRIPT_DAILY_PROGRAM_URL = 'https://script.google.com/macros/s/AKfycbxZqiYK7i3QcTnZJIom0duCYJa-q2U-fFtyh-gwe1eP-IhBp25I_XnOPRVAPTC-RlRu/exec';
const GOOGLE_SCRIPT_AUDIT_URL = 'https://script.google.com/macros/s/AKfycbxZqiYK7i3QcTnZJIom0duCYJa-q2U-fFtyh-gwe1eP-IhBp25I_XnOPRVAPTC-RlRu/exec';

// HOJA MAESTRA (Donde se encuentran los Vehículos y Conductores)
const REAL_MASTER_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${REAL_MASTER_ID}/export?format=csv`;

// HOJA OPERATIVA / BACKEND
const BACKEND_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_BACKEND = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv`;

const CORRECTIVES_DOC_ID = '1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0';
const BASE_URL_CORRECTIVES = `https://docs.google.com/spreadsheets/d/${CORRECTIVES_DOC_ID}/export?format=csv`;

// ID de la hoja de Comparendos
const FINES_SHEET_ID = '1WnzEFfVMTHZVVKWGTMLU2WjY-GIzSRpWz52i_Es0E1M';
const BASE_URL_FINES = `https://docs.google.com/spreadsheets/d/${FINES_SHEET_ID}/export?format=csv`;

const OPERATORS_DOC_ID = '1qLEXUCt1RAr28lwOX2sCJhjoEoG4vKVOrv2d45iZ6kU';

// GIDs for fallbacks
const VEHICLES_GID = '1506825194';
const DRIVERS_GID = '1834987510';
const NOVEDADES_GID = '1789987673';
const VISITAS_GID = '239875479';
const MILEAGE_GID = '1929496440';
const CALIBRATIONS_GID = '505557891';
const CLEANING_GID = '1853969081';
const DISPONIBILIDAD_GID = '1143899477'; // Aproximate, check later if needed

// ID de la hoja de Check List
const CHECKLIST_DOC_ID = '1i6qGjwhQW3AeR1ja5UxZkOXjJU3oh0f_8Grt131NQzk';
const CHECKLIST_GALAPA_DOC_ID = '14kak0CqSnX9oOXk0GKD0G_QIt5aJxuCu9-_Livst70Y';

// TORRE DE CONTROL
const CONTROL_TOWER_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const CONTROL_TOWER_GID = '2041116370';

const AUDIT_DOC_ID = '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs';
const FLEET_AVAILABILITY_DOC_ID = '1NTOAqE9fD5qepaAqQ1s_AbvilYHaQGl7f9fIPW_mq8E';
const AUDIT_QS_DOC_ID = '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM';

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const fetchDataFromGAS = async (docId: string, sheetName?: string, scriptUrl: string = GOOGLE_SCRIPT_WEB_APP_URL): Promise<any[][] | null> => {
  try {
    let url = `${scriptUrl}?method=GET_DATA&docId=${docId}`;
    if (sheetName) url += `&sheetName=${encodeURIComponent(sheetName)}`;
    
    // Usamos un timeout para el fetch para evitar esperas infinitas
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    const response = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`GAS Fetch failed for ${sheetName}: ${response.status} ${response.statusText}`);
      return null;
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.status === 'success' && json.message) return json.message as any[][];
      if (json.status === 'error') console.warn(`GAS Error for ${sheetName}:`, json.message);
      return null;
    } catch (parseError) {
      console.warn(`Error parsing GAS response for ${sheetName}`);
      return null;
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      console.warn(`GAS fetch timeout for ${sheetName}`);
    } else {
      // Usamos warn en vez de error para no alarmar si hay fallback CSV
      console.warn(`GAS lookup bypassed for ${sheetName} (Network/CORS redirect). Falling back to CSV/Direct.`);
    }
    return null;
  }
};

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  // Eliminar espacios en blanco y caracteres invisibles/especiales
  return String(val).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
};

const parseFlexibleDate = (dateStr: any): string => {
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';
  
  try {
    // Si ya viene en formato YYYY-MM-DD, lo devolvemos tal cual para evitar desfases de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }

    const parts = cleanStr.split(/[\/\-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) { 
        year = parseInt(parts[0]); month = parseInt(parts[1]) - 1; day = parseInt(parts[2]);
      } else { 
        day = parseInt(parts[0]); month = parseInt(parts[1]) - 1; year = parseInt(parts[2]);
      }
      const d2 = new Date(year, month, day);
      if (!isNaN(d2.getTime())) {
        const y = d2.getFullYear();
        const m = String(d2.getMonth() + 1).padStart(2, '0');
        const d = String(d2.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      // Si el string no tiene hora, Date(string) asume UTC. 
      // Para evitar que d.getDate() devuelva el día anterior, usamos los métodos UTC si el string parece ISO
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  } catch { return ''; }
};

const getWeekNumber = (d: Date): number => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

/**
 * VEHÍCULOS (Hoja ALERTA_CAMIONES - GID 1506825194)
 */
export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const rows = await fetchDataFromGAS(REAL_MASTER_ID, 'ALERTA_CAMIONES');
    if (!rows || rows.length === 0) {
      console.warn("GAS fetch vehicles failed, attempting CSV fallback");
      return fetchVehiclesFromSheetCSV();
    }
    return processVehicleRows(rows);
  } catch (e) { 
    return fetchVehiclesFromSheetCSV(); 
  }
};

const fetchVehiclesFromSheetCSV = async (): Promise<Vehicle[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${REAL_MASTER_ID}/gviz/tq?tqx=out:csv&gid=${VEHICLES_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processVehicleRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processVehicleRows = (rows: any[][]): Vehicle[] => {
  const vehicles: Vehicle[] = [];
  let lastCd = 'GENERAL';
  let lastCnt = 'GENERAL';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const currentCd = cleanSheetValue(row[0]).toUpperCase();
    const currentCnt = cleanSheetValue(row[1]).toUpperCase();
    if (currentCd && !currentCd.includes('CENTRO') && !currentCd.includes('CD')) lastCd = currentCd;
    if (currentCnt && !currentCnt.includes('CONTRATISTA') && !currentCnt.includes('OPERADOR')) lastCnt = currentCnt;

    const rawPlate = cleanSheetValue(row[2]);
    const plate = normalizePlate(rawPlate);

    if (plate && !plate.includes("PLACA") && plate.length >= 2) {
      const soatDate = parseFlexibleDate(row[3]);
      const rtmDate = parseFlexibleDate(row[5]);
      const plcDate = parseFlexibleDate(row[7]);
      const extDate = parseFlexibleDate(row[9]);
      
      vehicles.push({
        id: `v-${plate}-${i}`, 
        cd: lastCd,
        contractor: lastCnt,
        brand: "Vehículo", 
        plate, 
        model: "Unidad",
        soat: { 
          expiryDate: soatDate, 
          lastRenewalDate: '', 
          status: calculateStatus(soatDate), 
          daysPending: getDaysDiff(soatDate), 
          url: cleanSheetValue(row[20])
        },
        rtm: { 
          expiryDate: rtmDate, 
          lastRenewalDate: '', 
          status: calculateStatus(rtmDate),
          daysPending: getDaysDiff(rtmDate),
          url: cleanSheetValue(row[21])
        },
        plc: {
          expiryDate: plcDate,
          lastRenewalDate: '',
          status: calculateStatus(plcDate),
          daysPending: getDaysDiff(plcDate),
          url: cleanSheetValue(row[22])
        },
        extinguisher: {
          expiryDate: extDate,
          lastRenewalDate: '',
          status: calculateStatus(extDate),
          daysPending: getDaysDiff(extDate)
        },
        propertyCardUrl: cleanSheetValue(row[19]),
        lastUpdate: new Date().toISOString()
      });
    }
  }
  return vehicles;
};

/**
 * VISITAS A TALLER (GID 239875479 - Hoja Operativa)
 */
export const fetchWorkshopVisitsFromSheet = async (): Promise<Report[]> => {
  try {
    // Intentar primero con GAS
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'VISITAS A TALLER');
    if (rows && rows.length >= 2) {
      return processWorkshopVisitRows(rows);
    }
  } catch (e) { 
    // Fallback silencioso
  }
  return fetchWorkshopVisitsFromSheetCSV();
};

const fetchWorkshopVisitsFromSheetCSV = async (): Promise<Report[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv&gid=${VISITAS_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processWorkshopVisitRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processWorkshopVisitRows = (rows: any[][]): Report[] => {
  return rows.slice(1)
    .filter(row => row && row[2]) 
    .map((row, i): Report => {
      const week = cleanSheetValue(row[0]);
      const dateProg = parseFlexibleDate(row[1]);
      const identifier = cleanSheetValue(row[2]);
      const workshop = cleanSheetValue(row[3]);
      const dateVis = parseFlexibleDate(row[4]);
      const evidence = cleanSheetValue(row[5]);
      const statusRaw = cleanSheetValue(row[6]).toUpperCase();
      const hashId = cleanSheetValue(row[7]); 
      const driverName = cleanSheetValue(row[8]);
      
      // Solo es CERRADO si el estado es CERRADO o COMPLETADOS
      const isClosed = statusRaw.includes('CERRADO') || statusRaw.includes('COMPLETADOS');
      
      return {
        id: hashId || `vprog-${i}`,
        week: week,
        date: dateProg,
        plate: normalizePlate(identifier),
        workshop: workshop,
        closureDate: dateVis,
        status: isClosed ? 'COMPLETADOS' : 'PENDIENTES',
        novelty: 'VISITA TÉCNICA PROGRAMADA',
        source: 'CALENDARIO',
        initialEvidence: evidence,
        cd: 'GENERAL',
        driverName: driverName
      } as any;
    });
};

/**
 * KILOMETRAJE (GID 1929496440)
 */
export const fetchMileageLogsFromSheet = async (): Promise<MileageLog[]> => {
  try {
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'KILOMETRAJE');
    if (!rows || rows.length < 2) {
      return fetchMileageLogsFromSheetCSV();
    }
    return processMileageRows(rows);
  } catch (e) { 
    return fetchMileageLogsFromSheetCSV(); 
  }
};

const fetchMileageLogsFromSheetCSV = async (): Promise<MileageLog[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv&gid=${MILEAGE_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processMileageRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processMileageRows = (rows: any[][]): MileageLog[] => {
  return rows.slice(1).filter(row => row && row[4]).map((row): MileageLog => ({
    cd: cleanSheetValue(row[0]),          
    contractor: cleanSheetValue(row[1]),  
    week: cleanSheetValue(row[2]),        
    date: parseFlexibleDate(row[3]),      
    plate: normalizePlate(cleanSheetValue(row[4])), 
    mileage: parseInt(cleanSheetValue(row[5])) || 0 
  }));
};

/**
 * CALIBRACIONES (GID 505557891)
 */
export const fetchCalibrationsFromSheet = async (): Promise<Calibration[]> => {
  try {
    const vehicles = await fetchVehiclesFromSheet();
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'CALIBRACIONES');
    if (!rows || rows.length < 2) {
      return fetchCalibrationsFromSheetCSV(vehicles);
    }
    return processCalibrationRows(rows, vehicles);
  } catch (e) { 
    return fetchCalibrationsFromSheetCSV(); 
  }
};

const fetchCalibrationsFromSheetCSV = async (vehicles: Vehicle[] = []): Promise<Calibration[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv&gid=${CALIBRATIONS_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processCalibrationRows(rows, vehicles));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processCalibrationRows = (rows: any[][], vehicles: Vehicle[] = []): Calibration[] => {
  const fleetMap = new Map<string, { cd: string, contractor: string }>();
  vehicles.forEach(v => {
    if (v.plate) {
      fleetMap.set(normalizePlate(v.plate), { cd: v.cd, contractor: v.contractor });
    }
  });

  return rows.slice(1).filter(row => row && row[3]).map((row, index): Calibration => {
    const calDateStr = parseFlexibleDate(row[1]);
    const expDate = calDateStr ? new Date(calDateStr + 'T12:00:00') : null;
    const year = expDate ? expDate.getFullYear() : undefined;
    const monthVal = cleanSheetValue(row[0]) || (expDate ? expDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase() : 'GENERAL');
    const week = cleanSheetValue(row[2]);
    const plate = normalizePlate(cleanSheetValue(row[3])); 
    const workshop = cleanSheetValue(row[4]);             
    const evidenceUrl = cleanSheetValue(row[5]);
    const estado = cleanSheetValue(row[6]).toUpperCase().trim();
    
    const fleetInfo = fleetMap.get(plate);
    const rawCd = cleanSheetValue(row[7]).trim();
    const rawContractor = cleanSheetValue(row[8]).trim();

    const cd = (rawCd && rawCd !== "GENERAL" && rawCd !== "0" && rawCd !== "") ? rawCd : (fleetInfo?.cd || 'GENERAL');
    const contractor = (rawContractor && rawContractor !== "GENERAL" && rawContractor !== "0" && rawContractor !== "") ? rawContractor : (fleetInfo?.contractor || 'GENERAL');
    
    if (expDate) expDate.setFullYear(expDate.getFullYear() + 1);
    const expDateStr = expDate ? expDate.toISOString().split('T')[0] : '';
    return {
      id: `cal-${plate}-${calDateStr}-${index}`,
      plate,
      equipment: workshop || 'TALLER NO ESPECIFICADO',
      calibrationDate: calDateStr,
      expiryDate: expDateStr,
      certificateUrl: evidenceUrl,
      status: calculateStatus(expDateStr),
      daysPending: getDaysDiff(expDateStr),
      month: monthVal,
      week,
      estado,
      year,
      cd: cd,
      contractor: contractor
    };
  });
};

/**
 * LAVADOS (Hoja LAVADOS)
 */
export const fetchWashReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'LAVADOS');
    if (!rows || rows.length < 2) {
      return fetchWashReportsFromSheetCSV();
    }
    return processWashRows(rows);
  } catch (e) { 
    return fetchWashReportsFromSheetCSV(); 
  }
};

const fetchWashReportsFromSheetCSV = async (): Promise<WashReport[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv&sheet=LAVADOS${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processWashRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processWashRows = (rows: any[][]): WashReport[] => {
  // Intentamos identificar las columnas si hay cabecera
  const header = rows[0].map(h => String(h).toUpperCase());
  let plateIdx = header.findIndex(h => h.includes('PLACA'));
  let dateIdx = header.findIndex(h => h.includes('FECHA'));
  let monthIdx = header.findIndex(h => h.includes('MES'));
  let weekIdx = header.findIndex(h => h.includes('SEMANA'));
  let evidenceIdx = header.findIndex(h => h.includes('EVIDENCIA') || h.includes('FOTO'));

  // Fallbacks si no hay cabecera clara
  if (plateIdx === -1) plateIdx = 4;
  if (dateIdx === -1) dateIdx = 3;
  if (monthIdx === -1) monthIdx = 1;
  if (weekIdx === -1) weekIdx = 2;
  if (evidenceIdx === -1) evidenceIdx = 5;

  return rows.slice(1)
    .filter(row => row && (row[plateIdx] || row[dateIdx]))
    .map((row, i): WashReport => {
      const plate = normalizePlate(cleanSheetValue(row[plateIdx]));
      const date = parseFlexibleDate(row[dateIdx]);
      let month = cleanSheetValue(row[monthIdx]);
      const evidence = cleanSheetValue(row[evidenceIdx]);
      
      if (!month && date) {
        const d = new Date(date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          month = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
      }

      return {
        id: `wash-${i}-${plate}-${date}`,
        month: month || 'GENERAL',
        week: cleanSheetValue(row[weekIdx]),
        date: date,
        plate: plate,
        evidenceUrl: evidence,
        initialEvidenceUrl: evidence,
        finalEvidenceUrl: evidence,
        mapUrl: cleanSheetValue(row[6]),
        workshop: cleanSheetValue(row[7]),
        status: 'CERRADO'
      };
    });
};

/**
 * LIMPIEZA (GID 1853969081 - CRONOGRAMA 5S)
 */
export const fetchCleaningReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'CRONOGRAMA 5S');
    if (!rows || rows.length < 2) {
      return fetchCleaningReportsFromSheetCSV();
    }
    return processCleaningRows(rows);
  } catch (e) { 
    return fetchCleaningReportsFromSheetCSV(); 
  }
};

const fetchCleaningReportsFromSheetCSV = async (): Promise<WashReport[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv&gid=${CLEANING_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processCleaningRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processCleaningRows = (rows: any[][]): WashReport[] => {
  return rows.slice(1)
    .filter(row => row && (row[3] || row[0]))
    .map((row, i): WashReport => {
      const dateProg = parseFlexibleDate(row[0]);
      let month = cleanSheetValue(row[1]);
      const week = cleanSheetValue(row[2]);
      const plate = normalizePlate(cleanSheetValue(row[3]));
      const statusRaw = cleanSheetValue(row[4]).toUpperCase();
      const initialEvidence = cleanSheetValue(row[5]);
      const finalEvidence = cleanSheetValue(row[6]);
      
      // Fallback: if month is empty, try to derive it from date
      if (!month && dateProg) {
        const d = new Date(dateProg + "T12:00:00");
        if (!isNaN(d.getTime())) {
          month = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
      }

      const isClosed = statusRaw.includes('COMPLETADO') || statusRaw.includes('CERRADO');

      return {
        id: `clean-${i}-${plate}-${dateProg}`, 
        month: month || 'GENERAL', 
        week: week,
        date: dateProg, 
        plate: plate,
        evidenceUrl: finalEvidence || initialEvidence, 
        initialEvidenceUrl: initialEvidence,
        finalEvidenceUrl: finalEvidence,
        mapUrl: '', 
        workshop: '', 
        status: isClosed ? 'CERRADO' : 'ABIERTO',
        closureDate: isClosed ? dateProg : undefined 
      };
    });
};

/**
 * CONDUCTORES (GID 1834987510)
 */
export const fetchDriversFromSheet = async (): Promise<Driver[]> => {
  try {
    const rows = await fetchDataFromGAS(REAL_MASTER_ID, 'ALERTA_CONDUCTORES');
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch drivers failed, attempting CSV fallback");
      return fetchDriversFromSheetCSV();
    }
    return processDriverRows(rows);
  } catch (e) { 
    return fetchDriversFromSheetCSV();
  }
};

const fetchDriversFromSheetCSV = async (): Promise<Driver[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${REAL_MASTER_ID}/export?format=csv&gid=${DRIVERS_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processDriverRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processDriverRows = (rows: any[][]): Driver[] => {
  return rows.slice(1).filter(row => row && row[2]).map((row): Driver => {
    const licExp = parseFlexibleDate(row[9]);
    const courseExp = parseFlexibleDate(row[11]);
    const medicalExp = parseFlexibleDate(row[13]);
    
    return {
      id: `d-${cleanSheetValue(row[3])}`,
      name: cleanSheetValue(row[2]),
      identification: cleanSheetValue(row[3]),
      hireDate: parseFlexibleDate(row[6]),
      position: cleanSheetValue(row[4]),
      status: cleanSheetValue(row[5]),
      experienceTime: cleanSheetValue(row[8]),
      licenseIssueDate: parseFlexibleDate(row[7]),
      photoUrl: cleanSheetValue(row[21]),
      cd: cleanSheetValue(row[0]),
      contractor: cleanSheetValue(row[1]),
      license: { 
        expiryDate: licExp, 
        lastRenewalDate: '', 
        status: calculateStatus(licExp), 
        url: cleanSheetValue(row[18]), 
        daysPending: getDaysDiff(licExp) 
      },
      defensiveDriving: { 
        expiryDate: courseExp, 
        lastRenewalDate: '', 
        status: calculateStatus(courseExp), 
        url: cleanSheetValue(row[19]),
        daysPending: getDaysDiff(courseExp)
      },
      medicalExam: { 
        expiryDate: medicalExp, 
        lastRenewalDate: '', 
        status: calculateStatus(medicalExp), 
        url: cleanSheetValue(row[20]),
        daysPending: getDaysDiff(medicalExp)
      }
    };
  });
};

/**
 * NOVEDADES (GID 1789987673)
 */
export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'NOVEDADES');
    if (!rows || rows.length === 0) {
      return fetchReportsFromSheetCSV();
    }
    return processReportRows(rows);
  } catch (e) { 
    return fetchReportsFromSheetCSV(); 
  }
};

const fetchReportsFromSheetCSV = async (): Promise<Report[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv&gid=${NOVEDADES_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processReportRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processReportRows = (rows: any[][]): Report[] => {
  if (rows.length === 0) return [];
  const header = rows[0].map(h => String(h).toUpperCase());

  const getIdx = (name: string, fallback: number) => {
    const idx = header.findIndex(h => h.includes(name));
    return idx !== -1 ? idx : fallback;
  };

  const plateIdx = getIdx('PLACA', 4);
  const dateIdx = getIdx('FECHA', 1);
  const cdIdx = getIdx('CENTRO', 2);
  const contractorIdx = getIdx('CONTRATISTA', 3);
  const sourceIdx = getIdx('ORIGEN', 5);
  const workshopDateIdx = getIdx('FECHA TALLER', 6);
  const initEvidenceIdx = getIdx('EVIDENCIA INICIAL', 7);
  const noveltyIdx = getIdx('NOVEDAD', 8);
  const daysToAttendIdx = getIdx('DIAS PARA ATENDER', 9);
  const entryMapIdx = getIdx('MAPA ENTRADA', 10);
  const statusIdx = getIdx('ESTADO', 11);
  const workshopEvidenceIdx = getIdx('EVIDENCIA TALLER', 12);
  const closureDateIdx = getIdx('FECHA CIERRE', 13);
  
  // Si no encuentra 'EVIDENCIA SOLUCION', probamos con 'BW' o el fallback 14
  let solutionEvidenceIdx = header.findIndex(h => h.includes('EVIDENCIA SOLUCION') || h === 'BW');
  if (solutionEvidenceIdx === -1) solutionEvidenceIdx = 14; 
  // Especial handling for user's BW request if index 74 exists and is not found by name
  if (rows[0].length > 74 && solutionEvidenceIdx === 14) solutionEvidenceIdx = 74;

  const exitMapIdx = getIdx('MAPA SALIDA', 15);
  const daysInShopIdx = getIdx('DIAS EN TALLER', 16);
  const commentsIdx = getIdx('COMENTARIOS', 17);
  const workshopIdx = getIdx('TALLER', 18);

  return rows.slice(1).filter(row => row && row[0]).map((row): Report => {
    const statusRaw = cleanSheetValue(row[statusIdx]).toUpperCase();
    const isClosed = statusRaw.includes('CERRADO') || statusRaw.includes('COMPLETADOS');

    return {
      id: cleanSheetValue(row[0]), 
      date: parseFlexibleDate(row[dateIdx]), 
      cd: cleanSheetValue(row[cdIdx]),
      contractor: cleanSheetValue(row[contractorIdx]),
      plate: normalizePlate(cleanSheetValue(row[plateIdx])), 
      source: cleanSheetValue(row[sourceIdx]), 
      workshopDate: parseFlexibleDate(row[workshopDateIdx]),
      initialEvidence: cleanSheetValue(row[initEvidenceIdx]), 
      novelty: cleanSheetValue(row[noveltyIdx]), 
      daysToAttend: parseInt(cleanSheetValue(row[daysToAttendIdx])) || 0,
      entryMap: cleanSheetValue(row[entryMapIdx]), 
      status: isClosed ? 'COMPLETADOS' : 'PENDIENTES', 
      workshopEvidence: cleanSheetValue(row[workshopEvidenceIdx]), 
      closureDate: parseFlexibleDate(row[closureDateIdx]), 
      solutionEvidence: cleanSheetValue(row[solutionEvidenceIdx]), 
      exitMap: cleanSheetValue(row[exitMapIdx]), 
      daysInShop: parseInt(cleanSheetValue(row[daysInShopIdx])) || 0, 
      closureComments: cleanSheetValue(row[commentsIdx]), 
      workshop: cleanSheetValue(row[workshopIdx])
    };
  });
};

/**
 * COMPARENDOS
 */
export const fetchFinesFromSheet = async (): Promise<Fine[]> => {
  try {
    const rows = await fetchDataFromGAS(FINES_SHEET_ID, 'COMPARENDOS');
    if (!rows || rows.length === 0) {
      return fetchFinesFromSheetCSV();
    }
    return processFineRows(rows);
  } catch (e) { 
    return fetchFinesFromSheetCSV(); 
  }
};

const fetchFinesFromSheetCSV = async (): Promise<Fine[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${FINES_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processFineRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processFineRows = (rows: any[][]): Fine[] => {
  // Skip the first row if it's the header "MES"
  const startIdx = (rows[0] && cleanSheetValue(rows[0][0]).toUpperCase() === 'MES') ? 1 : 0;
  
  return rows.slice(startIdx)
    .filter(r => r && r.some(c => cleanSheetValue(c).length > 0))
    .map((row, i): Fine => {
      return {
        id: `row-${startIdx + i + 1}`,
        month: cleanSheetValue(row[0]),
        registrationDate: parseFlexibleDate(row[1]),
        cd: cleanSheetValue(row[2]),
        contractor: cleanSheetValue(row[3]),
        driverName: cleanSheetValue(row[4]),
        driverId: cleanSheetValue(row[5]),
        driverPosition: cleanSheetValue(row[6]),
        amount: parseFloat(cleanSheetValue(row[9])) || 0,
        status: cleanSheetValue(row[8]).toUpperCase().includes('SI') ? 'PENDIENTE' : 'PAGADO',
        paymentAgreement: cleanSheetValue(row[8]),
        evidenceUrl: cleanSheetValue(row[7]).startsWith('http') ? cleanSheetValue(row[7]) : '',
        infractionCode: cleanSheetValue(row[10]),
        date: parseFlexibleDate(row[11]),
        description: cleanSheetValue(row[12]),
        plate: normalizePlate(cleanSheetValue(row[17]))
      } as any;
    });
};

export const fetchAvailabilityFromSheet = async (): Promise<AvailabilityRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(FLEET_AVAILABILITY_DOC_ID, 'DISPONILIDAD');
    if (!rows || rows.length < 2) {
      return fetchAvailabilityFromSheetCSV();
    }
    return processAvailabilityRows(rows);
  } catch (e) { 
    return fetchAvailabilityFromSheetCSV(); 
  }
};

const fetchAvailabilityFromSheetCSV = async (): Promise<AvailabilityRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${FLEET_AVAILABILITY_DOC_ID}/export?format=csv&gid=1030492801${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processAvailabilityRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processAvailabilityRows = (rows: any[][]): AvailabilityRecord[] => {
  // Indices based on user mapping:
  // B: Fecha (1), C: CD (2), D: Sistema (3), E: Detalle (4), G: Taller (6), H: Ingreso (7), I: Salida (8), 
  // J: PLACAS (9), K: Contratista (10), L: Dias (11), M: Total (12), N: IndispCount (13), O: DispoCount (14),
  // P: IndispPrc (15), Q: DispoPrc (16), R: VHSCD (17), S: cd_registro (18), T: mes (19), U: sem (20)
  return rows.slice(1)
    .filter(row => row && row[9]) // Using PLACAS (index 9) as the primary identifier
    .map((row, i): AvailabilityRecord => {
      const parseNum = (val: any) => {
        if (!val) return 0;
        const clean = String(val).replace('%', '').replace(',', '.').trim();
        return parseFloat(clean) || 0;
      };
      
      const rawPlate = cleanSheetValue(row[9]);
      const normalizedPlate = normalizePlate(rawPlate);

      return {
        id: `avail-new-${i}`,
        fecha: parseFlexibleDate(row[1]), 
        cdOriginal: cleanSheetValue(row[2]).toUpperCase(),
        sistema: cleanSheetValue(row[3]).toUpperCase(),
        detalle: cleanSheetValue(row[4]),
        placa: normalizedPlate,
        taller: cleanSheetValue(row[6]).toUpperCase(),
        fechaIngreso: parseFlexibleDate(row[7]),
        fechaEstimadaSalida: parseFlexibleDate(row[8]),
        placasKey: normalizedPlate,
        contratista: cleanSheetValue(row[10]).toUpperCase(),
        diasIndisponible: parseNum(row[11]),
        totalVH: parseNum(row[12]),
        vehiculoIndisponible: parseNum(row[13]),
        vehiculosDisponibles: parseNum(row[14]),
        indisponibilidadPrc: parseNum(row[15]),
        disponibilidadPrc: parseNum(row[16]),
        vhsCd: parseNum(row[17]),
        cdRegistro: cleanSheetValue(row[18]).toUpperCase(),
        mes: cleanSheetValue(row[19]),
        semana: cleanSheetValue(row[20])
      };
    });
};

export interface AvailabilitySummaryRecord {
  fecha: string;
  cd: string;
  contratista: string;
  indisponibles: number;
  disponibles: number;
  total: number;
  promedio: number;
}

export const fetchAvailabilitySummaryFromSheet = async (): Promise<AvailabilitySummary[]> => {
  try {
    const rows = await fetchDataFromGAS(FLEET_AVAILABILITY_DOC_ID, '%DISPONIBILIDAD');
    if (!rows || rows.length < 2) {
      // Fallback CSV - we need a GID for %DISPONIBILIDAD, since I don't have it, GAS is the primary way
      // If GAS fails and I don't have GID, it will return empty, which is better than crashing
      return [];
    }
    return processAvailabilitySummaryRows(rows);
  } catch (e) {
    return [];
  }
};

const processAvailabilitySummaryRows = (rows: any[][]): AvailabilitySummary[] => {
  // B: FECHA (1), C: CD (2), D: CONTRATISTA (3), E: VH INDISPONIBLES (4), F: VHS DISPONIBLES (5), G: TOTAl VH (6), H: %PROMEDIO (7)
  return rows.slice(1)
    .filter(row => row && row[1]) // Fecha is B (index 1)
    .map((row): AvailabilitySummary => {
      const parseNum = (val: any) => {
        if (!val) return 0;
        const clean = String(val).replace('%', '').replace(',', '.').trim();
        return parseFloat(clean) || 0;
      };
      
      return {
        fecha: parseFlexibleDate(row[1]),
        cd: cleanSheetValue(row[2]).toUpperCase(),
        contratista: cleanSheetValue(row[3]).toUpperCase(),
        indisponibles: parseNum(row[4]),
        disponibles: parseNum(row[5]),
        total: parseNum(row[6]),
        promedio: parseNum(row[7]) >= 1 ? parseNum(row[7]) : parseNum(row[7]) * 100 // Handle both 0.95 and 95
      };
    });
};

export const fetchFleetBaseData = async (): Promise<FleetListRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(FLEET_AVAILABILITY_DOC_ID, 'LISTA');
    if (!rows || rows.length < 2) {
      return fetchFleetBaseDataCSV();
    }
    return processFleetBaseRows(rows);
  } catch (e) {
    return fetchFleetBaseDataCSV();
  }
};

const fetchFleetBaseDataCSV = async (): Promise<FleetListRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${FLEET_AVAILABILITY_DOC_ID}/export?format=csv&gid=162607153${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processFleetBaseRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processFleetBaseRows = (rows: any[][]): FleetListRecord[] => {
  // Index 0: Placas CO (Indice 1)
  // Index 1: Centro Distribución (Indice 2 - Col B)
  return rows.slice(1)
    .filter(row => row && row[0]) 
    .map((row): FleetListRecord => {
      const cdValue = cleanSheetValue(row[1]);
      return {
        placa: normalizePlate(cleanSheetValue(row[0])),
        cd: cdValue.toUpperCase(),
        canal: cleanSheetValue(row[2]).toUpperCase(),
        distribuidor: cleanSheetValue(row[3]).toUpperCase(),
        contratista: cleanSheetValue(row[4]).toUpperCase()
      };
    });
};

export const fetchOperationalIndicatorsFromSheet = async (): Promise<OperationalIndicator[]> => {
  const docId = '1nKlDzFSZxh9NiWTJgkx2ASIJMbHMSribN3MZ-4mClVU';
  try {
    const rows = await fetchDataFromGAS(docId, 'TABLERO');
    if (!rows || rows.length < 2) {
      return fetchOperationalIndicatorsFromSheetCSV();
    }
    return processIndicatorRows(rows);
  } catch (e) { 
    return fetchOperationalIndicatorsFromSheetCSV(); 
  }
};

const fetchOperationalIndicatorsFromSheetCSV = async (): Promise<OperationalIndicator[]> => {
  try {
    const docId = '1nKlDzFSZxh9NiWTJgkx2ASIJMbHMSribN3MZ-4mClVU';
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=TABLERO${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processIndicatorRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processIndicatorRows = (rows: any[][]): OperationalIndicator[] => {
  const parseNumericValue = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.replace('%', '').replace(',', '.').trim();
    return parseFloat(cleaned) || 0;
  };

  return rows.slice(1)
    .filter(row => row && row[3]) // Indicador en indice 3
    .map((row, i): OperationalIndicator => {
      return {
        id: `op-${i}`,
        month: cleanSheetValue(row[0]),
        week: cleanSheetValue(row[1]),
        cd: cleanSheetValue(row[2]),
        indicator: cleanSheetValue(row[3]),
        actual: parseNumericValue(cleanSheetValue(row[4])),
        trigger: parseNumericValue(cleanSheetValue(row[5])),
        meta: parseNumericValue(cleanSheetValue(row[6])),
      };
    });
};

export const fetchWorkshopRecordsFromSheet = async (): Promise<WorkshopRecord[]> => {
  const docId = '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo';
  try {
    const rows = await fetchDataFromGAS(docId, 'TALLERES');
    if (!rows || rows.length < 2) {
      return fetchWorkshopRecordsFromSheetCSV();
    }
    return processWorkshopRecordRows(rows);
  } catch (e) { 
    return fetchWorkshopRecordsFromSheetCSV(); 
  }
};

const fetchWorkshopRecordsFromSheetCSV = async (): Promise<WorkshopRecord[]> => {
  try {
    const docId = '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo';
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=TALLERES${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processWorkshopRecordRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processWorkshopRecordRows = (rows: any[][]): WorkshopRecord[] => {
  // 0:MES, 1:SEMANA, 2:FECHA, 3:PLACA, 4:ESTADO, 5:NOVEDAD, 6:EVIDENCIA_1, 7:EVIDENCIA_2, 8:MÁS ALTO
  return rows.slice(1)
    .filter(row => row && row[3]) // Placa en indice 3
    .map((row, i): WorkshopRecord => {
      return {
        id: `workshop-${i}`,
        month: cleanSheetValue(row[0]),
        week: cleanSheetValue(row[1]),
        date: parseFlexibleDate(row[2]),
        plate: normalizePlate(cleanSheetValue(row[3])),
        status: cleanSheetValue(row[4]),
        novelty: cleanSheetValue(row[5]),
        evidence1Url: cleanSheetValue(row[6]),
        evidence2Url: cleanSheetValue(row[7]),
        workshopName: cleanSheetValue(row[8]),
      };
    });
};

export const fetchCheckListFromSheet = async (): Promise<CheckList[]> => {
  const fetchFromSource = async (docId: string, sheetName: string, defaultCd: string): Promise<CheckList[]> => {
    try {
      const rows = await fetchDataFromGAS(docId, sheetName);
      if (!rows || rows.length < 2) {
        return fetchFromSourceCSV(docId, sheetName, defaultCd);
      }
      return processCheckListRows(rows, docId, defaultCd);
    } catch (e) { 
      return fetchFromSourceCSV(docId, sheetName, defaultCd); 
    }
  };

  const fetchFromSourceCSV = async (docId: string, sheetName: string, defaultCd: string): Promise<CheckList[]> => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`;
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      const csvText = await response.text();
      if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
      
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: false, skipEmptyLines: 'greedy',
          complete: (results) => {
            const rows = results.data as any[][];
            resolve(processCheckListRows(rows, docId, defaultCd));
          },
          error: () => resolve([])
        });
      });
    } catch (e) { return []; }
  };

  const processCheckListRows = (rows: any[][], docId: string, defaultCd: string): CheckList[] => {
    return rows.slice(1)
      .filter(row => {
        if (!row || !row[8]) return false;
        const empresa = cleanSheetValue(row[8]).toUpperCase();
        return empresa === 'BAVARIA';
      })
      .map((row, i): CheckList => {
        const fecha = parseFlexibleDate(row[1]);
        const rawConductor = cleanSheetValue(row[9]);
        const rawSalida = cleanSheetValue(row[3]);
        const rawRetorno = cleanSheetValue(row[4]);
        const rawSemana = cleanSheetValue(row[10]);

        let semanaStr = rawSemana;
        if (!semanaStr || semanaStr.trim() === '') {
          try {
            if (fecha) {
              const d = new Date(fecha + 'T12:00:00');
              if (!isNaN(d.getTime())) {
                semanaStr = String(getWeekNumber(d));
              }
            }
          } catch (e) {
            semanaStr = '';
          }
        }

        return {
          id: `check-${docId}-${i}`,
          fecha: fecha,
          vehiculo: normalizePlate(cleanSheetValue(row[2])),
          salida: rawSalida === '1' ? '100%' : '0%',
          retorno: rawRetorno === '1' ? '100%' : '0%',
          estado: cleanSheetValue(row[6]),
          contratista: cleanSheetValue(row[7]),
          empresa: cleanSheetValue(row[8]),
          conductor: rawConductor.trim() === '' ? '#N/A' : rawConductor,
          semana: semanaStr,
          novedades: cleanSheetValue(row[12]) || '',
          cd: defaultCd,
          source: defaultCd === 'LA ARENOSA' ? 'ARENOSA' : 'GALAPA'
        };
      });
  };

  const [arenosa, galapa] = await Promise.all([
    fetchFromSource(CHECKLIST_DOC_ID, 'DATA', 'LA ARENOSA'),
    fetchFromSource(CHECKLIST_GALAPA_DOC_ID, 'DATA', 'GALAPA')
  ]);

  return [...arenosa, ...galapa];
};

export const fetchUnavailabilityFromSheet = async (): Promise<UnavailabilityRecord[]> => {
  try {
    const docId = '1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0';
    const rows = await fetchDataFromGAS(docId, 'INDISPONIBILIDAD');
    
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch unavail failed, attempting CSV fallback");
      return fetchUnavailabilityFromSheetCSV();
    }

    return rows.slice(1)
      .filter(row => row && row[2]) // Placa en indice 2
      .map((row, i): UnavailabilityRecord => {
        const plate = normalizePlate(cleanSheetValue(row[2]));
        const entryDate = parseFlexibleDate(row[10]);
        const exitDate = parseFlexibleDate(row[11]);
        let days = parseInt(cleanSheetValue(row[12]));

        if (isNaN(days) || cleanSheetValue(row[12]) === '') {
          if (entryDate) {
            const start = new Date(entryDate + 'T00:00:00');
            const end = exitDate ? new Date(exitDate + 'T00:00:00') : new Date();
            const diffTime = end.getTime() - start.getTime();
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          } else {
            days = 0;
          }
        }

        return {
          id: `unavail-${i}-${plate}`,
          fecha: parseFlexibleDate(row[0]),
          semana: cleanSheetValue(row[1]),
          placa: plate,
          contratista: cleanSheetValue(row[3]),
          cd: cleanSheetValue(row[4]),
          estado: cleanSheetValue(row[5]),
          sistema: cleanSheetValue(row[6]),
          novedad: cleanSheetValue(row[7]),
          criticidad: cleanSheetValue(row[8]),
          taller: cleanSheetValue(row[9]),
          fechaIngreso: entryDate,
          fechaSalida: exitDate,
          diasTaller: days
        };
      });
  } catch (e) {
    console.error("Error fetching unavail from GAS:", e);
    return fetchUnavailabilityFromSheetCSV();
  }
};

const fetchUnavailabilityFromSheetCSV = async (): Promise<UnavailabilityRecord[]> => {
  try {
    const docId = '1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0';
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=INDISPONIBILIDAD${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          const records = rows.slice(1)
            .filter(row => row && row[2]) 
            .map((row, i): UnavailabilityRecord => {
              const plate = normalizePlate(cleanSheetValue(row[2]));
              const entryDate = parseFlexibleDate(row[10]);
              const exitDate = parseFlexibleDate(row[11]);
              let days = parseInt(cleanSheetValue(row[12]));
              if (isNaN(days) || cleanSheetValue(row[12]) === '') {
                if (entryDate) {
                  const start = new Date(entryDate + 'T00:00:00');
                  const end = exitDate ? new Date(exitDate + 'T00:00:00') : new Date();
                  const diffTime = end.getTime() - start.getTime();
                  days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                } else { days = 0; }
              }
              return {
                id: `unavail-${i}-${plate}`,
                fecha: parseFlexibleDate(row[0]),
                semana: cleanSheetValue(row[1]),
                placa: plate,
                contratista: cleanSheetValue(row[3]),
                cd: cleanSheetValue(row[4]),
                estado: cleanSheetValue(row[5]),
                sistema: cleanSheetValue(row[6]),
                novedad: cleanSheetValue(row[7]),
                criticidad: cleanSheetValue(row[8]),
                taller: cleanSheetValue(row[9]),
                fechaIngreso: entryDate,
                fechaSalida: exitDate,
                diasTaller: days
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const saveUnavailabilityRecords = async (records: Partial<UnavailabilityRecord>[]): Promise<boolean> => {
  const UNAVAILABILITY_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYjuq6x1ZAlLi9ctIDl_d66J4RrE3Y0qmiUGeRAcxuHUbbi5oTtOxyv6E-7FNu1Oc/exec';
  
  // Función para formatear YYYY-MM-DD a DD/MM/YYYY
  const formatSheetDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const payload = {
    method: 'POST_UNAVAILABILITY_BATCH',
    data: records.map(r => [
      formatSheetDate(r.fecha),      // Index 0: Fecha
      r.semana || '',                // Index 1: Semana
      r.placa || '',                 // Index 2: Placa
      r.contratista || '',           // Index 3: Contratista
      r.cd || '',                    // Index 4: CD
      r.estado || '',                // Index 5: Estado
      r.sistema || '',               // Index 6: Sistema
      r.novedad || '',               // Index 7: Novedad
      r.criticidad || '',            // Index 8: Criticidad (Enviamos solo el número)
      r.taller || '',                // Index 9: Taller
      formatSheetDate(r.fechaIngreso), // Index 10: Fecha de ingreso
      formatSheetDate(r.fechaSalida),  // Index 11: Fecha salida de taller
      r.diasTaller || ''             // Index 12: Días en taller
    ])
  };

  return sendToGAS(payload, UNAVAILABILITY_SCRIPT_URL);
};

export const fetchFuelPerformanceFromSheet = async (): Promise<FuelPerformance[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTaur0xTXFcug2tg_CW5gBBHnh9QtH8psRy0nLHcYSPqoPfs3Tt2d-X3nNWuvUnxRKjxvmJIFryPnTK/pub?gid=1098828384&single=true&output=csv${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          // Indices provided by user:
          // 0: Mes1, 1: Semana, 2: CD, 3: ID CD, 4: PLACA, 5: Distancia (Km), 6: Exceso de Velocidad, 
          // 7: En ralentí > 5 min., 8: Tiempo en ralentí, 9: Viajes, 10: Cantidad (Gal), 
          // 11: CD1, 12: Gerencia, 13: CANTIDAD GALONES, 14: KM RECORRIDOS, 15: CONTRATISTA
          const records = rows.slice(1)
            .filter(row => row && row[4]) // Placa en indice 4
            .map((row, i): FuelPerformance => {
              const parseNum = (val: any) => {
                const clean = cleanSheetValue(val).replace('%', '').replace(',', '.').trim();
                return parseFloat(clean) || 0;
              };
              
              const mileage = parseNum(row[5]);
              const gallons = parseNum(row[13]);
              const kmpg = gallons > 0 ? mileage / gallons : 0;
              const targetKmpg = 10; // Default target
              
              return {
                id: `fuel-${i}`,
                month: cleanSheetValue(row[0]),
                week: cleanSheetValue(row[1]),
                date: '', // Not explicitly in the new indices
                plate: normalizePlate(cleanSheetValue(row[4])),
                driver: '#N/A', // Not explicitly in the new indices
                contractor: cleanSheetValue(row[15]),
                cd: cleanSheetValue(row[2]),
                mileage: mileage,
                gallons: gallons,
                kmpg: kmpg,
                speeding: parseNum(row[6]),
                idlingCount: parseNum(row[7]),
                idlingTime: cleanSheetValue(row[8]),
                trips: parseNum(row[9]),
                targetKmpg: targetKmpg,
                compliance: targetKmpg > 0 ? (kmpg / targetKmpg) * 100 : 0
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const fetchPlateAdherenceFromSheet = async (): Promise<PlateAdherence[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQZ7_kRXNquJ468yEWrpOxrytSu6BEeXN5K838BPD4seHFrHBfnFYGFWf1z6dh7-tubjf0nAF3kV0gd/pub?gid=2011902930&single=true&output=csv${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          // B: FECHA (1), C: PLACA (2), H: NOMBRE DEL CONDUCTOR (7), J: VALIDADOR (9)
          const records = rows.slice(1)
            .filter(row => row && row[2]) // Placa en indice 2
            .map((row, i): PlateAdherence => {
              const validador = cleanSheetValue(row[9]);
              return {
                id: `adh-${i}`,
                date: parseFlexibleDate(row[1]),
                plate: normalizePlate(cleanSheetValue(row[2])),
                driverName: cleanSheetValue(row[7]),
                isValid: validador === '1'
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const fetchCorrectivesFromSheet = async (): Promise<Corrective[]> => {
  try {
    const rows = await fetchDataFromGAS(CORRECTIVES_DOC_ID, 'PROGRAMACION');
    
    if (!rows || rows.length < 1) {
      console.warn("GAS fetch correctives failed, attempting CSV fallback");
      return fetchCorrectivesFromSheetCSV();
    }

    const headers = rows[0].map((h: any) => cleanSheetValue(h).toUpperCase());
    return processCorrectiveRows(rows, headers);
  } catch (e) {
    console.error("Error fetching correctives from GAS:", e);
    return fetchCorrectivesFromSheetCSV();
  }
};

const fetchCorrectivesFromSheetCSV = async (): Promise<Corrective[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${CORRECTIVES_DOC_ID}/gviz/tq?tqx=out:csv&sheet=PROGRAMACION${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[];
          if (!rows || rows.length === 0) { resolve([]); return; }
          const records = rows
            .filter(row => row && (row['PLACA'] || row[3])) 
            .map((row, i): Corrective => {
              const getValue = (key: string, index: number) => row[key] || row[index] || '';
              return {
                id: `corr-${i}`,
                date: parseFlexibleDate(getValue('FECHA DE PROGRAMACION', 0)),
                contractor: cleanSheetValue(getValue('CONTRATISTA', 1)),
                cd: cleanSheetValue(getValue('CENTRO DE DISTRIBUCION', 2)),
                plate: normalizePlate(cleanSheetValue(getValue('PLACA', 3))),
                system: cleanSheetValue(getValue('SISTEMA', 4)),
                novelty: cleanSheetValue(getValue('NOVEDADES CORRECTIVAS', 5)),
                workshop: cleanSheetValue(getValue('TALLER PROPUESTO', 6)),
                status: cleanSheetValue(getValue('ESTADO', 7)),
                exitDate: parseFlexibleDate(getValue('FECHA DE SALIDA', 8)),
                evidence1: cleanSheetValue(getValue('EVIDDENCIA 1', 9)),
                evidence2: cleanSheetValue(getValue('EVIDENCIA 2', 10)),
                evidence3: cleanSheetValue(getValue('ENVIDENCIA', 11)),
                evidence4: cleanSheetValue(getValue('EVIDENCIA 4', 12))
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processCorrectiveRows = (rows: any[][], headers: string[]): Corrective[] => {
  return rows.slice(1)
    .filter(row => row && (cleanSheetValue(row[3]) || cleanSheetValue(row[headers.indexOf('PLACA')])))
    .map((row, i): Corrective => {
      const getV = (key: string, idx: number) => {
        const hIdx = headers.indexOf(key.toUpperCase());
        return cleanSheetValue(row[hIdx !== -1 ? hIdx : idx]);
      };
      
      return {
        id: `corr-${i}`,
        date: parseFlexibleDate(getV('FECHA DE PROGRAMACION', 0)),
        contractor: getV('CONTRATISTA', 1),
        cd: getV('CENTRO DE DISTRIBUCION', 2),
        plate: normalizePlate(getV('PLACA', 3)),
        system: getV('SISTEMA', 4),
        novelty: getV('NOVEDADES CORRECTIVAS', 5),
        workshop: getV('TALLER PROPUESTO', 6),
        status: getV('ESTADO', 7),
        exitDate: parseFlexibleDate(getV('FECHA DE SALIDA', 8)),
        evidence1: getV('EVIDDENCIA 1', 9),
        evidence2: getV('EVIDENCIA 2', 10),
        evidence3: getV('ENVIDENCIA', 11),
        evidence4: getV('EVIDENCIA 4', 12)
      };
    });
};

const sendToGAS = async (payload: any, url: string = GOOGLE_SCRIPT_WEB_APP_URL, useCors: boolean = false) => {
  console.log(`🚀 Enviando a GAS (${payload.method}):`, payload);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const options: RequestInit = { 
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload) 
    };

    if (useCors) {
      options.mode = 'cors';
    } else {
      options.mode = 'no-cors';
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (useCors) {
      const result = await response.json();
      return result; // Devuelve {status, message}
    }
    
    return true; 
  } catch (err) { 
    console.warn("GAS - Error en el envío:", err);
    return false; 
  }
};

export const submitDocumentUpdateToSheet = async (data: any): Promise<void> => { await sendToGAS({ method: 'POST_DOC_UPDATE', data }); };
export const submitReportToSheet = async (report: Report): Promise<void> => { await sendToGAS({ method: 'POST_REPORT', data: report }); };
export const submitMileageToSheet = async (mileageData: any): Promise<void> => { 
  const success = await sendToGAS({ method: 'POST_MILEAGE', data: mileageData }); 
  if (!success) throw new Error("Error al guardar en el servidor");
};
export const submitCalibrationToSheet = async (calibrationDate: any): Promise<void> => { await sendToGAS({ method: 'POST_CALIBRATION', data: calibrationDate }); };
export const submitCalibrationUpdateToSheet = async (data: any): Promise<void> => { await sendToGAS({ method: 'POST_CALIBRATION_UPDATE', data }); };
export const submitWashToSheet = async (washData: any): Promise<void> => { await sendToGAS({ method: 'POST_WASH', data: washData }); };
export const submitCleaningToSheet = async (cleaningData: any): Promise<void> => { await sendToGAS({ method: 'POST_CLEANING', data: cleaningData }); };
export const submitWorkshopVisitUpdateToSheet = async (visitData: any): Promise<{success: boolean, message?: string}> => { 
  try {
    const result = await sendToGAS({ method: 'POST_WORKSHOP_VISIT_UPDATE', data: visitData }); 
    return {
      success: !!result,
      message: typeof result === 'string' ? result : undefined
    };
  } catch (error) {
    console.error("Error al actualizar visita:", error);
    return { success: false, message: "Error de conexión" };
  }
};
export const submitWorkshopRecordToSheet = async (data: any): Promise<void> => { await sendToGAS({ method: 'POST_WORKSHOP_RECORD', data }, GOOGLE_SCRIPT_WORKSHOP_URL); };

/**
 * DRIVE UPLOAD
 */
export const uploadImageToDrive = async (base64Data: string, fileName: string): Promise<string> => {
  try {
    const payload = {
      method: 'UPLOAD_IMAGE',
      data: {
        base64: base64Data,
        name: fileName
      }
    };
    
    const response = await fetch(GOOGLE_SCRIPT_AUDIT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.status === 'success') {
      return result.message; // El URL viene en el campo message según el formato estándar de GAS
    }
    throw new Error(result.message || 'Error al subir a Drive');
  } catch (error) {
    console.error("Error uploadImageToDrive:", error);
    throw error;
  }
};

/**
 * PREVENTIVOS (GID 2086109634)
 */
export const fetchPreventivesFromSheet = async (): Promise<Preventive[]> => {
  try {
    const rows = await fetchDataFromGAS(BACKEND_DOC_ID, 'PREVENTIVO');
    if (!rows || rows.length < 2) {
      return fetchPreventivesFromSheetCSV();
    }
    return processPreventiveRows(rows);
  } catch (e) { 
    return fetchPreventivesFromSheetCSV(); 
  }
};

const fetchPreventivesFromSheetCSV = async (): Promise<Preventive[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/gviz/tq?tqx=out:csv&gid=2086109634${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processPreventiveRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processPreventiveRows = (rows: any[][]): Preventive[] => {
  return rows.slice(1)
    .filter(row => row && row[5]) // Placa en indice 5
    .map((row, i): Preventive => {
      const placa = normalizePlate(cleanSheetValue(row[5]));
      const valCumplimiento = parseInt(cleanSheetValue(row[13])) || 0;
      
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (valCumplimiento === 0) status = 'critical';
      else {
        const diff = parseInt(cleanSheetValue(row[11])) || 0;
        if (diff > 200) status = 'warning'; // Pequeña tolerancia de advertencia
      }

      return {
        id: `prev-${placa}-${i}`,
        semProgramado: cleanSheetValue(row[0]),
        fechaProgramada: parseFlexibleDate(row[1]),
        semEjecucion: cleanSheetValue(row[2]),
        mes: cleanSheetValue(row[3]),
        fechaEjecucion: parseFlexibleDate(row[4]),
        placa: placa,
        frecuencia: parseInt(cleanSheetValue(row[6])) || 0,
        ultimoKm: parseInt(cleanSheetValue(row[7])) || 0,
        proximoKm: parseInt(cleanSheetValue(row[8])) || 0,
        kmRegistrado: parseInt(cleanSheetValue(row[9])) || 0,
        tipo: cleanSheetValue(row[10]),
        diferencia: parseInt(cleanSheetValue(row[11])) || 0,
        cumplimientoRango: cleanSheetValue(row[12]),
        validaccionCumplimiento: valCumplimiento,
        cumplimientoProgramacion: parseInt(cleanSheetValue(row[14])) || 0,
        evidenceUrl: cleanSheetValue(row[18]),
        cd: cleanSheetValue(row[16]) || 'GENERAL',
        linea: cleanSheetValue(row[17]),
        status
      };
    });
};

export const submitCorrectiveUpdateToSheet = async (data: any): Promise<{success: boolean, message?: string}> => { 
  try {
    const result = await sendToGAS({ method: 'POST_CORRECTIVE_UPDATE', data }, GOOGLE_SCRIPT_DAILY_PROGRAM_URL); 
    // sendToGAS actualmente devuelve boolean, vamos a ajustarlo
    return {
      success: !!result,
      message: typeof result === 'string' ? result : undefined
    };
  } catch (error) {
    console.error("Error al enviar a GAS:", error);
    return { success: false, message: "Error de conexión" };
  }
};
export const submitFineToSheet = async (data: any): Promise<boolean> => {
  const method = data.updateMode ? 'POST_FINE_UPDATE' : 'POST_FINE';
  return await sendToGAS({ method, data }, GOOGLE_SCRIPT_FINES_URL);
};

export const fetchOperatorsFromSheet = async (): Promise<OperatorRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(OPERATORS_DOC_ID); // Get first sheet by default if MAESTRO name is wrong
    
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch operators failed, attempting CSV fallback");
      return fetchOperatorsFromSheetCSV();
    }

    const parseDays = (val: any): number => {
      const cleaned = cleanSheetValue(val).replace(/[,.]/g, '');
      return parseInt(cleaned) || 0;
    };

    const HEADER_IDENTIFIER = "NOMBRES Y APELLIDOS";
    return rows.slice(1)
      .filter(row => row && row[3] && cleanSheetValue(row[3]) !== "" && cleanSheetValue(row[3]).toUpperCase() !== HEADER_IDENTIFIER)
      .map((row, i): OperatorRecord => {
      return {
        id: `op-${i}-${cleanSheetValue(row[3])}-${cleanSheetValue(row[4])}`,
        cd: cleanSheetValue(row[12]),
        provider: cleanSheetValue(row[2]),
        name: cleanSheetValue(row[3]),
        identification: cleanSheetValue(row[4]),
        position: cleanSheetValue(row[5]),
        hireDate: parseFlexibleDate(row[7]),
        licenseExpiry: parseFlexibleDate(row[14]),
        licenseDaysPending: parseDays(row[15]),
        category: cleanSheetValue(row[16]),
        restrictions: cleanSheetValue(row[17]),
        fines: cleanSheetValue(row[18]),
        courseExpiry: parseFlexibleDate(row[22]),
        courseDaysPending: parseDays(row[23]),
        entity: cleanSheetValue(row[24]),
        examStatus: cleanSheetValue(row[25]),
        examExpiry: parseFlexibleDate(row[26]),
        examDaysPending: parseDays(row[27]),
        opmCourseDate: parseFlexibleDate(row[28]),
        opmExpiry: parseFlexibleDate(row[29]),
        opmDaysPending: parseDays(row[30]),
        opmEntity: cleanSheetValue(row[31]),
        licenseUrl: cleanSheetValue(row[32]),
        courseUrl: cleanSheetValue(row[33]),
        examUrl: cleanSheetValue(row[34]),
        opmUrl: cleanSheetValue(row[35]),
        photoUrl: cleanSheetValue(row[36])
      };
    });
  } catch (e) {
    console.error("Error fetching operators from GAS:", e);
    return fetchOperatorsFromSheetCSV();
  }
};

export const fetchAuditMasterListFromSheet = async (): Promise<AuditMasterVehicle[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${AUDIT_DOC_ID}/export?format=csv&gid=244265623${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length === 0) { resolve([]); return; }
          
          // Column B (1): Placa, C (2): Contratista, E (4): CD
          const records = rows.slice(1)
            .filter(r => r && r[1])
            .map(row => ({
              plate: normalizePlate(cleanSheetValue(row[1])),
              contractor: cleanSheetValue(row[2]),
              cd: cleanSheetValue(row[4])
            }));
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const fetchOperatorsFromSheetCSV = async (): Promise<OperatorRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${OPERATORS_DOC_ID}/gviz/tq?tqx=out:csv&gid=2049753520${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) {
      console.warn("CSV fetch operators returned HTML or empty - spreadsheet might be private or ID/GID is wrong");
      return [];
    }

    const parseDays = (val: any): number => {
      const cleaned = cleanSheetValue(val).replace(/[,.]/g, '');
      return parseInt(cleaned) || 0;
    };

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }

          const HEADER_IDENTIFIER = "NOMBRES Y APELLIDOS";
          const operators = rows.slice(1)
            .filter(row => row && row[3] && cleanSheetValue(row[3]) !== "" && cleanSheetValue(row[3]).toUpperCase() !== HEADER_IDENTIFIER)
            .map((row, i): OperatorRecord => {
            return {
              id: `op-${i}-${cleanSheetValue(row[3])}-${cleanSheetValue(row[4])}`,
              cd: cleanSheetValue(row[12]),
              provider: cleanSheetValue(row[2]),
              name: cleanSheetValue(row[3]),
              identification: cleanSheetValue(row[4]),
              position: cleanSheetValue(row[5]),
              hireDate: parseFlexibleDate(row[7]),
              licenseExpiry: parseFlexibleDate(row[14]),
              licenseDaysPending: parseDays(row[15]),
              category: cleanSheetValue(row[16]),
              restrictions: cleanSheetValue(row[17]),
              fines: cleanSheetValue(row[18]),
              courseExpiry: parseFlexibleDate(row[22]),
              courseDaysPending: parseDays(row[23]),
              entity: cleanSheetValue(row[24]),
              examStatus: cleanSheetValue(row[25]),
              examExpiry: parseFlexibleDate(row[26]),
              examDaysPending: parseDays(row[27]),
              opmCourseDate: parseFlexibleDate(row[28]),
              opmExpiry: parseFlexibleDate(row[29]),
              opmDaysPending: parseDays(row[30]),
              opmEntity: cleanSheetValue(row[31]),
              licenseUrl: cleanSheetValue(row[32]),
              courseUrl: cleanSheetValue(row[33]),
              examUrl: cleanSheetValue(row[34]),
              opmUrl: cleanSheetValue(row[35]),
              photoUrl: cleanSheetValue(row[36])
            };
          });
          resolve(operators);
        },
        error: (err) => {
          console.error("PapaParse error (operators):", err);
          resolve([]);
        }
      });
    });
  } catch (e) {
    console.error("Error fetching operators CSV:", e);
    return [];
  }
};

export const submitControlTowerUpdateToSheet = async (data: any): Promise<boolean> => {
  return await sendToGAS({ method: 'POST_CONTROL_TOWER_UPDATE', data });
};

export const fetchControlTowerFromSheet = async (): Promise<ControlTowerRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(CONTROL_TOWER_DOC_ID, 'CIERRE DE NOVEDADES');
    
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch control tower failed, attempting CSV fallback");
      return fetchControlTowerFromSheetCSV();
    }

    return rows.slice(1)
      .filter(row => row && row[5]) // Placa en indice 5
      .map((row, i): ControlTowerRecord => {
        const parseNum = (val: any) => {
          const clean = cleanSheetValue(val).replace('%', '').replace(',', '.').trim();
          return parseFloat(clean) || 0;
        };

        return {
          id: `ct-${i}-${cleanSheetValue(row[5])}`,
          contractor: cleanSheetValue(row[0]),
          cd: cleanSheetValue(row[1]),
          reportDate: parseFlexibleDate(row[2]),
          week: cleanSheetValue(row[3]),
          month: cleanSheetValue(row[4]),
          plate: normalizePlate(cleanSheetValue(row[5])),
          source: cleanSheetValue(row[6]),
          novelty: cleanSheetValue(row[7]),
          system: cleanSheetValue(row[8]),
          status: cleanSheetValue(row[9]),
          criticality: cleanSheetValue(row[10]),
          solutionDate: parseFlexibleDate(row[11]),
          closureDays: parseNum(row[12]),
          daysToClose: parseNum(row[13]),
          maintenanceCompliance: cleanSheetValue(row[14]),
          maintenanceGoal: parseNum(row[15]),
          workshopGoal: parseNum(row[16]),
          workshopResponsePercentage: parseNum(row[17]),
          observations: cleanSheetValue(row[18]),
          evidenceBefore: cleanSheetValue(row[19]),
          evidenceAfter: cleanSheetValue(row[20]),
        };
      });
  } catch (e) {
    console.error("Error fetching control tower from GAS:", e);
    return fetchControlTowerFromSheetCSV();
  }
};

const fetchControlTowerFromSheetCSV = async (): Promise<ControlTowerRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${CONTROL_TOWER_DOC_ID}/gviz/tq?tqx=out:csv&gid=${CONTROL_TOWER_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) {
      console.warn("CSV fetch control tower returned HTML or empty - spreadsheet might be private or ID/GID is wrong");
      return [];
    }

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }

          const records = rows.slice(1)
            .filter(row => row && row[5]) // Placa en indice 5
            .map((row, i): ControlTowerRecord => {
              const parseNum = (val: any) => {
                const clean = cleanSheetValue(val).replace('%', '').replace(',', '.').trim();
                return parseFloat(clean) || 0;
              };

              return {
                id: `ct-${i}-${cleanSheetValue(row[5])}`,
                contractor: cleanSheetValue(row[0]),
                cd: cleanSheetValue(row[1]),
                reportDate: parseFlexibleDate(row[2]),
                week: cleanSheetValue(row[3]),
                month: cleanSheetValue(row[4]),
                plate: normalizePlate(cleanSheetValue(row[5])),
                source: cleanSheetValue(row[6]),
                novelty: cleanSheetValue(row[7]),
                system: cleanSheetValue(row[8]),
                status: cleanSheetValue(row[9]),
                criticality: cleanSheetValue(row[10]),
                solutionDate: parseFlexibleDate(row[11]),
                closureDays: parseNum(row[12]),
                daysToClose: parseNum(row[13]),
                maintenanceCompliance: cleanSheetValue(row[14]),
                maintenanceGoal: parseNum(row[15]),
                workshopGoal: parseNum(row[16]),
                workshopResponsePercentage: parseNum(row[17]),
                observations: cleanSheetValue(row[18]),
                evidenceBefore: cleanSheetValue(row[19]),
                evidenceAfter: cleanSheetValue(row[20]),
              };
            });
          resolve(records);
        },
        error: (err) => {
          console.error("PapaParse error (control tower):", err);
          resolve([]);
        }
      });
    });
  } catch (e) {
    console.error("Error fetching control tower CSV:", e);
    return [];
  }
};

export const submitAuditUpdateToSheet = async (data: any): Promise<boolean> => {
  return await sendToGAS({ method: 'POST_AUDIT_UPDATE', data }, GOOGLE_SCRIPT_AUDIT_URL);
};

export const submitPreventiveUpdateToSheet = async (data: {
  plate: string;
  date: string;
  currentKm?: number;
  evidence: string | string[];
}): Promise<boolean> => {
  const result = await sendToGAS({ 
    method: 'POST_PREVENTIVE_UPDATE', 
    data 
  });
  return result === true;
};

export const fetchAuditRecordsFromSheet = async (): Promise<AuditRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(AUDIT_DOC_ID, 'ESTANDAR', GOOGLE_SCRIPT_AUDIT_URL);
    
    if (!rows || rows.length < 2) {
      return fetchAuditRecordsFromSheetCSV();
    }

    return processAuditRows(rows);
  } catch (e) {
    console.error("Error fetching audits from GAS:", e);
    return fetchAuditRecordsFromSheetCSV();
  }
};

const fetchAuditRecordsFromSheetCSV = async (): Promise<AuditRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${AUDIT_DOC_ID}/gviz/tq?tqx=out:csv&sheet=ESTANDAR${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          resolve(processAuditRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const FLEET_STANDARD_SECURITY_ITEMS = [
  'Cinturones de seguridad', 'Cinturones de seguridad 3 puntos', 'Sillas', 'Telemetría', 'Caja fuerte',
  'Botiquín', 'Extintor', 'Dashcam', 'Cámaras auxiliares laterales', 'Vidrios y espejos',
  '3 Puntos de apoyo', 'Accesos a cabina', 'Calapies', 'Seguros de puerta', 'Claxón / Bocina',
  'Sistema de iluminación', 'Sistema de frenos', 'Cámara reversa', 'Sensor proximidad punto ciego',
  'Sensor proximidad marcha atrás', 'Seguros de cortinas', 'Manijas de acceso', 'Peldaños o estribos',
  'Neumáticos', 'Parales', 'Kit de carretera (Conos/Paleta/Tacos)', 'Kit de carretera (Herramientas)'
];

export const FLEET_STANDARD_QUALITY_ITEMS = [
  'Carpas y/o Cortinas', 'Soportes para PFN', 'Techo carrocería', 'Cumplimiento 5S', 
  'Correas de amarre y malacates', 'Carretillas'
];

export const fetchFleetStandardAuditFromSheet = async (): Promise<FleetStandardAudit[]> => {
  try {
    // Try ESTRANDAR first on QS doc, then ESTANDAR
    let rows = await fetchDataFromGAS(AUDIT_QS_DOC_ID, 'ESTRANDAR', GOOGLE_SCRIPT_AUDIT_URL);
    if (!rows || rows.length < 2) {
      rows = await fetchDataFromGAS(AUDIT_QS_DOC_ID, 'ESTANDAR', GOOGLE_SCRIPT_AUDIT_URL);
    }
    
    if (rows && rows.length >= 2) {
      return processFleetStandardAuditRows(rows);
    }
    return fetchFleetStandardAuditFromSheetCSV();
  } catch (e) {
    console.error("Error fetching Fleet Standard audits from GAS:", e);
    return fetchFleetStandardAuditFromSheetCSV();
  }
};

const fetchFleetStandardAuditFromSheetCSV = async (): Promise<FleetStandardAudit[]> => {
  try {
    // Try both sheet names for CSV fallback
    let url = `https://docs.google.com/spreadsheets/d/${AUDIT_QS_DOC_ID}/gviz/tq?tqx=out:csv&sheet=ESTRANDAR${getCacheBuster()}`;
    let response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    let csvText = await response.text();
    
    if (!csvText || csvText.includes("<!DOCTYPE html") || csvText.length < 100) {
      url = `https://docs.google.com/spreadsheets/d/${AUDIT_QS_DOC_ID}/gviz/tq?tqx=out:csv&sheet=ESTANDAR${getCacheBuster()}`;
      response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
      csvText = await response.text();
    }
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          resolve(processFleetStandardAuditRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processFleetStandardAuditRows = (rows: any[][]): FleetStandardAudit[] => {
  const parseScore = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const clean = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return num <= 1 ? num * 100 : num;
  };

  return rows.slice(1)
    .filter(row => row && row[8]) // Placa
    .map((row, i): FleetStandardAudit => {
      // Binary Security Scores: Index 46 to 72 (27 items)
      const securityScores: number[] = [];
      for (let j = 0; j < 27; j++) {
        securityScores.push(parseInt(cleanSheetValue(row[46 + j])) || 0);
      }

      // Binary Quality Scores: Index 73 to 78 (6 items)
      const qualityScores: number[] = [];
      for (let j = 0; j < 6; j++) {
        qualityScores.push(parseInt(cleanSheetValue(row[73 + j])) || 0);
      }

      return {
        id: cleanSheetValue(row[0]) || `std-audit-${i}`,
        startTime: cleanSheetValue(row[1]),
        endTime: cleanSheetValue(row[2]),
        email: cleanSheetValue(row[3]),
        regional: cleanSheetValue(row[4]),
        centro: cleanSheetValue(row[5]),
        tipoAuditoria: cleanSheetValue(row[6]),
        auditor: cleanSheetValue(row[7]),
        placa: normalizePlate(cleanSheetValue(row[8])),
        securityScores,
        qualityScores,
        scoreSegNoMand: parseScore(row[79]), // CB
        scoreCalNoMand: parseScore(row[80]), // CC
        scoreTotalNoMand: parseScore(row[81]), // CD
        scoreSegMand: parseScore(row[82]), // CE
        scoreCalMand: parseScore(row[83]), // CF
        scoreTotalMand: parseScore(row[84]), // CG
        observations: cleanSheetValue(row[42]), // AQ
        mes: cleanSheetValue(row[43]), // AR
        año: parseInt(cleanSheetValue(row[44])) || 2026, // AS
        tiempoMin: parseFloat(cleanSheetValue(row[45])) || 0, // AT
        evidenciaAntes: cleanSheetValue(row[85]), // CH
        fechaCierre: parseFlexibleDate(row[86]), // CI
        diasCierre: parseInt(cleanSheetValue(row[87])) || 0, // CJ
        estado: cleanSheetValue(row[88]), // CK
        evidenciaDespues: cleanSheetValue(row[89]) // CL
      };
    });
};

export const submitFleetStandardAuditUpdateToSheet = async (data: any): Promise<boolean> => {
  const result = await sendToGAS({ method: 'POST_FLEET_STANDARD_AUDIT_UPDATE', data: { ...data, docId: AUDIT_QS_DOC_ID } }, GOOGLE_SCRIPT_AUDIT_URL, true);
  return result && (result as any).status === 'success';
};

const processAuditRows = (rows: any[][]): AuditRecord[] => {
  const parseScore = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const clean = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return num <= 1 ? num * 100 : num;
  };

  const parseBin = (val: any): number => {
    const n = parseInt(String(val));
    return isNaN(n) ? 0 : n;
  };

  return rows.slice(1)
    .filter(row => row && row[10]) 
    .map((row, i): AuditRecord => {
      return {
        id: cleanSheetValue(row[0]) || `audit-${i}`,
        regional: cleanSheetValue(row[6]),
        cd: cleanSheetValue(row[7]),
        auditType: cleanSheetValue(row[8]),
        auditor: cleanSheetValue(row[9]),
        plate: normalizePlate(cleanSheetValue(row[10])),
        observations: cleanSheetValue(row[35]),
        month: cleanSheetValue(row[36]),
        year: parseInt(cleanSheetValue(row[37])) || 0,
        executionTime: parseFloat(cleanSheetValue(row[38])) || 0,
        docBin: row.slice(39, 49).map(parseBin),
        signBin: row.slice(49, 60).map(parseBin),
        imgBin: row.slice(60, 63).map(parseBin),
        docNoMand: parseScore(row[63]),
        signNoMand: parseScore(row[64]),
        imgNoMand: parseScore(row[65]),
        totalNoMand: parseScore(row[66]),
        docMand: parseScore(row[67]),
        signMand: parseScore(row[68]),
        imgMand: parseScore(row[69]),
        totalMand: parseScore(row[70]),
        date: parseFlexibleDate(row[1]) || parseFlexibleDate(row[2]) || '',
        noveltyDate: parseFlexibleDate(row[72]) || '',
        status: cleanSheetValue(row[73]) || 'PENDIENTE',
        evidence: cleanSheetValue(row[74]) || '',
        noveltyObservation: cleanSheetValue(row[75]) || '',
      };
    });
};

export const submitInventoryToSheet = async (data: {
  fecha: string;
  placa: string;
  carretillas: string;
  conos: string;
  correas: string;
  fotoCarretillas?: string;
  fotoConos?: string;
  fotoCorreas?: string;
  tipo?: string;
}): Promise<boolean> => {
  const result = await sendToGAS({ 
    method: 'POST_INVENTORY', 
    data: { 
      ...data, 
      docId: INVENTORY_DOC_ID 
    } 
  }, GOOGLE_SCRIPT_WEB_APP_URL, true);
  return result && (result as any).status === 'success';
};

const INVENTORY_DOC_ID = '1VzeNkhZgVSVs6huyoB7RfNv8Gp0mY7sbKsNV52th37k';
const INVENTORY_GID = '887640384';

export const fetchInventoryFromSheet = async (): Promise<{ headers: string[], data: InventoryRecord[] }> => {
  try {
    const rows = await fetchDataFromGAS(INVENTORY_DOC_ID, 'INVENTARIO');
    if (rows && rows.length > 0) {
      return processInventoryRows(rows);
    }
  } catch (e) {
    console.warn("GAS fetch inventory failed, attempting CSV fallback");
  }
  return fetchInventoryFromSheetCSV();
};

const fetchInventoryFromSheetCSV = async (): Promise<{ headers: string[], data: InventoryRecord[] }> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${INVENTORY_DOC_ID}/export?format=csv&gid=${INVENTORY_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return { headers: [], data: [] };
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processInventoryRows(rows));
        },
        error: () => resolve({ headers: [], data: [] })
      });
    });
  } catch (e) { return { headers: [], data: [] }; }
};

const processInventoryRows = (rows: any[][]): { headers: string[], data: InventoryRecord[] } => {
  if (rows.length === 0) return { headers: [], data: [] };
  
  // Clean headers and filter out empty headers
  const rawHeaders = rows[0].map(h => cleanSheetValue(h));
  
  // Inject 'TIPO' at index 8 if missing to ensure proper mapping
  if (rawHeaders.length >= 8 && !rawHeaders.some(h => String(h).toUpperCase().trim() === 'TIPO')) {
    rawHeaders[8] = 'TIPO';
  }

  const headers = rawHeaders.filter(h => h !== '');

  const data = rows.slice(1)
    .filter(row => row && row.some(cell => cleanSheetValue(cell) !== ''))
    .map((row, i): InventoryRecord => {
      const record: InventoryRecord = { id: `inv-${i}` };
      rawHeaders.forEach((header, index) => {
        if (header) {
          record[header] = cleanSheetValue(row[index]);
        }
      });
      return record;
    });

  return { headers, data };
};



