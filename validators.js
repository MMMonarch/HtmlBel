function validateEmployee(emp, state, cfg) {
  const issues = [];
  if (emp.status === 'candidate' && !emp.consentId) {
    issues.push({ level:'crit', field:'consentId', message:'Кандидат без согласия (99-З) недопустим' });
  }
  if (emp.status === 'work' && !emp.positionId) {
    issues.push({ level:'crit', field:'positionId', message:'Статус “работает” без позиции запрещен' });
  }
  if (emp.status === 'work') {
    const pos = state.positions.find(p=>p.id===emp.positionId);
    if (pos && pos.occupiedFte >= pos.fte) {
      issues.push({ level:'crit', field:'positionId', message:'Прием на позицию без вакансии FTE' });
    }
  }
  if (emp.contract?.type === 'контракт') {
    if (!emp.contract.start || !emp.contract.end) {
      issues.push({ level:'crit', field:'contract', message:'Контракт требует даты начала и окончания' });
    } else {
      const start = new Date(emp.contract.start);
      const end = new Date(emp.contract.end);
      const years = (end - start)/(1000*60*60*24*365);
      if (years < 1) issues.push({ level:'warn', field:'contract.end', message:'Срок контракта менее 1 года' });
      if (years > cfg.contractMaxYears) issues.push({ level:'crit', field:'contract.end', message:`Срок контракта превышает ${cfg.contractMaxYears} лет` });
    }
  }
  return issues;
}

function validateTimesheetMonth(tsMonth, state) {
  const issues = [];
  const allowed = state.config.timesheetCodes;
  if (!tsMonth) return issues;
  for (const [empId, codes] of Object.entries(tsMonth.rows||{})) {
    codes.forEach((code, idx) => {
      if (!allowed.includes(code)) {
        issues.push({ level:'warn', field:`${empId}:${idx}`, message:`Недопустимый код табеля ${code}` });
      }
      const day = idx+1;
      const orderConflict = state.orders.find(o=>o.employeeId===empId && o.type==='отпуск' && o.status==='signed');
      if (orderConflict && orderConflict.period) {
        const [from,to] = orderConflict.period.split('/');
        const d = new Date(`${tsMonth.month||'2024-06'}-${String(day).padStart(2,'0')}`);
        if (d>=new Date(from) && d<=new Date(to) && code==='Я') {
          issues.push({ level:'warn', field:`${empId}:${idx}`, message:'Конфликт: отпуск в приказе, явка в табеле' });
        }
      }
    });
  }
  return issues;
}

function validateOrder(order, state) {
  const issues = [];
  if ((order.type === 'прием' || order.type === 'перевод') && !order.positionId) {
    issues.push({ level:'crit', field:'positionId', message:'Требуется позиция для приема/перевода' });
  }
  if (order.type === 'прием') {
    const pos = state.positions.find(p=>p.id===order.positionId);
    if (pos && pos.occupiedFte >= pos.fte) {
      issues.push({ level:'crit', field:'positionId', message:'Нет свободной FTE для приема' });
    }
  }
  if (order.status === 'signed' && (order.type === 'прием' || order.type === 'увольнение')) {
    const emp = state.employees.find(e=>e.id===order.employeeId);
    const pos = state.positions.find(p=>p.id===order.positionId);
    if (!emp || !order.number || !order.date || !pos?.code) {
      issues.push({ level:'crit', field:'required', message:'ПУ-2: требуется сотрудник, номер/дата приказа, код должности' });
    }
  }
  return issues;
}
