// assets/app.js
const el = (id) => document.getElementById(id);
const state = {
  data: null,
  doluPage: 1,
  negPage: 1,
};

function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleString('tr-TR', { hour12: false });
}

function maskPhone(str) {
  if (!str) return "";
  const s = String(str).replace(/\D/g, "");
  if (s.length < 7) return str;
  return s.slice(0,3) + " *** ** " + s.slice(-2);
}

function renderKpis() {
  const { totals, updatedAt } = state.data;
  el('kpi-current').classList.remove('skeleton');
  el('kpi-target').classList.remove('skeleton');
  el('updatedAt').classList.remove('skeleton');

  el('kpi-current').textContent = totals.current ?? 0;
  el('kpi-target').textContent = totals.target ?? "-";
  const gap = (totals.target ?? 0) - (totals.current ?? 0);
  el('kpi-gap').textContent = isFinite(gap) ? `Hedefe kalan: ${gap > 0 ? gap : 0}` : "";
  el('updatedAt').textContent = fmtDate(updatedAt);
}

function renderDepartments() {
  const tbody = el('departmentsBody');
  tbody.innerHTML = "";
  const arr = state.data.departments || [];
  let total = 0;
  arr.sort((a,b) => b.count - a.count);
  arr.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="td">${row.name || '-'}</td>
                    <td class="td font-semibold">${row.count ?? 0}</td>`;
    total += row.count ?? 0;
    tbody.appendChild(tr);
  });
  el('dept-total').textContent = `Toplam: ${total}`;
}

function paginate(list, page) {
  const start = (page - 1) * PAGE_SIZE;
  return list.slice(start, start + PAGE_SIZE);
}

function renderDolu() {
  const body = el('doluBody');
  body.innerHTML = "";
  const list = state.data.doluListe || [];
  el('doluCount').textContent = `${list.length} kayıt`;

  const pageItems = paginate(list, state.doluPage);
  pageItems.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="td">${it.adSoyad || '-'}</td>
                    <td class="td">${it.universite || '-'}</td>
                    <td class="td">${it.bolum || '-'}</td>
                    <td class="td">${it.sinif || '-'}</td>
                    <td class="td">${it.telefon ? maskPhone(it.telefon) : (it.iletisim || '-')}</td>`;
    body.appendChild(tr);
  });

  el('doluPage').textContent = `Sayfa ${state.doluPage}`;
}

function renderNeg() {
  const body = el('negBody');
  body.innerHTML = "";
  const list = state.data.olumsuzListe || [];
  el('negCount').textContent = `${list.length} kayıt`;

  const pageItems = paginate(list, state.negPage);
  pageItems.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="td">${it.adSoyad || '-'}</td>
                    <td class="td">${it.universite || '-'}</td>
                    <td class="td">${it.bolum || '-'}</td>
                    <td class="td">${it.sinif || '-'}</td>
                    <td class="td">${it.not || '-'}</td>`;
    body.appendChild(tr);
  });

  el('negPage').textContent = `Sayfa ${state.negPage}`;
}

async function fetchData() {
  const url = API_URL + (API_URL.includes('?') ? '&' : '?') + '_ts=' + Date.now();
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error('API hatası: ' + resp.status);
  return await resp.json();
}

async function refresh() {
  try {
    const data = await fetchData();
    state.data = data;
    renderKpis();
    renderDepartments();
    renderDolu();
    renderNeg();
  } catch (e) {
    console.error(e);
    alert('Veriler alınamadı. Lütfen API_URL ayarını ve Apps Script yayını kontrol edin.');
  }
}

function initPaging() {
  el('doluPrev').onclick = () => { if (state.doluPage > 1) { state.doluPage--; renderDolu(); } };
  el('doluNext').onclick = () => {
    const maxPage = Math.ceil((state.data?.doluListe?.length || 0) / PAGE_SIZE);
    if (state.doluPage < maxPage) { state.doluPage++; renderDolu(); }
  };
  el('negPrev').onclick = () => { if (state.negPage > 1) { state.negPage--; renderNeg(); } };
  el('negNext').onclick = () => {
    const maxPage = Math.ceil((state.data?.olumsuzListe?.length || 0) / PAGE_SIZE);
    if (state.negPage < maxPage) { state.negPage++; renderNeg(); }
  };
}

function init() {
  el('yil').textContent = new Date().getFullYear();
  el('refreshBtn').onclick = refresh;
  initPaging();
  refresh();

  let timer = null;
  const box = el('autorefresh');
  box.addEventListener('change', () => {
    if (box.checked) {
      timer = setInterval(refresh, AUTO_REFRESH_SEC * 1000);
    } else if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
