let state = loadState();
let currentRole = 'HR';
let currentView = 'dashboard';

const roles = {
  HR: ['read','write','sign','export','import'],
  VUR: ['read','vur'],
  AUDITOR: ['read','audit'],
  ADMIN: ['read','write','sign','export','import','audit','vur','reset']
};

function hasPerm(action){
  const allowed = roles[currentRole] || [];
  return allowed.includes(action) || allowed.includes('write') && action==='read';
}

function deny(action){
  toast('Недостаточно прав');
  audit('deny','system','-',action,'Недостаточно прав');
}

function audit(action, entity, entityId, fields, note){
  state.audit.unshift({ id:`a-${Date.now()}`, at:new Date().toISOString(), actor:'user', role:currentRole, action, entity, entityId, fields, note });
  state.audit = state.audit.slice(0,200);
  saveState(state);
  renderAudit();
}

function initNav(){
  const nav = document.getElementById('sidebar');
  const items = [
    {id:'dashboard', label:'Панель', count:''},
    {id:'positions', label:'Штатка', count:state.positions.length},
    {id:'employees', label:'Сотрудники', count:state.employees.length},
    {id:'orders', label:'Приказы', count:state.orders.length},
    {id:'timesheet', label:'Табель', count:Object.keys(state.timesheets).length},
    {id:'fszn', label:'ФСЗН (ПУ-2)', count:''},
    {id:'vur', label:'Воинский учет', count:state.employees.filter(e=>e.vur).length},
    {id:'consents', label:'Согласия', count:state.consents.length},
    {id:'audit', label:'Аудит', count:state.audit.length},
    {id:'settings', label:'Настройки', count:''},
  ];
  nav.innerHTML = items.map(i=>`<div class="nav-item ${currentView===i.id?'active':''}" data-id="${i.id}"><span>${i.label}</span><span class="badge">${i.count}</span></div>`).join('');
  nav.querySelectorAll('.nav-item').forEach(i=> i.addEventListener('click', ()=> setView(i.dataset.id)) );
}

function setView(id){
  currentView = id;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(`view-${id}`).classList.add('active');
  initNav();
  if (id==='dashboard') renderDashboard();
  if (id==='positions') renderPositions();
  if (id==='employees') renderEmployees();
  if (id==='orders') renderOrders();
  if (id==='timesheet') renderTimesheet();
  if (id==='fszn') renderFszn();
  if (id==='vur') renderVur();
  if (id==='consents') renderConsents();
  if (id==='audit') renderAudit();
  if (id==='settings') renderSettings();
}

function renderShell(){
  const main = document.getElementById('main');
  main.innerHTML = `
    <section id="view-dashboard" class="view active"></section>
    <section id="view-positions" class="view"></section>
    <section id="view-employees" class="view"></section>
    <section id="view-orders" class="view"></section>
    <section id="view-timesheet" class="view"></section>
    <section id="view-fszn" class="view"></section>
    <section id="view-vur" class="view"></section>
    <section id="view-consents" class="view"></section>
    <section id="view-audit" class="view"></section>
    <section id="view-settings" class="view"></section>
  `;
}

function renderDashboard(){
  const v = document.getElementById('view-dashboard');
  const active = state.employees.filter(e=>e.status==='work').length;
  const contractsDue = state.employees.filter(e=>e.contract?.end && daysUntil(e.contract.end)<=state.config.contractNoticeDays).length;
  const vacancies = state.positions.reduce((sum,p)=>sum+Math.max(0,p.fte-p.occupiedFte),0);
  const alerts = [];
  if (contractsDue) alerts.push(`Контракты истекают у ${contractsDue} сотрудников`);
  const drafts = state.orders.filter(o=>o.status==='draft').length;
  if (drafts) alerts.push(`Черновики приказов: ${drafts}`);
  const candNoConsent = state.employees.filter(e=>e.status==='candidate' && !e.consentId).length;
  if (candNoConsent) alerts.push(`Кандидаты без согласия: ${candNoConsent}`);
  v.innerHTML = `
    <div class="section-title"><h2>Дашборд</h2></div>
    <div class="kpi-grid">
      <div class="kpi">Работает / всего: <strong>${active}/${state.employees.length}</strong></div>
      <div class="kpi">Позиции: <strong>${state.positions.length}</strong></div>
      <div class="kpi">Вакансии FTE: <strong>${vacancies.toFixed(1)}</strong></div>
      <div class="kpi">Контракты ≤ ${state.config.contractNoticeDays} дн: <strong>${contractsDue}</strong></div>
    </div>
    <div class="card"><strong>Контрольные события</strong><ul class="alert-list">${alerts.map(a=>`<li>${a}</li>`).join('')||'<li>Нет событий</li>'}</ul></div>
    <div class="card"><strong>Последние аудиты</strong><div class="table-wrap">${auditTable(state.audit.slice(0,10))}</div></div>
  `;
}

function auditTable(items){
  return `<table class="table"><thead><tr><th>Время</th><th>Кто</th><th>Роль</th><th>Действие</th><th>Сущность</th><th>ID</th><th>Поля</th><th>Коммент</th></tr></thead><tbody>${items.map(a=>`<tr><td>${a.at}</td><td>${a.actor}</td><td>${a.role}</td><td>${a.action}</td><td>${a.entity}</td><td>${a.entityId}</td><td>${a.fields}</td><td>${a.note||''}</td></tr>`).join('')}</tbody></table>`;
}

function renderPositions(){
  const v = document.getElementById('view-positions');
  v.innerHTML = '<div class="section-title"><h2>Штатное расписание</h2><input id="pos-search" class="input" placeholder="Поиск"></div><div id="pos-grid"></div><div id="pos-card" class="card"></div>';
  const grid = new DataGrid({
    columns:[
      {title:'Подразделение', field:'unitName'},
      {title:'Код', field:'code', mono:true},
      {title:'Должность', field:'title'},
      {title:'FTE', field:'fte'},
      {title:'Занято', field:'occupiedFte'},
      {title:'Вакансия', field:'vacancy'},
      {title:'Оклад', field:'wageRate', mono:true},
    ],
    rows: state.positions.map(p=>({...p, unitName:findUnit(p.unit), vacancy:(p.fte-p.occupiedFte).toFixed(1)})),
    onSelect: r=> showPositionCard(r),
    onOpen: r=> editPosition(r.id)
  });
  document.getElementById('pos-grid').appendChild(grid.render());
  document.getElementById('pos-search').addEventListener('input', e=> grid.setFilter(e.target.value));
}

function showPositionCard(pos){
  const wrap = document.getElementById('pos-card');
  wrap.innerHTML = `<div class="section-title"><strong>${pos.title}</strong><div><button class="btn" onclick="editPosition('${pos.id}')">Редактировать</button></div></div>
    <p>Подразделение: ${findUnit(pos.unit)} | Код: ${pos.code}</p>
    <p>FTE: ${pos.fte} Занято: ${pos.occupiedFte} Вакансия: ${(pos.fte-pos.occupiedFte).toFixed(1)}</p>
    <p>Оклад: ${pos.wageRate}</p>`;
  audit('read','position',pos.id,'','card');
}

function editPosition(id){
  if (!hasPerm('write')) return deny('write');
  const pos = state.positions.find(p=>p.id===id) || { id:`pos-${Date.now()}`, unit:state.orgUnits[0].id, code:'', title:'', fte:1, occupiedFte:0, wageRate:0 };
  const close = modal({
    title: pos.id.startsWith('pos-')? 'Позиция' : 'Новая позиция',
    body: `
      <label>Подразделение<select id="m-unit">${state.orgUnits.map(u=>`<option value="${u.id}" ${u.id===pos.unit?'selected':''}>${u.name}</option>`).join('')}</select></label>
      <label>Код должности<select id="m-code">${state.eksd_etks.map(c=>`<option value="${c.code}" ${c.code===pos.code?'selected':''}>${c.code} ${c.name}</option>`).join('')}</select></label>
      <label>Название<input id="m-title" class="input" value="${pos.title}" readonly></label>
      <label>FTE<input id="m-fte" type="number" step="0.1" class="input" value="${pos.fte}"></label>
      <label>Оклад<input id="m-wage" type="number" class="input" value="${pos.wageRate}"></label>
    `,
    actions:[
      {label:'Сохранить', onClick:()=>{
        pos.unit = document.getElementById('m-unit').value;
        pos.code = document.getElementById('m-code').value;
        pos.title = state.eksd_etks.find(c=>c.code===pos.code)?.name || pos.title;
        pos.fte = Number(document.getElementById('m-fte').value)||1;
        pos.wageRate = Number(document.getElementById('m-wage').value)||0;
        if (!state.positions.find(p=>p.id===pos.id)) state.positions.push(pos);
        saveState(state); audit('update','position',pos.id,'fte,code','edit'); renderPositions();
      }}
    ]
  });
}

function renderEmployees(){
  const v = document.getElementById('view-employees');
  v.innerHTML = '<div class="section-title"><h2>Сотрудники</h2><input id="emp-search" class="input" placeholder="Поиск"></div><div id="emp-grid"></div><div id="emp-card" class="card"></div>';
  const globalTerm = (document.getElementById('global-search')?.value||'').toLowerCase();
  const rows = state.employees
    .filter(e=> !globalTerm || Object.values(e).some(v=> String(v).toLowerCase().includes(globalTerm)))
    .map(e=>({
    ...e,
    position: findPosition(e.positionId)?.title||'',
    unit: findUnit(findPosition(e.positionId)?.unit),
    contractEnd: e.contract?.end||'',
    consent: e.consentId? 'есть' : 'нет'
  }));
  const grid = new DataGrid({
    columns:[
      {title:'Таб№', field:'tabNo', mono:true},
      {title:'ФИО', field:'name'},
      {title:'Личный№', field:'personalNo', mono:true},
      {title:'Должность', field:'position'},
      {title:'Подразделение', field:'unit'},
      {title:'Статус', field:'status', render:(v)=> badge(v, v==='work'?'work':v==='candidate'?'cand':'fire')},
      {title:'Контракт до', field:'contractEnd'},
      {title:'Согласие', field:'consent'},
    ],
    rows,
    onSelect:r=>showEmployeeCard(r.id),
    onOpen:r=>editEmployee(r.id)
  });
  document.getElementById('emp-grid').appendChild(grid.render());
  document.getElementById('emp-search').addEventListener('input', e=> grid.setFilter(e.target.value));
}

function showEmployeeCard(id){
  const e = state.employees.find(x=>x.id===id);
  if (!e) return;
  const pos = findPosition(e.positionId);
  const wrap = document.getElementById('emp-card');
  const daysLeft = e.contract?.end ? daysUntil(e.contract.end) : '';
  wrap.innerHTML = `<div class="section-title"><strong>${e.name}</strong><div><button class="btn" onclick="editEmployee('${e.id}')">Редактировать</button></div></div>
    <p>Должность: ${pos?.title||'—'} (${findUnit(pos?.unit)})</p>
    <p>Контракт: ${e.contract?.start||'—'} → ${e.contract?.end||'—'} ${daysLeft!==''? badge(`≤${daysLeft} дн`, daysLeft<state.config.contractNoticeDays?'draft':''):''}</p>
    <p>ВУР: ${e.vur?'да':'нет'} | Согласие: ${e.consentId||'нет'}</p>`;
  audit('read','employee',id,'','card');
}

function editEmployee(id){
  if (!hasPerm('write')) return deny('write');
  const emp = structuredClone(state.employees.find(e=>e.id===id) || { id:`emp-${Date.now()}`, tabNo:'', personalNo:'', name:'', positionId:'', status:'candidate', contract:{type:'контракт', start:'', end:'', extensions:0}, consentId:'', vur:false });
  const close = modal({
    title:'Сотрудник',
    body:`
      <label>ФИО<input id="e-name" class="input" value="${emp.name}"></label>
      <label>Таб№<input id="e-tab" class="input" value="${emp.tabNo}"></label>
      <label>Личный№<input id="e-pers" class="input" value="${emp.personalNo}"></label>
      <label>Статус<select id="e-status"><option value="candidate" ${emp.status==='candidate'?'selected':''}>кандидат</option><option value="work" ${emp.status==='work'?'selected':''}>работает</option><option value="fired" ${emp.status==='fired'?'selected':''}>уволен</option></select></label>
      <label>Позиция<select id="e-pos"><option value="">—</option>${state.positions.map(p=>`<option value="${p.id}" ${p.id===emp.positionId?'selected':''}>${p.title} (${findUnit(p.unit)})</option>`).join('')}</select></label>
      <label>Контракт старт<input id="e-cs" type="date" value="${emp.contract.start}"></label>
      <label>Контракт конец<input id="e-ce" type="date" value="${emp.contract.end}"></label>
      <label>Согласие<select id="e-consent"><option value="">—</option>${state.consents.map(c=>`<option value="${c.id}" ${c.id===emp.consentId?'selected':''}>${c.id} ${c.status}</option>`).join('')}</select></label>
      <label><input type="checkbox" id="e-vur" ${emp.vur?'checked':''}> Воинский учет</label>
    `,
    actions:[{label:'Сохранить (Ctrl+S)', onClick:()=>{
      emp.name = document.getElementById('e-name').value.trim();
      emp.tabNo = document.getElementById('e-tab').value.trim();
      emp.personalNo = document.getElementById('e-pers').value.trim();
      emp.status = document.getElementById('e-status').value;
      emp.positionId = document.getElementById('e-pos').value;
      emp.consentId = document.getElementById('e-consent').value;
      emp.contract.start = document.getElementById('e-cs').value;
      emp.contract.end = document.getElementById('e-ce').value;
      emp.vur = document.getElementById('e-vur').checked;
      const issues = validateEmployee(emp, state, state.config);
      if (issues.some(i=>i.level==='crit')) { toast(issues.map(i=>i.message).join('\n'), 'error'); return; }
      const existing = state.employees.find(e=>e.id===emp.id);
      if (!existing) { state.employees.push(emp); adjustFte(emp.positionId,1); audit('create','employee',emp.id,'',''); }
      else {
        if (existing.positionId !== emp.positionId && emp.status==='work') adjustFte(emp.positionId,1);
        if (existing.positionId && existing.positionId!==emp.positionId) adjustFte(existing.positionId,-1);
        Object.assign(existing, emp);
        audit('update','employee',emp.id,'','');
      }
      saveState(state); renderEmployees();
    }}]
  });
  document.addEventListener('keydown', function handler(e){ if(e.ctrlKey && e.key==='s'){ e.preventDefault(); close(); } if(e.key==='Escape'){ close(); } }, { once:true });
}

function adjustFte(posId, delta){
  const pos = state.positions.find(p=>p.id===posId);
  if (pos) { pos.occupiedFte = Math.max(0, pos.occupiedFte + delta); }
}

function renderOrders(){
  const v = document.getElementById('view-orders');
  v.innerHTML = '<div class="section-title"><h2>Приказы</h2><input id="ord-search" class="input" placeholder="Поиск"></div><div id="ord-grid"></div><div id="ord-card" class="card"></div>';
  const grid = new DataGrid({
    columns:[
      {title:'№', field:'number', mono:true},
      {title:'Дата', field:'date'},
      {title:'Тип', field:'type'},
      {title:'Сотрудник', field:'employee'},
      {title:'Позиция', field:'position'},
      {title:'Статус', field:'status', render:v=> badge(v, v==='signed'?'signed':'draft')},
    ],
    rows: state.orders.map(o=>({...o, employee: findEmployee(o.employeeId)?.name||'', position: findPosition(o.positionId)?.title||''})),
    onSelect:r=>showOrderCard(r.id),
    onOpen:r=>editOrder(r.id)
  });
  document.getElementById('ord-grid').appendChild(grid.render());
  document.getElementById('ord-search').addEventListener('input', e=> grid.setFilter(e.target.value));
}

function showOrderCard(id){
  const o = state.orders.find(x=>x.id===id); if(!o) return;
  const wrap = document.getElementById('ord-card');
  wrap.innerHTML = `<div class="section-title"><strong>${o.number}</strong><div><button class="btn" onclick="editOrder('${o.id}')">Редактировать</button></div></div>
  <p>${o.type} — ${o.date}</p><p>Сотрудник: ${findEmployee(o.employeeId)?.name||'—'}, Позиция: ${findPosition(o.positionId)?.title||'—'}</p>
  <p>Статус: ${badge(o.status, o.status==='signed'?'signed':'draft')}</p>
  <button class="btn" onclick="signOrder('${o.id}')">Подписать (mock)</button>`;
  audit('read','order',id,'','card');
}

function editOrder(id){
  if (!hasPerm('write')) return deny('write');
  const order = structuredClone(state.orders.find(o=>o.id===id) || { id:`ord-${Date.now()}`, number:'', date:new Date().toISOString().slice(0,10), type:'прием', employeeId:'', positionId:'', status:'draft' });
  const close = modal({
    title:'Приказ',
    body:`<label>Номер<input id="o-num" class="input" value="${order.number}"></label>
      <label>Дата<input id="o-date" type="date" value="${order.date}"></label>
      <label>Тип<select id="o-type">${['прием','увольнение','отпуск','перевод'].map(t=>`<option value="${t}" ${t===order.type?'selected':''}>${t}</option>`).join('')}</select></label>
      <label>Сотрудник<select id="o-emp">${state.employees.map(e=>`<option value="${e.id}" ${e.id===order.employeeId?'selected':''}>${e.name}</option>`).join('')}</select></label>
      <label>Позиция<select id="o-pos"><option value="">—</option>${state.positions.map(p=>`<option value="${p.id}" ${p.id===order.positionId?'selected':''}>${p.title}</option>`).join('')}</select></label>
    `,
    actions:[{label:'Сохранить', onClick:()=>{
      order.number = document.getElementById('o-num').value;
      order.date = document.getElementById('o-date').value;
      order.type = document.getElementById('o-type').value;
      order.employeeId = document.getElementById('o-emp').value;
      order.positionId = document.getElementById('o-pos').value;
      const issues = validateOrder(order, state);
      if (issues.some(i=>i.level==='crit')) { toast(issues.map(i=>i.message).join('\n'),'error'); return; }
      const existing = state.orders.find(o=>o.id===order.id);
      if (!existing) { state.orders.push(order); audit('create','order',order.id,'',''); }
      else { Object.assign(existing, order); audit('update','order',order.id,'',''); }
      saveState(state); renderOrders();
    }}]
  });
}

function signOrder(id){
  if (!hasPerm('sign')) return deny('sign');
  const o = state.orders.find(x=>x.id===id); if(!o) return;
  o.status = 'signed';
  audit('sign','order',id,'status','mock-sign');
  saveState(state); renderOrders(); showOrderCard(id);
}

function renderTimesheet(){
  const v = document.getElementById('view-timesheet');
  const monthKey = Object.keys(state.timesheets)[0];
  const ts = state.timesheets[monthKey]; ts.month = monthKey;
  v.innerHTML = `<div class="section-title"><h2>Табель ${monthKey}</h2><div class="toolbar"><button class="btn" onclick="saveTimesheet('${monthKey}')">Сохранить</button></div></div><div class="table-wrap" id="ts-table"></div><div id="ts-issues" class="card"></div>`;
  const table = document.createElement('table'); table.className='table';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  trh.innerHTML = `<th class="sticky-col">Сотр</th>` + Array.from({length:ts.days},(_,i)=>`<th>${i+1}</th>`).join('');
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  state.employees.forEach(emp=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="sticky-col">${emp.name}</td>` + Array.from({length:ts.days},(_,i)=>{
      const val = ts.rows[emp.id]?.[i] ?? '';
      return `<td><input data-emp="${emp.id}" data-day="${i}" value="${val}" class="input monodata" style="width:42px"></td>`;
    }).join('');
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  document.getElementById('ts-table').appendChild(table);
  tbody.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('keydown', e=>{
      const day = Number(inp.dataset.day);
      const row = inp.closest('tr');
      const inputs = Array.from(row.querySelectorAll('input'));
      if (e.key==='ArrowRight') inputs[Math.min(inputs.length-1, day+1)].focus();
      if (e.key==='ArrowLeft') inputs[Math.max(0, day-1)].focus();
      if (e.key==='Enter' || e.key==='ArrowDown') {
        const nextRow = row.nextElementSibling; if (nextRow) nextRow.querySelectorAll('input')[day]?.focus();
      }
      if (e.key==='ArrowUp') {
        const prev = row.previousElementSibling; if (prev) prev.querySelectorAll('input')[day]?.focus();
      }
    });
  });
  showTsIssues(ts);
}

function saveTimesheet(month){
  const ts = state.timesheets[month];
  const inputs = document.querySelectorAll('#ts-table input');
  inputs.forEach(inp=>{
    const emp = inp.dataset.emp; const day = Number(inp.dataset.day);
    ts.rows[emp] = ts.rows[emp] || Array(ts.days).fill('');
    ts.rows[emp][day] = inp.value.trim().toUpperCase();
  });
  const issues = validateTimesheetMonth(ts, state);
  if (issues.some(i=>i.level==='crit')) { toast('Критические ошибки табеля','error'); }
  saveState(state); showTsIssues(ts); audit('update','timesheet',month,'','save');
}

function showTsIssues(ts){
  const issues = validateTimesheetMonth(ts, state);
  document.getElementById('ts-issues').innerHTML = `<strong>Контроль качества</strong><ul>${issues.map(i=>`<li>${i.level}: ${i.message}</li>`).join('')||'<li>Нет замечаний</li>'}</ul>`;
}

function renderFszn(){
  const v = document.getElementById('view-fszn');
  v.innerHTML = `<div class="section-title"><h2>ФСЗН ПУ-2 (прототип)</h2><div class="toolbar"><button class="btn" onclick="exportPU2()">Скачать TXT</button></div></div><div id="fszn-quality" class="card"></div><div class="table-wrap">${pu2Preview()}</div>`;
  checkPU2();
}

function pu2Preview(){
  const lines = buildPU2();
  return `<table class="table"><thead><tr><th>Строка</th></tr></thead><tbody>${lines.map(l=>`<tr><td class="monodata">${l}</td></tr>`).join('')}</tbody></table>`;
}

function buildPU2(){
  return state.orders.filter(o=>o.status==='signed' && ['прием','увольнение'].includes(o.type)).map(o=>{
    const emp = findEmployee(o.employeeId)||{}; const pos = findPosition(o.positionId)||{};
    const line = [emp.tabNo, emp.personalNo, emp.name, o.type, o.number, o.date, pos.code||'', pos.title||'', emp.contract?.type||''].join(';');
    return line;
  });
}

function checkPU2(){
  const issues = [];
  state.orders.filter(o=>o.status==='signed' && ['прием','увольнение'].includes(o.type)).forEach(o=>{
    if (!o.employeeId || !o.number || !o.date || !(findPosition(o.positionId)?.code)) {
      issues.push({ level:'crit', message:`Приказ ${o.number||o.id}: нет обязательных реквизитов` });
    }
  });
  document.getElementById('fszn-quality').innerHTML = `<strong>Контроль качества</strong><ul>${issues.map(i=>`<li>${i.level}: ${i.message}</li>`).join('')||'<li>Нет ошибок</li>'}</ul>`;
}

function exportPU2(){
  if (!hasPerm('export')) return deny('export');
  const lines = buildPU2();
  const blob = new Blob([lines.join('\n')], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'pu2.txt'; a.click();
  audit('export','fszn','pu2','lines',`rows=${lines.length}`);
}

function renderVur(){
  const v = document.getElementById('view-vur');
  const rows = state.employees.filter(e=>e.vur);
  v.innerHTML = '<div class="section-title"><h2>Воинский учет</h2></div><div class="table-wrap" id="vur-grid"></div><div id="vur-card" class="card"></div>';
  const grid = new DataGrid({
    columns:[{title:'ФИО', field:'name'},{title:'Должность', field:'position'},{title:'Категория', field:'cat'},{title:'Сверка', field:'checked'}],
    rows: rows.map(e=>({ id:e.id, name:e.name, position:findPosition(e.positionId)?.title||'', cat:'I', checked:e.vurCheckedAt||'—' })),
    onSelect:r=> showVurCard(r.id)
  });
  document.getElementById('vur-grid').appendChild(grid.render());
}

function showVurCard(id){
  const e = state.employees.find(x=>x.id===id); if(!e) return;
  const wrap = document.getElementById('vur-card');
  wrap.innerHTML = `<div class="section-title"><strong>${e.name}</strong><div><button class="btn" onclick="markVur('${e.id}')">Отметить сверку</button></div></div>
  <p>ВУС: 021 | Категория: I | Военкомат: Минский</p><p>Последняя сверка: ${e.vurCheckedAt||'—'}</p>`;
  audit('read','vur',id,'','card');
}

function markVur(id){
  if (!hasPerm('vur')) return deny('vur');
  const e = state.employees.find(x=>x.id===id); if(!e) return;
  e.vurCheckedAt = new Date().toISOString().slice(0,10);
  saveState(state); audit('update','vur',id,'vurCheckedAt',''); renderVur(); showVurCard(id);
}

function renderConsents(){
  const v = document.getElementById('view-consents');
  v.innerHTML = '<div class="section-title"><h2>Согласия</h2></div><div class="table-wrap" id="cons-grid"></div><div id="cons-card" class="card"></div>';
  const grid = new DataGrid({
    columns:[{title:'ID',field:'id',mono:true},{title:'Субъект',field:'subject'},{title:'Цель',field:'purpose'},{title:'Статус',field:'status'}],
    rows: state.consents.map(c=>({...c, subject: findEmployee(c.subjectId)?.name||c.subjectId})),
    onSelect:r=>showConsentCard(r.id)
  });
  document.getElementById('cons-grid').appendChild(grid.render());
}

function showConsentCard(id){
  const c = state.consents.find(x=>x.id===id); if(!c) return;
  const wrap = document.getElementById('cons-card');
  wrap.innerHTML = `<div class="section-title"><strong>${c.id}</strong><div><button class="btn" onclick="revokeConsent('${c.id}')">Отозвать</button><button class="btn" onclick="anonymize('${c.subjectId}')">Анонимизировать</button></div></div>
  <p>Субъект: ${findEmployee(c.subjectId)?.name||'—'} | Цель: ${c.purpose}</p><p>Статус: ${c.status} | Подписано: ${c.signedAt} | Отзыв: ${c.revokedAt||'—'}</p>`;
  audit('read','consent',id,'','card');
}

function revokeConsent(id){
  if (!hasPerm('write')) return deny('write');
  const c = state.consents.find(x=>x.id===id); if(!c) return;
  c.status='revoked'; c.revokedAt = new Date().toISOString().slice(0,10);
  audit('update','consent',id,'status','revoke'); saveState(state); renderConsents();
}

function anonymize(empId){
  if (!hasPerm('write')) return deny('write');
  const e = state.employees.find(x=>x.id===empId); if(!e) return;
  e.name = `АНОНИМ_${empId}`; e.tabNo=''; e.personalNo='';
  saveState(state); audit('update','employee',empId,'anonymize','consent revoked'); renderEmployees();
}

function renderAudit(){
  const v = document.getElementById('view-audit');
  v.innerHTML = `<div class="section-title"><h2>Аудит-лог</h2><div class="toolbar"><input id="audit-search" class="input" placeholder="Поиск"><button class="btn" onclick="clearAudit()">Очистить</button></div></div><div class="table-wrap">${auditTable(filterAudit())}</div>`;
  document.getElementById('audit-search').addEventListener('input', ()=> renderAudit());
}

function filterAudit(){
  const term = document.getElementById('audit-search')?.value?.toLowerCase()||'';
  return state.audit.filter(a=>!term || Object.values(a).some(v=>String(v).toLowerCase().includes(term)));
}

function clearAudit(){
  if (!hasPerm('audit')) return deny('audit');
  if (!confirm('Очистить аудит?')) return;
  state.audit = []; saveState(state); audit('delete','audit','all','', 'clear'); renderAudit();
}

function renderSettings(){
  const v = document.getElementById('view-settings');
  v.innerHTML = `<div class="section-title"><h2>Настройки</h2></div>
    <div class="card">
      <label>contractNoticeDays <input id="cfg-notice" class="input" type="number" value="${state.config.contractNoticeDays}"></label>
      <label>contractMaxYears <input id="cfg-max" class="input" type="number" value="${state.config.contractMaxYears}"></label>
      <div class="toolbar"><button class="btn" onclick="saveCfg()">Сохранить</button><button class="btn" onclick="exportState()">Экспорт JSON</button><button class="btn" onclick="importState()">Импорт JSON</button><button class="btn" onclick="doReset()">Сброс seed</button></div>
    </div>`;
}

function saveCfg(){
  state.config.contractNoticeDays = Number(document.getElementById('cfg-notice').value)||60;
  state.config.contractMaxYears = Number(document.getElementById('cfg-max').value)||5;
  saveState(state); toast('Сохранено'); audit('update','config','cfg','', '');
}

function exportState(){
  if (!hasPerm('export')) return deny('export');
  const blob = new Blob([JSON.stringify(state)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='hrms-state.json'; a.click();
  audit('export','state','json','', '');
}

function importState(){
  if (!hasPerm('import')) return deny('import');
  const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = e=>{
    const file = e.target.files[0]; if(!file) return;
    file.text().then(txt=>{ try { state = JSON.parse(txt); saveState(state); audit('import','state','json','', ''); renderAll(); } catch(err){ toast('Ошибка JSON'); }});
  };
  inp.click();
}

function doReset(){
  if (!hasPerm('reset')) return deny('reset');
  state = resetToSeed(); renderAll(); audit('reset','state','seed','', '');
}

function findUnit(id){ return state.orgUnits.find(u=>u.id===id)?.name || ''; }
function findPosition(id){ return state.positions.find(p=>p.id===id); }
function findEmployee(id){ return state.employees.find(e=>e.id===id); }
function daysUntil(date){ return Math.ceil((new Date(date)-new Date())/(1000*60*60*24)); }

function renderAll(){
  renderShell(); initNav(); setView(currentView||'dashboard');
}

function initTopbar(){
  document.getElementById('role-select').addEventListener('change', e=>{ currentRole = e.target.value; audit('switch_role','user','-',currentRole,''); });
  document.getElementById('create-btn').addEventListener('click', ()=>{
    if (currentView==='employees') editEmployee();
    else if (currentView==='positions') editPosition();
    else if (currentView==='orders') editOrder();
    else toast('Нет действия для создания');
  });
  document.addEventListener('keydown', e=>{
    if (e.ctrlKey && e.key.toLowerCase()==='k') { e.preventDefault(); commandPalette([
      {label:'Создать сотрудника', onClick:()=>editEmployee()},
      {label:'Создать позицию', onClick:()=>editPosition()},
      {label:'Создать приказ', onClick:()=>editOrder()},
      {label:'Перейти к табелю', onClick:()=>setView('timesheet')},
      {label:'Перейти в ФСЗН', onClick:()=>setView('fszn')},
    ]); }
  });
}

function attachSearch(){
  document.getElementById('global-search').addEventListener('input', ()=>{
    if (currentView==='employees') renderEmployees();
  });
}

function bootstrap() {
  try {
    renderShell();
    initNav();
    renderDashboard();
    initTopbar();
    attachSearch();
  } catch (e) {
    console.error('Init error', e);
    const main = document.getElementById('main');
    if (main) main.innerHTML = `<div class="card">Ошибка инициализации: ${e.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
