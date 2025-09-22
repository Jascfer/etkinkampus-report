// Code.gs (Google Apps Script) — EtkinKampüs
/**
 * EtkinKampüs Temsilci Raporu JSON API
 *  - DOLU LİSTE: aktif/dolu temsilciler
 *  - OLUMSUZ LİSTE: olumsuz/elenenler
 *  - Temsilci Skalası: bölümlere göre sayılar (+opsiyonel hedef)
 *
 * Beklenen şema (esnek eşleşme yapar):
 *  Temsilci Skalası sayfası:
 *    Bölüm | Sayı | Hedef (opsiyonel)
 *  DOLU LİSTE ve OLUMSUZ LİSTE sayfaları:
 *    Ad Soyad | Üniversite | Bölüm/Departman | Sınıf | Telefon/İletişim | Not
 */

const SHEET_ID = "1dBM9rPc7ivIGyqMZtLRBMP5U3a2EiaqvEi54hRajjWc";
const SHEETS = {
  DOLU: "DOLU LİSTE",
  NEG: "OLUMSUZ LİSTE",
  SKALA: "Temsilci Skalası",
};

function doGet(e) {
  try {
    const skala = readSkala(SHEETS.SKALA);     // departments + target?
    const dolu = readSheetObjects(SHEETS.DOLU);
    const neg  = readSheetObjects(SHEETS.NEG);

    const totals = computeTotals(skala, dolu);

    const payload = {
      updatedAt: new Date(),
      totals: totals,
      departments: skala.departments,  // name/count
      doluListe: dolu,
      olumsuzListe: neg,
    };

    return jsonResponse(payload);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function doOptions(e) {
  return jsonResponse({}, 204);
}

/** Temsilci Skalası: Bölümler ve sayılar (+opsiyonel hedef) */
function readSkala(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) return { departments: [], target: null };

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { departments: [], target: null };

  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1).filter(r => r.some(c => String(c).trim() !== ""));

  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "");
  const findIdx = (cands) => {
    const want = cands.map(norm);
    for (let i=0;i<headers.length;i++) {
      if (want.includes(norm(headers[i]))) return i;
    }
    return -1;
  };

  const iDept   = findIdx(["Bölüm","Bolum","Departman","Birim"]);
  const iCount  = findIdx(["Sayı","Sayi","Adet","Count","Toplam"]);
  const iTarget = findIdx(["Hedef","Target"]);

  const departments = [];
  let target = null;

  rows.forEach(r => {
    const name = iDept >=0 ? r[iDept] : "";
    const cnt  = iCount>=0 ? Number(r[iCount]) : NaN;
    const maybeTarget = iTarget>=0 ? Number(r[iTarget]) : NaN;

    if (String(name).trim() !== "" && isFinite(cnt)) {
      departments.push({ name: String(name), count: Number(cnt) });
    }
    if (isFinite(maybeTarget)) {
      // satır bazlı hedef varsa, en yüksek değeri al
      target = target === null ? maybeTarget : Math.max(target, maybeTarget);
    }
  });

  departments.sort((a,b) => b.count - a.count);
  return { departments, target };
}

/** DOLU / OLUMSUZ sayfaları — esnek kolon eşleşmesi */
function readSheetObjects(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) return [];

  const range = sh.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1).filter(r => r.some(c => String(c).trim() !== ""));

  const idx = (labelList) => {
    const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
    for (let i=0; i<labelList.length; i++) {
      const want = norm(labelList[i]);
      const j = headers.findIndex(h => norm(h) === want);
      if (j !== -1) return j;
    }
    return -1;
  };

  const iName = idx(["Ad Soyad","AdSoyad","İsim Soyisim","İsim","Ad"]);
  const iUni  = idx(["Üniversite","Universite","Okul"]);
  const iDept = idx(["Bölüm","Bolum","Departman","Birim"]);
  const iClass= idx(["Sınıf","Sinif","Class"]);
  const iTel  = idx(["Telefon","Iletisim","İletişim","GSM","Telefon Numarası"]);
  const iNote = idx(["Not","Açıklama","Aciklama","Durum"]);

  const objRows = rows.map(r => ({
    adSoyad: iName >=0 ? r[iName] : "",
    universite: iUni >=0 ? r[iUni] : "",
    bolum: iDept >=0 ? r[iDept] : "",
    sinif: iClass >=0 ? r[iClass] : "",
    telefon: iTel >=0 ? r[iTel] : "",
    not: iNote >=0 ? r[iNote] : "",
  }));

  return objRows;
}

function computeTotals(skala, doluList) {
  const currentFromDolu = Array.isArray(doluList) ? doluList.length : 0;
  const currentFromSkala = (skala.departments || []).reduce((a,b) => a + (Number(b.count)||0), 0);
  const current = currentFromDolu || currentFromSkala;

  const target = isFinite(skala.target) ? Number(skala.target) : null;

  return { current, target };
}

function jsonResponse(obj, status) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
