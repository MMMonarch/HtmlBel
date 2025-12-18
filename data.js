const seedData = {
  schemaVersion: 1,
  config: {
    contractNoticeDays: 60,
    contractMaxYears: 5,
    timesheetCodes: ['Я','В','ОТ','Б','К','П','Г','']
  },
  orgUnits: [
    { id:'ou-1', name:'Головной офис', branch:'Минск' },
    { id:'ou-2', name:'Филиал Брест', branch:'Брест' },
  ],
  eksd_etks: [
    { code:'111-01', name:'Инженер-программист', source:'ЕКСД' },
    { code:'214-02', name:'HR-специалист', source:'ЕКСД' },
    { code:'123-05', name:'Специалист по ВУР', source:'ЕКСД' },
  ],
  positions: [
    { id:'pos-1', unit:'ou-1', code:'111-01', title:'Инженер-программист', fte:1, occupiedFte:1, wageRate:3500 },
    { id:'pos-2', unit:'ou-1', code:'214-02', title:'HR-специалист', fte:1, occupiedFte:0, wageRate:2000 },
    { id:'pos-3', unit:'ou-2', code:'123-05', title:'Специалист по ВУР', fte:1, occupiedFte:0.5, wageRate:2100 },
  ],
  employees: [
    { id:'emp-1', tabNo:'0001', personalNo:'BY-1001', name:'Иванов Иван', positionId:'pos-1', status:'work', contract:{ type:'контракт', start:'2023-06-01', end:'2024-06-01', extensions:0 }, consentId:'c-1', vur:true },
    { id:'emp-2', tabNo:'0002', personalNo:'BY-1002', name:'Петрова Анна', positionId:'pos-2', status:'candidate', contract:{ type:'контракт', start:'', end:'', extensions:0 }, consentId:'', vur:false },
    { id:'emp-3', tabNo:'0003', personalNo:'BY-1003', name:'Сидоров Павел', positionId:'pos-3', status:'work', contract:{ type:'контракт', start:'2022-04-10', end:'2025-04-09', extensions:1 }, consentId:'c-2', vur:true },
  ],
  orders: [
    { id:'ord-1', number:'При-01', date:'2024-05-20', type:'прием', employeeId:'emp-1', positionId:'pos-1', status:'signed' },
    { id:'ord-2', number:'Отп-02', date:'2024-06-01', type:'отпуск', employeeId:'emp-3', positionId:'pos-3', status:'signed', period:'2024-06-10/2024-06-20' },
    { id:'ord-3', number:'Пр-03', date:'2024-07-01', type:'прием', employeeId:'emp-2', positionId:'pos-2', status:'draft' },
  ],
  consents: [
    { id:'c-1', subjectId:'emp-1', type:'99-З', purpose:'Трудовые отношения', status:'active', signedAt:'2023-05-20', revokedAt:'' },
    { id:'c-2', subjectId:'emp-3', type:'99-З', purpose:'Трудовые отношения', status:'active', signedAt:'2022-04-01', revokedAt:'' },
  ],
  audit: [
    { id:'a-1', at:'2024-05-20T10:00', actor:'admin', role:'ADMIN', action:'sign', entity:'order', entityId:'ord-1', fields:'status', note:'Подписан приказ' },
    { id:'a-2', at:'2024-06-01T12:00', actor:'admin', role:'ADMIN', action:'sign', entity:'order', entityId:'ord-2', fields:'status', note:'Подписан отпуск' },
  ],
  timesheets: {
    '2024-06': {
      days:31,
      rows:{
        'emp-1': ['Я','Я','Я','Я','Я','В','В','Я','Я','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','Я','Я','Я','Я','Я','В','В','Я','Я','Я','Я','Я'],
        'emp-2': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
        'emp-3': ['Я','Я','Я','Я','Я','В','В','Я','Я','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','ОТ','Я','Я','Я','Я','Я','В','В','Я','Я','Я','Я','Я']
      }
    }
  }
};
