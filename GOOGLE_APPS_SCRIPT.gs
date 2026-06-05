
// SISTEMA GESTIÓN FLOTA BQA - BACKEND UNIFICADO

// ⚠️ ASEGÚRATE DE QUE ESTE ID SEA EL DE TU HOJA DE CÁLCULO ACTUAL
var ID_HOJA = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
var ID_MAESTRO = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function log(msg) {
  try {
    var ss = SpreadsheetApp.openById(ID_HOJA);
    var s = getS(ss, "LOGS");
    s.appendRow([new Date(), msg]);
  } catch(e) {}
}

function doGet(e) {
  var m = e.parameter.method;
  var sheetName = e.parameter.sheetName;
  var docId = e.parameter.docId || ID_HOJA;
  
  if (m === 'GET_DATA') {
    try {
      var ss = SpreadsheetApp.openById(docId);
      var s = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!s) return output("error", "Hoja no encontrada");
      var values = s.getDataRange().getDisplayValues();
      return output("success", values);
    } catch(e) {
      return output("error", e.toString());
    }
  }
  return output("error", "Metodo no soportado");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // Aumentado a 20 segundos
    if (!e.postData.contents) return output("error", "No hay datos en el postBody");
    
    var req = JSON.parse(e.postData.contents);
    var d = req.data;
    var m = req.method;
    
    log("Method: " + m + " - Data: " + JSON.stringify(d).substring(0, 500));

    if (m === 'GET_DATA') {
      var docId = d.docId || ID_HOJA;
      var ss = SpreadsheetApp.openById(docId);
      var s = d.sheetName ? ss.getSheetByName(d.sheetName) : ss.getSheets()[0];
      if (!s) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Hoja no encontrada");
      }
      var values = s.getDataRange().getDisplayValues();
      if (lock.hasLock()) lock.releaseLock();
      return output("success", values);
    }

    if (m === 'POST_FINE') {
      var ssC = SpreadsheetApp.openById("1WnzEFfVMTHZVVKWGTMLU2WjY-GIzSRpWz52i_Es0E1M"); 
      var s = ssC.getSheets()[0];
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var img = sImg(d.evidenceUrl, "SOPORTE_" + placa);
      
      if (d.updateMode === true) {
        var rows = s.getDataRange().getValues();
        var nComp = (d.infractionCode || "").toString();
        var foundIdx = -1;
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][11] && rows[i][11].toString() === nComp) {
            foundIdx = i + 1;
            break;
          }
        }
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 8).setValue(img);
          lock.releaseLock();
          return output("success", "Soporte vinculado.");
        }
      }

      var dInf = new Date((d.date || today()) + "T12:00:00");
      var mes = MESES[dInf.getMonth()] || "GENERAL";
      s.appendRow([mes, today(), d.cd || "G", d.contractor || "G", d.driverName || "", d.driverId || "", d.driverPosition || "CONDUCTOR", img, d.status === 'PENDIENTE' ? 'SI' : 'NO', d.paymentAgreement || "NO", d.amount, d.infractionCode, d.date, d.description, placa]);
    }
    
    else if (m === 'POST_DOC_UPDATE') {
      var ssM = SpreadsheetApp.openById(ID_MAESTRO);
      var s = getSheetByGid(ssM, "1506825194") || ssM.getSheets()[0]; 
      var rows = s.getDataRange().getValues();
      var placaBusqueda = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if ((rows[i][2] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "") === placaBusqueda) {
          foundIdx = i + 1;
          break;
        }
      }
      if (foundIdx !== -1) {
        var imgUrl = sImg(d.url, d.type + "_" + placaBusqueda);
        var colIdx = d.type === 'SOAT' ? 21 : d.type === 'RTM' ? 22 : d.type === 'EXTINTOR' ? 24 : -1;
        var dateColIdx = d.type === 'SOAT' ? 4 : d.type === 'RTM' ? 6 : d.type === 'EXTINTOR' ? 10 : -1;
        if (colIdx !== -1) {
          s.getRange(foundIdx, colIdx).setValue(imgUrl);
          if (d.expiryDate) s.getRange(foundIdx, dateColIdx).setValue(d.expiryDate);
        }
      }
    }
    else {
      var ss = SpreadsheetApp.openById(ID_HOJA);
      
      if (m === 'POST_REPORT') {
        var s = getSheetByGid(ss, "1789987673") || getS(ss, "NOVEDADES");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var existingRow = null;
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] && rows[i][0].toString().trim() === d.id.toString().trim()) {
            foundIdx = i + 1;
            existingRow = rows[i];
            break;
          }
        }

        var imgIni = sImg(d.initialEvidence, "NOV_INI_" + d.plate);
        var imgWork = sImg(d.workshopEvidence, "NOV_TALLER_" + d.plate);
        var imgSol = sImg(d.solutionEvidence, "NOV_SOL_" + d.plate);
        var imgMapEntry = sImg(d.entryMap, "MAPA_ENTRADA_" + d.plate);
        var imgMapExit = sImg(d.exitMap, "MAPA_SALIDA_" + d.plate);

        // Si ya existe la fila, preservamos los links si los nuevos vienen vacíos
        if (existingRow) {
          if (!imgIni && existingRow[7]) imgIni = existingRow[7];
          if (!imgMapEntry && existingRow[10]) imgMapEntry = existingRow[10];
          if (!imgWork && existingRow[12]) imgWork = existingRow[12];
          if (!imgSol && existingRow[14]) imgSol = existingRow[14];
          if (!imgMapExit && existingRow[15]) imgMapExit = existingRow[15];
        }

        var rowData = [
          d.id, 
          d.date, 
          d.cd || "GENERAL",
          d.contractor || "GENERAL",
          d.plate, 
          d.source, 
          d.workshopDate || "",
          imgIni || "",
          d.novelty,
          d.daysToAttend || 0,
          imgMapEntry || "",
          d.status,
          imgWork || "",
          d.closureDate || "",
          imgSol || "",
          imgMapExit || "",
          d.daysInShop || 0,
          d.closureComments || "",
          d.workshop || ""
        ];

        if (foundIdx !== -1) s.getRange(foundIdx, 1, 1, rowData.length).setValues([rowData]);
        else s.appendRow(rowData);
      }
      else if (m === 'POST_WORKSHOP_RECORD') {
        var s = getS(ss, "TALLERES");
        var ev1Url = sImg(d.evidence1Url, "EV1_" + d.plate);
        var ev2Url = sImg(d.evidence2Url, "EV2_" + d.plate);
        
        s.appendRow([
          d.month,
          d.week,
          d.date,
          d.plate,
          d.status,
          d.novelty,
          ev1Url,
          ev2Url,
          d.workshopName,
          new Date()
        ]);
      }
      else if (m === 'POST_WORKSHOP_VISIT_UPDATE') {
        var s = getSheetByGid(ss, "239875479") || getS(ss, "VISITAS A TALLER");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        
        var searchId = (d.id || "").toString().trim();
        var searchPlate = (d.plate || "").toString().toUpperCase().trim();
        var searchProgDate = (d.progDate || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowHash = (rows[i][7] || "").toString().trim();
          var rowPlate = (rows[i][2] || "").toString().toUpperCase().trim();
          var rowDateRaw = rows[i][1];
          var rowDateStr = "";
          
          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
          }

          // Intento 1: Por Hash ID (si no es un ID generado vprog-)
          if (searchId && !searchId.startsWith("vprog-") && rowHash === searchId) {
            foundIdx = i + 1;
            break;
          }
          
          // Intento 2: Por Placa y Fecha Programada (Fallback)
          if (rowPlate === searchPlate && rowDateStr.indexOf(searchProgDate) !== -1) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          s.getRange(foundIdx, 4).setValue(d.workshop);
          s.getRange(foundIdx, 5).setValue(d.visitDate);
          s.getRange(foundIdx, 6).setValue(sImg(d.evidence, "VISITA_" + d.plate));
          s.getRange(foundIdx, 7).setValue(d.status);
          
          lock.releaseLock();
          return output("success", "Visita actualizada en fila " + foundIdx);
        } else {
          lock.releaseLock();
          return output("error", "No se encontró el registro para " + searchPlate + " en " + searchProgDate);
        }
      }
      else if (m === 'POST_PREVENTIVE_UPDATE') {
        var s = getSheetByGid(ss, "2086109634") || getS(ss, "PREVENTIVO");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        
        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][5] || "").toString().toUpperCase().trim();
          if (rowPlate === plateSearch) {
            foundIdx = i + 1;
            break;
          }
        }
        
        if (foundIdx !== -1) {
          var imgUrls = [];
          if (Array.isArray(d.evidence)) {
            for (var j = 0; j < d.evidence.length; j++) {
              var url = sImg(d.evidence[j], "PREV_" + plateSearch + "_" + (j+1));
              if (url) imgUrls.push(url);
            }
          } else if (d.evidence) {
            var singleUrl = sImg(d.evidence, "PREV_" + plateSearch);
            if (singleUrl) imgUrls.push(singleUrl);
          }
          var img = imgUrls.join(", ");
          
          s.getRange(foundIdx, 19).setValue(img); // EVIDENCIA (Columna S)
        }
      }
      else if (m === 'POST_CORRECTIVE_UPDATE') {
        var ssProg = SpreadsheetApp.openById("1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0");
        var s = ssProg.getSheetByName("PROGRAMACIÓN") || ssProg.getSheetByName("PROGRAMCION") || ssProg.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        var dateSearch = (d.date || "").toString().trim(); // YYYY-MM-DD

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][0];
          var rowDateStr = "";
          
          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ssProg.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
            // Normalizar formatos comunes DD/MM/YYYY a YYYY-MM-DD
            if (rowDateStr.indexOf('/') !== -1) {
              var p = rowDateStr.split('/');
              if (p.length === 3) {
                if (p[2].length === 4) rowDateStr = p[2] + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[0]).slice(-2);
                else if (p[0].length === 4) rowDateStr = p[0] + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[2]).slice(-2);
              }
            }
          }
          
          if (rowDateStr.indexOf(dateSearch) !== -1) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          var img1 = sImg(d.evidence1, "CORR_EV1_" + plateSearch);
          var img2 = sImg(d.evidence2, "CORR_EV2_" + plateSearch);
          var img3 = sImg(d.evidence3, "CORR_EV3_" + plateSearch);
          
          if (img1) s.getRange(foundIdx, 10).setValue(img1); // EVIDDENCIA 1 (Indice 9 -> Columna 10)
          if (img2) s.getRange(foundIdx, 11).setValue(img2); // EVIDENCIA 2 (Indice 10 -> Columna 11)
          if (img3) s.getRange(foundIdx, 12).setValue(img3); // ENVIDENCIA (Indice 11 -> Columna 12)
          if (d.evidence4) {
            var img4 = sImg(d.evidence4, "CORR_EV4_" + plateSearch);
            if (img4) s.getRange(foundIdx, 13).setValue(img4); // EVIDENCIA 4 (Indice 12 -> Columna 13)
          }
          
          lock.releaseLock();
          return output("success", "Evidencias registradas en fila " + foundIdx);
        } else {
          lock.releaseLock();
          return output("error", "No se encontró la programación para " + plateSearch + " en " + dateSearch);
        }
      }
      else if (m === 'POST_MILEAGE') {
        var s = getSheetByGid(ss, "1929496440") || getS(ss, "KILOMETRAJE");
        s.appendRow([d.cd, d.contractor, d.week, d.date, d.plate, d.mileage]);
      }
      else if (m === 'POST_CLEANING') {
        var s = getSheetByGid(ss, "1853969081") || getS(ss, "CRONOGRAMA 5S");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        
        // d.date viene como YYYY-MM-DD
        var dateParts = d.date.split("-");
        var searchYear = parseInt(dateParts[0]);
        var searchMonth = parseInt(dateParts[1]);
        var searchDay = parseInt(dateParts[2]);
        
        log("Buscando limpieza: " + plateSearch + " para fecha " + d.date);
        
        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][0];
          var matchDate = false;
          
          if (rowDateRaw instanceof Date) {
            // Comparación por componentes para evitar errores de zona horaria
            if (rowDateRaw.getFullYear() === searchYear && 
                (rowDateRaw.getMonth() + 1) === searchMonth && 
                rowDateRaw.getDate() === searchDay) {
              matchDate = true;
            }
          } else {
            var rowDateStr = rowDateRaw.toString();
            if (rowDateStr.indexOf(d.date) !== -1) {
              matchDate = true;
            }
          }
          
          if (matchDate) {
            foundIdx = i + 1;
            break;
          }
        }
        
        var imgIni = sImg(d.initialEvidence, "LIMPIEZA_INI_" + d.plate);
        var imgFin = sImg(d.finalEvidence, "LIMPIEZA_FIN_" + d.plate);
        var finalStatus = (imgIni && imgFin && imgIni.startsWith("http") && imgFin.startsWith("http")) ? "COMPLETADO" : "PENDIENTE";
        
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 5).setValue(finalStatus); 
          s.getRange(foundIdx, 6).setValue(imgIni);      
          s.getRange(foundIdx, 7).setValue(imgFin);      
          log("Fila encontrada y actualizada: " + foundIdx);
        } else {
          var rowData = [d.date, d.month || "", d.week, d.plate, finalStatus, imgIni, imgFin];
          s.appendRow(rowData);
          log("No se encontró fila pre-existente. Se creó una nueva al final.");
        }
      }
      else if (m === 'POST_WASH') {
        var s = getS(ss, "LAVADOS");
        s.appendRow([d.id, d.month, d.week, d.date, d.plate, sImg(d.evidenceUrl, "LAVADO_" + d.plate), sImg(d.mapUrl, "MAPA_LAVADO_" + d.plate), d.workshop]);
      }
      else if (m === 'POST_CALIBRATION_UPDATE') {
        var s = getSheetByGid(ss, "505557891") || getS(ss, "CALIBRACIONES");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.originalPlate || d.plate || "").toString().toUpperCase().trim();
        var dateSearch = (d.originalDate || d.calibrationDate || "").toString().trim();
        
        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][1];
          var matchDate = false;
          
          if (rowDateRaw instanceof Date) {
            var searchParts = dateSearch.split("-");
            if (rowDateRaw.getFullYear() === parseInt(searchParts[0]) && 
                (rowDateRaw.getMonth() + 1) === parseInt(searchParts[1]) && 
                rowDateRaw.getDate() === parseInt(searchParts[2])) {
              matchDate = true;
            }
          } else {
            if (rowDateRaw.toString().indexOf(dateSearch) !== -1) matchDate = true;
          }
          
          if (matchDate) {
            foundIdx = i + 1;
            break;
          }
        }
        
        var img = sImg(d.certificateUrl, "CALIB_" + d.plate);
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 5).setValue(d.taller); // TALLER INDICE 4 (Columna 5)
          s.getRange(foundIdx, 6).setValue(img);      // FOTO INDICE 5 (Columna 6)
          s.getRange(foundIdx, 7).setValue("COMPLETADO"); // ESTADO INDICE 6 (Columna 7)
          
          // Actualizar metadatos si cambiaron
          s.getRange(foundIdx, 1).setValue(d.month);
          s.getRange(foundIdx, 2).setValue(d.calibrationDate);
          s.getRange(foundIdx, 3).setValue(d.week);
          s.getRange(foundIdx, 4).setValue(d.plate);
        } else {
          s.appendRow([d.month, d.calibrationDate, d.week, d.plate, d.taller, img, "COMPLETADO"]);
        }
      }
      else if (m === 'POST_CALIBRATION') {
        var s = getSheetByGid(ss, "505557891") || getS(ss, "CALIBRACIONES");
        s.appendRow([d.month, d.calibrationDate, d.week, d.plate, d.taller || d.equipment, sImg(d.certificateUrl, "CALIB_" + d.plate), "COMPLETADO"]);
      }
      else if (m === 'POST_UNAVAILABILITY_BATCH') {
        var ssUnav = SpreadsheetApp.openById("1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0");
        var s = ssUnav.getSheetByName("INDISPONIBILIDAD");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja INDISPONIBILIDAD no encontrada");
        }
        if (d && d.length > 0) {
          s.getRange(s.getLastRow() + 1, 1, d.length, d[0].length).setValues(d);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Lote de indisponibilidad procesado.");
      }
      else if (m === 'POST_AUDIT_UPDATE') {
        var docId = d.docId || '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs';
        var auditSS = SpreadsheetApp.openById(docId);
        var s = getS(auditSS, "ESTANDAR");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var idSearch = (d.id || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          if ((rows[i][0] || "").toString().trim() === idSearch) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          // Columnas Novedad Auditoría:
          // Col 73 (BU): Fecha Novedad
          // Col 74 (BV): Estado (REALIZADO/PENDIENTE)
          // Col 75 (BW): Evidencia (Link)
          // Col 76 (BX): Observación Novedad

          if (d.status) s.getRange(foundIdx, 74).setValue(d.status); 
          if (d.noveltyObservation) s.getRange(foundIdx, 76).setValue(d.noveltyObservation);
          if (d.noveltyDate) s.getRange(foundIdx, 73).setValue(d.noveltyDate);
          
          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for(var j=0; j<d.evidence.length; j++) {
                if (d.evidence[j] && (d.evidence[j].indexOf("data:image") === 0 || d.evidence[j].indexOf("http") !== 0)) {
                  links.push(sImg(d.evidence[j], "EVI_" + idSearch + "_" + j));
                } else if (d.evidence[j]) {
                  links.push(d.evidence[j]);
                }
              }
              evidenceUrl = links.join(", ");
            } else if (typeof d.evidence === 'string' && d.evidence.indexOf("data:image") === 0) {
              evidenceUrl = sImg(d.evidence, "EVI_" + idSearch);
            } else {
              evidenceUrl = d.evidence;
            }
            s.getRange(foundIdx, 75).setValue(evidenceUrl); // SIEMPRE EN BW (75)
          }
          
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Audit record updated in column BW for row " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Auditoria no encontrada con ID: " + idSearch);
      }
      else if (m === 'POST_CONTROL_TOWER_UPDATE') {
        var s = getS(ss, "CIERRE DE NOVEDADES");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        var noveltySearch = (d.novelty || "").toString().trim();
        var dateSearch = (d.reportDate || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][5] || "").toString().toUpperCase().trim();
          var rowNovelty = (rows[i][7] || "").toString().trim();
          var rowDateRaw = rows[i][2];
          var rowDateStr = "";
          
          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
          }

          if (rowPlate === plateSearch && rowNovelty === noveltySearch && rowDateStr.indexOf(dateSearch) !== -1) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          if (d.evidenceBefore) {
            var imgBefore = sImg(d.evidenceBefore, "CT_BEFORE_" + plateSearch);
            s.getRange(foundIdx, 20).setValue(imgBefore); // Col T (20)
          }
          if (d.evidenceAfter) {
            var imgAfter = sImg(d.evidenceAfter, "CT_AFTER_" + plateSearch);
            s.getRange(foundIdx, 21).setValue(imgAfter); // Col U (21)
          }
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Evidencias actualizadas en fila " + foundIdx);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró el registro para " + plateSearch + " (" + dateSearch + ")");
        }
      }
      else if (m === 'POST_FLEET_STANDARD_AUDIT_UPDATE') {
        var docId = d.docId || '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs';
        var ssA = SpreadsheetApp.openById(docId);
        // Prioritize "ESTRANDAR" as the user explicitly mentioned it, then fallback to "ESTANDAR" or first sheet.
        var s = ssA.getSheetByName("ESTRANDAR") || ssA.getSheetByName("ESTANDAR") || ssA.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var idVal = (d.id || "").toString().trim().toUpperCase();
        var plateVal = (d.placa || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim().toUpperCase();
          var rowPlate = (rows[i][8] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, ""); // Col I
          
          if (idVal && !idVal.startsWith("STD-AUDIT-") && rowId === idVal) {
            foundIdx = i + 1;
            break;
          }
          if (plateVal && rowPlate === plateVal) {
             foundIdx = i + 1;
             // Check status (Col CK - index 88)
             var rowStatus = (rows[i][88] || "").toString().trim().toUpperCase();
             if (rowStatus === "PENDIENTE" || rowStatus === "ABIERTO" || rowStatus === "") {
               // If it's pending, this is definitely the one we want to close
               break; 
             }
             // If not pending, keep searching for a pending one, but remember this index as fallback
          }
        }

        if (foundIdx !== -1) {
          if (d.evidenciaAntes) s.getRange(foundIdx, 86).setValue(d.evidenciaAntes);
          if (d.fechaCierre) s.getRange(foundIdx, 87).setValue(d.fechaCierre);
          if (d.estado) s.getRange(foundIdx, 89).setValue(d.estado);
          if (d.evidenciaDespues) s.getRange(foundIdx, 90).setValue(d.evidenciaDespues);
          
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Auditoria actualizada en fila " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró auditoria " + idSearch);
      }
      else if (m === 'UPLOAD_IMAGE') {
        var url = sImg(d.base64, d.name);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", url);
      }
      else if (m === 'POST_INVENTORY') {
        var docId = d.docId || '1VzeNkhZgVSVs6huyoB7RfNv8Gp0mY7sbKsNV52th37k';
        var ssI = SpreadsheetApp.openById(docId);
        var s = ssI.getSheetByName('INVENTARIO') || ssI.getSheets()[0];
        
        var imgCarries = sImg(d.fotoCarretillas, "INV_CARRETILLAS_" + d.placa);
        var imgCones = sImg(d.fotoConos, "INV_CONOS_" + d.placa);
        var imgBelts = sImg(d.fotoCorreas, "INV_CORREAS_" + d.placa);
        
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.placa || "").toString().toUpperCase().trim();
        var dateSearchNorm = normalizeDateToCompare(d.fecha);
        
        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][1] || "").toString().toUpperCase().trim(); // Columna PLACA (B)
          if (rowPlate === plateSearch) {
            var rowDateNorm = normalizeDateToCompare(rows[i][0]); // Columna FECHA (A)
            if (rowDateNorm && dateSearchNorm && rowDateNorm === dateSearchNorm) {
              foundIdx = i + 1;
              break;
            }
          }
        }
        
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 1).setValue(d.fecha);
          s.getRange(foundIdx, 3).setValue(d.carretillas);
          s.getRange(foundIdx, 4).setValue(d.conos);
          s.getRange(foundIdx, 5).setValue(d.correas);
          s.getRange(foundIdx, 6).setValue(imgCarries || "");
          s.getRange(foundIdx, 7).setValue(imgCones || "");
          s.getRange(foundIdx, 8).setValue(imgBelts || "");
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Inventario actualizado para la placa " + plateSearch);
        } else {
          s.appendRow([
            d.fecha,
            d.placa,
            d.carretillas,
            d.conos,
            d.correas,
            imgCarries || "",
            imgCones || "",
            imgBelts || ""
          ]);
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Nuevo inventario registrado para la placa " + plateSearch);
        }
      }
    }

    lock.releaseLock();
    return output("success", "Datos procesados.");
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", e.toString());
  }
}

function normalizeDateToCompare(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var yyyy = val.getFullYear();
    var mm = ("0" + (val.getMonth() + 1)).slice(-2);
    var dd = ("0" + val.getDate()).slice(-2);
    return yyyy + "-" + mm + "-" + dd;
  }
  
  var clean = val.toString().trim();
  // Try dd/mm/yyyy or dd/mm/yy
  var slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    var day = ("0" + slashMatch[1]).slice(-2);
    var month = ("0" + slashMatch[2]).slice(-2);
    var year = slashMatch[3];
    if (year.length === 2) {
      year = "20" + year;
    }
    return year + "-" + month + "-" + day;
  }
  
  // Try yyyy-mm-dd
  var dashMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    var year = dashMatch[1];
    var month = ("0" + dashMatch[2]).slice(-2);
    var day = ("0" + dashMatch[3]).slice(-2);
    return year + "-" + month + "-" + day;
  }
  
  var d = new Date(clean);
  if (!isNaN(d.getTime())) {
    var yyyy = d.getFullYear();
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var dd = ("0" + d.getDate()).slice(-2);
    return yyyy + "-" + mm + "-" + dd;
  }
  
  return clean;
}

function getSheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === gid.toString()) {
      return sheets[i];
    }
  }
  return null;
}

function sImg(base64, name) {
  if (!base64 || base64.length < 100 || base64.startsWith("http")) return base64;
  try {
    var folderName = "BQA_COMPROBANTES_FLOTA";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var mimeType = base64.substring(5, base64.indexOf(';'));
    var bytes = Utilities.base64Decode(base64.split(',')[1]);
    var blob = Utilities.newBlob(bytes, mimeType, name + "_" + Date.now() + (mimeType === 'application/pdf' ? '.pdf' : '.jpg'));
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error Archivo"; }
}

function getS(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function today() { return Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"); }

function output(status, message) {
  return ContentService.createTextOutput(JSON.stringify({status: status, message: message})).setMimeType(ContentService.MimeType.JSON);
}
