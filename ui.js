class DataGrid {
  constructor({ columns, rows, onSelect, onOpen }) {
    this.columns = columns;
    this.rows = rows;
    this.onSelect = onSelect;
    this.onOpen = onOpen;
    this.sort = { key:null, dir:1 };
    this.filter = '';
  }
  render() {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'table';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    this.columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.title;
      th.tabIndex = 0;
      th.addEventListener('click', () => this.setSort(col.field));
      th.addEventListener('keydown', e=>{ if(e.key==='Enter') this.setSort(col.field); });
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    this.tbody = document.createElement('tbody');
    table.appendChild(this.tbody);
    wrap.appendChild(table);
    this.table = table;
    this.refresh();
    this.bindKeyboard();
    return wrap;
  }
  setSort(field){
    if (this.sort.key === field) this.sort.dir *= -1; else this.sort = { key:field, dir:1 };
    this.refresh();
  }
  setFilter(term){ this.filter = term.toLowerCase(); this.refresh(); }
  refresh(){
    const rows = this.rows.filter(r => !this.filter || Object.values(r).some(v => String(v||'').toLowerCase().includes(this.filter)));
    if (this.sort.key) rows.sort((a,b)=> (a[this.sort.key]||'').localeCompare(b[this.sort.key]||'')*this.sort.dir);
    this.tbody.innerHTML = '';
    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.rowid = row.id || idx;
      this.columns.forEach(col => {
        const td = document.createElement('td');
        td.innerHTML = col.render ? col.render(row[col.field], row) : (row[col.field] ?? '');
        if (col.mono) td.classList.add('monodata');
        tr.appendChild(td);
      });
      tr.addEventListener('click', ()=> this.selectRow(tr,row));
      tr.addEventListener('dblclick', ()=> this.openRow(row));
      this.tbody.appendChild(tr);
    });
  }
  selectRow(tr,row){
    this.tbody.querySelectorAll('tr').forEach(r=>r.classList.remove('selected'));
    tr.classList.add('selected');
    this.selected = row;
    this.onSelect && this.onSelect(row);
  }
  openRow(row){ this.onOpen && this.onOpen(row); }
  bindKeyboard(){
    this.table.addEventListener('keydown', e => {
      const trs = Array.from(this.tbody.querySelectorAll('tr'));
      if (!trs.length) return;
      let idx = trs.findIndex(t=>t.classList.contains('selected'));
      if (e.key === 'ArrowDown') { idx = Math.min(trs.length-1, idx+1); trs[idx].click(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { idx = Math.max(0, idx-1); trs[idx].click(); e.preventDefault(); }
      if (e.key === 'Enter' && idx>=0) { this.openRow(this.selected); }
    });
  }
}

function modal({ title, body, onClose, actions }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const box = document.createElement('div');
  box.className = 'modal';
  const h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
  const content = document.createElement('div'); content.innerHTML = body; box.appendChild(content);
  const footer = document.createElement('div'); footer.className='modal-footer';
  (actions||[]).forEach(a=>{
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.className = 'btn';
    btn.addEventListener('click', ()=>{ a.onClick && a.onClick(); close(); });
    footer.appendChild(btn);
  });
  box.appendChild(footer);
  backdrop.appendChild(box);
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop){ close(); onClose&&onClose(); } });
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  root.appendChild(backdrop);
  function close(){ root.innerHTML=''; onClose&&onClose(); }
  return close;
}

function toast(message, level='info'){
  const root = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  root.appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}

function badge(text, cls='') {
  return `<span class="pill ${cls}">${text}</span>`;
}

function commandPalette(actions){
  const overlay = document.getElementById('command-palette');
  overlay.classList.remove('cmd-hidden');
  const input = document.getElementById('cmd-input');
  const box = document.getElementById('cmd-actions');
  box.innerHTML = '';
  actions.forEach(a=>{
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.className = 'btn';
    btn.addEventListener('click', ()=>{ a.onClick(); hide(); });
    box.appendChild(btn);
  });
  function hide(){ overlay.classList.add('cmd-hidden'); }
  overlay.addEventListener('click', e=>{ if(e.target===overlay) hide(); });
  input.value='';
  input.focus();
  input.addEventListener('keydown', e=>{ if(e.key==='Escape') hide(); if(e.key==='Enter'){ const first=actions[0]; first&&first.onClick(); hide(); } });
}
