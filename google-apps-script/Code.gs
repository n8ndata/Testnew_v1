/**
 * ============================================================================
 * ROUTER DEPARTMENT - Google Apps Script API
 * ระบบบันทึกและติดตามข้อผิดพลาดในการปฏิบัติงาน แผนก ROUTER
 * ============================================================================
 * วิธีติดตั้ง
 * 1) เปิด Google Sheets > Extensions > Apps Script
 * 2) วางไฟล์นี้ใน Code.gs
 * 3) เลือกฟังก์ชัน setupSystem แล้วกด Run (อนุญาตสิทธิ์ครั้งแรก)
 * 4) Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) คัดลอก URL ที่ลงท้ายด้วย /exec ไปวางในหน้าเว็บ > ตั้งค่า
 * ============================================================================
 */

var CONFIG = {
  EMPLOYEE_SHEET: 'รายชื่อพนักงาน',
  INCIDENT_SHEET: 'บันทึกความผิดพลาด',
  TIMEZONE: Session.getScriptTimeZone() || 'Asia/Bangkok',
  EMPLOYEE_HEADERS: [
    'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'แผนก', 'กะประจำ', 'ตำแหน่ง', 'เบอร์โทร', 'สถานะ'
  ],
  INCIDENT_HEADERS: [
    'ID', 'วันที่บันทึก', 'วันที่เกิดเหตุ', 'กะ', 'รหัสพนักงาน', 'ชื่อพนักงาน',
    'เครื่องจักร', 'Part No.', 'ประเภทความผิดพลาด', 'ระดับความรุนแรง',
    'รายละเอียด', 'ผลกระทบ/ของเสีย', 'ผู้บันทึก', 'สาเหตุเบื้องต้น',
    'แนวทางแก้ไข', 'สถานะ', 'หมายเหตุ', 'อัปเดตล่าสุด', 'ผู้แก้ไขล่าสุด',
    'Model', 'Lot', 'จำนวน Sheet ทั้งหมด', 'NG Sheet', '% NG'
  ]
};

var INCIDENT_COLUMN = {
  id: 1,
  timestamp: 2,
  date: 3,
  shift: 4,
  employeeId: 5,
  employeeName: 6,
  machine: 7,
  partNo: 8,
  category: 9,
  severity: 10,
  description: 11,
  impact: 12,
  reporter: 13,
  rootCause: 14,
  corrective: 15,
  status: 16,
  notes: 17,
  updatedAt: 18,
  updatedBy: 19,
  model: 20,
  lot: 21,
  totalSheets: 22,
  ngSheets: 23,
  ngPercent: 24
};

var VALID = {
  shifts: ['กะเช้า', 'กะบ่าย', 'กะดึก', 'กะปกติ'],
  severities: ['เล็กน้อย', 'ปานกลาง', 'สูง', 'วิกฤต'],
  statuses: ['รอดำเนินการ', 'กำลังตรวจสอบ', 'อบรมซ้ำแล้ว', 'ปิดงาน']
};

var EMPLOYEE_SEED = [
  ['RT001', 'สมชาย ใจดี', 'ROUTER', 'กะเช้า', 'หัวหน้ากะ', '081-234-5678', 'ใช้งาน'],
  ['RT002', 'สมหญิง รักงาน', 'ROUTER', 'กะเช้า', 'ช่างปฏิบัติการ', '082-345-6789', 'ใช้งาน'],
  ['RT003', 'วิชัย ขยันดี', 'ROUTER', 'กะบ่าย', 'ช่างปฏิบัติการ', '083-456-7890', 'ใช้งาน'],
  ['RT004', 'นภาพร สว่างใจ', 'ROUTER', 'กะบ่าย', 'หัวหน้ากะ', '084-567-8901', 'ใช้งาน'],
  ['RT005', 'อนุชา พากเพียร', 'ROUTER', 'กะดึก', 'ช่างปฏิบัติการ', '085-678-9012', 'ใช้งาน'],
  ['RT006', 'ปรีชา มั่นคง', 'ROUTER', 'กะดึก', 'ช่างซ่อมบำรุง', '086-789-0123', 'ใช้งาน'],
  ['RT007', 'กมลชนก แสงทอง', 'ROUTER', 'กะเช้า', 'QC Inspector', '087-890-1234', 'ใช้งาน'],
  ['RT008', 'ธนากร วงศ์ใหญ่', 'ROUTER', 'กะบ่าย', 'ช่างปฏิบัติการ', '088-901-2345', 'ใช้งาน'],
  ['RT009', 'ศิริพร ดีพร้อม', 'ROUTER', 'กะปกติ', 'ธุรการแผนก', '089-012-3456', 'ใช้งาน'],
  ['RT010', 'ณัฐพล เรืองศรี', 'ROUTER', 'กะดึก', 'ช่างปฏิบัติการ', '090-123-4567', 'ใช้งาน'],
  ['RT011', 'พิมพ์ชนก อินทร์ทอง', 'ROUTER', 'กะปกติ', 'วิศวกรกระบวนการ', '091-234-5678', 'ใช้งาน'],
  ['RT012', 'อดิศักดิ์ ทองแท้', 'ROUTER', 'กะเช้า', 'ช่างปฏิบัติการ', '092-345-6789', 'ใช้งาน']
];

/* ============================================================================
   MENU
   ============================================================================ */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚙️ ROUTER System')
      .addItem('ติดตั้ง / เตรียมแผ่นงาน', 'setupSystem')
      .addItem('ตรวจสอบจำนวนข้อมูล', 'checkSystem')
      .addToUi();
  } catch (error) {
    // onOpen may run in a context without a UI
  }
}

/* ============================================================================
   SETUP
   ============================================================================ */
function setupSystem() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('กรุณาเปิดสคริปต์จากไฟล์ Google Sheets (Extensions > Apps Script)');
  }

  var employeeSheet = ensureSheet_(
    spreadsheet,
    CONFIG.EMPLOYEE_SHEET,
    CONFIG.EMPLOYEE_HEADERS,
    '#0f766e'
  );
  var incidentSheet = ensureSheet_(
    spreadsheet,
    CONFIG.INCIDENT_SHEET,
    CONFIG.INCIDENT_HEADERS,
    '#1e3a8a'
  );

  // Production-safe default: create/format the schema only.
  // Do not silently insert fictional employees or incidents into a live database.
  // For a demo environment, run seedDemoData() explicitly after confirming the
  // spreadsheet is empty.
  formatEmployeeSheet_(employeeSheet);
  formatIncidentSheet_(incidentSheet);

  var result = {
    spreadsheet: spreadsheet.getName(),
    employees: Math.max(0, employeeSheet.getLastRow() - 1),
    incidents: Math.max(0, incidentSheet.getLastRow() - 1)
  };

  try {
    spreadsheet.toast(
      'ติดตั้งระบบเรียบร้อย: พนักงาน ' + result.employees + ' คน, รายการ ' + result.incidents + ' รายการ',
      'ROUTER System',
      8
    );
  } catch (error) {
    // toast is only available in the Sheets UI
  }

  Logger.log(JSON.stringify(result));
  return result;
}

/**
 * OPTIONAL DEMO ONLY.
 * Adds sample rows only when both sheets contain headers and no data rows.
 * Never run this against a production spreadsheet.
 */
function seedDemoData() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('กรุณาเปิดสคริปต์จากไฟล์ Google Sheets');
  var employeeSheet = getOrCreateSheet_(spreadsheet, CONFIG.EMPLOYEE_SHEET, CONFIG.EMPLOYEE_HEADERS);
  var incidentSheet = getOrCreateSheet_(spreadsheet, CONFIG.INCIDENT_SHEET, CONFIG.INCIDENT_HEADERS);

  if (employeeSheet.getLastRow() > 1 || incidentSheet.getLastRow() > 1) {
    throw new Error('ยกเลิกการเพิ่มข้อมูลตัวอย่าง: พบข้อมูลอยู่แล้ว เพื่อป้องกันข้อมูลจริงปะปน');
  }

  employeeSheet.getRange(2, 1, EMPLOYEE_SEED.length, CONFIG.EMPLOYEE_HEADERS.length)
    .setValues(EMPLOYEE_SEED);
  var samples = buildSampleIncidents_();
  incidentSheet.getRange(2, 1, samples.length, CONFIG.INCIDENT_HEADERS.length)
    .setValues(samples);
  formatEmployeeSheet_(employeeSheet);
  formatIncidentSheet_(incidentSheet);
  return { ok: true, employees: EMPLOYEE_SEED.length, incidents: samples.length, demoOnly: true };
}

function checkSystem() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('ไม่พบไฟล์ Google Sheets ที่ผูกกับสคริปต์');
  var employeeSheet = spreadsheet.getSheetByName(CONFIG.EMPLOYEE_SHEET);
  var incidentSheet = spreadsheet.getSheetByName(CONFIG.INCIDENT_SHEET);
  var message = 'พนักงาน: ' + (employeeSheet ? Math.max(0, employeeSheet.getLastRow() - 1) : 0) + ' คน\n' +
    'รายการข้อผิดพลาด: ' + (incidentSheet ? Math.max(0, incidentSheet.getLastRow() - 1) : 0) + ' รายการ';
  try {
    SpreadsheetApp.getUi().alert('สถานะระบบ ROUTER', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    Logger.log(message);
  }
}

function ensureSheet_(spreadsheet, name, headers, tabColor) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // Guarantee that the header row exists even if the sheet was manually cleared.
    var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var isBlank = firstRow.every(function (value) { return String(value).trim() === ''; });
    if (isBlank) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  sheet.setTabColor(tabColor);
  sheet.setFrozenRows(1);
  return sheet;
}

function formatEmployeeSheet_(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, CONFIG.EMPLOYEE_HEADERS.length);
  headerRange
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);

  var widths = [110, 210, 100, 110, 150, 140, 100];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG.EMPLOYEE_HEADERS.length)
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
  }

  var statusValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ใช้งาน', 'ไม่ใช้งาน'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, Math.max(1, sheet.getMaxRows() - 1), 1).setDataValidation(statusValidation);
}

function formatIncidentSheet_(sheet) {
  var columnCount = CONFIG.INCIDENT_HEADERS.length;
  var headerRange = sheet.getRange(1, 1, 1, columnCount);
  headerRange
    .setBackground('#1e3a8a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, 42);

  var widths = [155, 155, 120, 100, 115, 175, 190, 145, 230, 125, 300, 190, 145, 220, 240, 130, 180, 155, 145];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, columnCount)
      .setVerticalAlignment('top')
      .setWrap(true)
      .setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
  }

  // Keep long text inside the cell.
  sheet.getRange(2, INCIDENT_COLUMN.description, Math.max(1, sheet.getMaxRows() - 1), 1).setWrap(true);
  sheet.getRange(2, INCIDENT_COLUMN.rootCause, Math.max(1, sheet.getMaxRows() - 1), 1).setWrap(true);
  sheet.getRange(2, INCIDENT_COLUMN.corrective, Math.max(1, sheet.getMaxRows() - 1), 1).setWrap(true);

  // Text formats for date-like columns prevent Google Sheets from converting to a locale string.
  sheet.getRange(2, INCIDENT_COLUMN.timestamp, Math.max(1, sheet.getMaxRows() - 1), 2).setNumberFormat('@');
  sheet.getRange(2, INCIDENT_COLUMN.updatedAt, Math.max(1, sheet.getMaxRows() - 1), 2).setNumberFormat('@');

  var shiftValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(VALID.shifts, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, INCIDENT_COLUMN.shift, Math.max(1, sheet.getMaxRows() - 1), 1)
    .setDataValidation(shiftValidation);

  var severityValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(VALID.severities, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, INCIDENT_COLUMN.severity, Math.max(1, sheet.getMaxRows() - 1), 1)
    .setDataValidation(severityValidation);

  var statusValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(VALID.statuses, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, INCIDENT_COLUMN.status, Math.max(1, sheet.getMaxRows() - 1), 1)
    .setDataValidation(statusValidation);
}

function buildSampleIncidents_() {
  var now = new Date();
  var rows = [
    incidentRow_({
      id: 'ERR-0001',
      date: dateOffset_(-1),
      shift: 'กะเช้า',
      employeeId: 'RT002',
      employeeName: 'สมหญิง รักงาน',
      machine: 'Router-03 (High Speed PCB)',
      partNo: 'PCB-MB-8802',
      category: 'ตั้งค่าโปรแกรม / G-Code ผิดพลาด',
      severity: 'สูง',
      description: 'ตั้งค่า Offset แกน Z ผิด ทำให้ดอก cutter กดลึกเกินสเปก ชิ้นงานเกิดรอยไหม้และต้องคัดแยก',
      impact: 'ของเสีย 6 ชิ้น / ประเมิน 1,800 บาท',
      reporter: 'สมชาย ใจดี',
      rootCause: 'ไม่ได้ตรวจสอบค่า Offset กับใบตั้งเครื่องก่อนเริ่มเดินโปรแกรม',
      corrective: 'ทวนสอบค่า Z Offset ทุกครั้งก่อน Run และเพิ่มจุดตรวจใน Check Sheet',
      status: 'กำลังตรวจสอบ'
    }, now),
    incidentRow_({
      id: 'ERR-0002',
      date: dateOffset_(-2),
      shift: 'กะบ่าย',
      employeeId: 'RT003',
      employeeName: 'วิชัย ขยันดี',
      machine: 'Router-01 (CNC Precision)',
      partNo: 'PN-ALU-102',
      category: 'ติดตั้งดอกเราเตอร์ผิดเบอร์ / สึกหรอ',
      severity: 'วิกฤต',
      description: 'ติดตั้งดอกเราเตอร์ผิดขนาด ทำให้ตัดขอบชิ้นงานไม่ถึงแนว และเครื่องสั่นสะเทือนระหว่างตัด',
      impact: 'เครื่องหยุด 45 นาที / ของเสีย 12 ชิ้น',
      reporter: 'นภาพร สว่างใจ',
      rootCause: 'หยิบดอกผิดช่องจากตะแกรงเก็บเครื่องมือ เนื่องจากป้ายกำกับสีหลุด',
      corrective: 'เปลี่ยนป้ายกำกับสีใหม่ทั้งตะแกรง และบังคับให้สแกนรหัสดอกก่อนติดตั้ง',
      status: 'อบรมซ้ำแล้ว'
    }, now),
    incidentRow_({
      id: 'ERR-0003',
      date: dateOffset_(-3),
      shift: 'กะดึก',
      employeeId: 'RT005',
      employeeName: 'อนุชา พากเพียร',
      machine: 'Router-05 (Heavy Duty)',
      partNo: 'HD-FRAME-77',
      category: 'วางชิ้นงาน / จิ๊กไม่แน่น',
      severity: 'ปานกลาง',
      description: 'วางชิ้นงานไม่สนิทกับจิ๊ก ทำให้ชิ้นงานเอียงและขนาดรูคลาดเคลื่อน 0.3 มม.',
      impact: 'Rework 4 ชิ้น',
      reporter: 'ปรีชา มั่นคง',
      rootCause: 'ไม่ได้ทำความสะอาดเศษวัสดุใต้จิ๊กก่อนวางชิ้นงาน',
      corrective: 'เพิ่มขั้นตอนเป่าลมทำความสะอาดจิ๊กในใบปฏิบัติงาน',
      status: 'ปิดงาน'
    }, now),
    incidentRow_({
      id: 'ERR-0004',
      date: dateOffset_(-4),
      shift: 'กะเช้า',
      employeeId: 'RT007',
      employeeName: 'กมลชนก แสงทอง',
      machine: 'Router-04 (High Speed PCB)',
      partNo: 'PCB-HDI-4510',
      category: 'ลืมตรวจสอบ First Piece',
      severity: 'เล็กน้อย',
      description: 'เริ่มเดินเครื่องผลิตต่อเนื่องโดยยังไม่ได้ตรวจ First Piece ตามขั้นตอน',
      impact: 'ตรวจพบก่อนส่งต่อ ไม่มีของเสีย',
      reporter: 'สมชาย ใจดี',
      rootCause: 'ช่วงเปลี่ยนรุ่นงานมีการเร่งเวลา จึงข้ามขั้นตอนตรวจ First Piece',
      corrective: 'หัวหน้ากะกำกับและลงนามในใบ First Piece Approval ก่อนเริ่มผลิต',
      status: 'ปิดงาน'
    }, now),
    incidentRow_({
      id: 'ERR-0005',
      date: dateOffset_(-5),
      shift: 'กะปกติ',
      employeeId: 'RT011',
      employeeName: 'พิมพ์ชนก อินทร์ทอง',
      machine: 'Router-07 (Laser/Hybrid)',
      partNo: 'LB-SAMPLE-09',
      category: 'ป้อนรหัส Part Number ผิด',
      severity: 'ปานกลาง',
      description: 'บันทึกรหัส Part Number ในระบบผลิตผิด ทำให้หยิบวัตถุดิบผิดรุ่น',
      impact: 'หยุดไลน์ 15 นาที / วัตถุดิบเสีย 2 แผ่น',
      reporter: 'ศิริพร ดีพร้อม',
      rootCause: 'คัดลอกรหัสจากเอกสารเก่าที่ถูกแก้ไขแล้ว',
      corrective: 'ใช้ระบบสแกนบาร์โค้ดและตรวจสอบรหัสกับใบสั่งผลิตก่อนยืนยัน',
      status: 'ปิดงาน'
    }, now)
  ];
  return rows;
}

function incidentRow_(data, now) {
  var timestamp = now.toISOString();
  return [
    data.id || '',
    timestamp,
    data.date || formatDate_(now),
    data.shift || 'กะเช้า',
    data.employeeId || '',
    data.employeeName || '',
    data.machine || '',
    data.partNo || '',
    data.category || '',
    data.severity || 'ปานกลาง',
    data.description || '',
    data.impact || '',
    data.reporter || '',
    data.rootCause || '',
    data.corrective || '',
    data.status || 'รอดำเนินการ',
    data.notes || '',
    timestamp,
    'setup',
    data.model || '',
    data.lot || '',
    Math.max(0, Math.floor(Number(data.totalSheets) || 0)),
    Math.max(0, Math.floor(Number(data.ngSheets) || 0)),
    Number(data.totalSheets) > 0 ? ((Number(data.ngSheets) || 0) / Number(data.totalSheets) * 100).toFixed(2) + '%' : '0.00%'
  ];
}

/* ============================================================================
   WEB APP API
   ============================================================================ */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = params.action || 'all';
    var spreadsheet = getSpreadsheet_();
    var employeeSheet = getOrCreateSheet_(spreadsheet, CONFIG.EMPLOYEE_SHEET, CONFIG.EMPLOYEE_HEADERS);
    var incidentSheet = getOrCreateSheet_(spreadsheet, CONFIG.INCIDENT_SHEET, CONFIG.INCIDENT_HEADERS);

    if (action === 'ping') {
      return json_({
        ok: true,
        pong: true,
        timestamp: new Date().toISOString(),
        spreadsheet: spreadsheet.getName()
      });
    }

    if (action === 'employees') {
      return json_({
        ok: true,
        employees: readEmployees_(employeeSheet),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'incidents') {
      return json_({
        ok: true,
        incidents: readIncidents_(incidentSheet),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'all' || action === '') {
      return json_({
        ok: true,
        employees: readEmployees_(employeeSheet),
        incidents: readIncidents_(incidentSheet),
        timestamp: new Date().toISOString()
      });
    }

    throw new Error('ไม่รู้จัก action: ' + action);
  } catch (error) {
    return json_({ ok: false, error: error.message || String(error) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('ไม่พบข้อมูลที่ส่งมา (postData)');
    }

    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (error) {
      throw new Error('ข้อมูล JSON ไม่ถูกต้อง');
    }

    var action = body.action;
    var spreadsheet = getSpreadsheet_();
    var incidentSheet = getOrCreateSheet_(spreadsheet, CONFIG.INCIDENT_SHEET, CONFIG.INCIDENT_HEADERS);

    if (action === 'createIncident') {
      return json_(createIncident_(incidentSheet, body.data || {}));
    }
    if (action === 'updateIncident') {
      return json_(updateIncident_(incidentSheet, body.id, body.data || {}));
    }
    if (action === 'deleteIncident') {
      return json_(deleteIncident_(incidentSheet, body.id));
    }

    throw new Error('ไม่รู้จัก action: ' + action);
  } catch (error) {
    return json_({ ok: false, error: error.message || String(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // ignore
    }
  }
}

function createIncident_(sheet, data) {
  var employeeId = clean_(data.employeeId);
  var employeeName = clean_(data.employeeName);
  var date = normalizeDate_(data.date);
  var category = clean_(data.category);
  var description = clean_(data.description);

  if (!employeeId && !employeeName) throw new Error('ไม่พบข้อมูลพนักงาน');
  if (!category) throw new Error('ไม่พบประเภทความผิดพลาด');
  if (!description) throw new Error('ไม่พบรายละเอียดเหตุการณ์');

  // Idempotency: retries after a timeout must not duplicate the row.
  if (data.id) {
    var existingRow = findIncidentRow_(sheet, data.id);
    if (existingRow !== -1) {
      return { ok: true, incident: readIncidentByRow_(sheet, existingRow), duplicate: true };
    }
  }

  var now = new Date();
  var id = clean_(data.id) || generateIncidentId_(sheet, now);
  var shift = VALID.shifts.indexOf(clean_(data.shift)) !== -1 ? clean_(data.shift) : 'กะเช้า';
  var severity = VALID.severities.indexOf(clean_(data.severity)) !== -1 ? clean_(data.severity) : 'ปานกลาง';
  var status = VALID.statuses.indexOf(clean_(data.status)) !== -1 ? clean_(data.status) : 'รอดำเนินการ';

  var row = [
    id,
    now.toISOString(),
    date,
    shift,
    employeeId,
    employeeName || employeeId,
    clean_(data.machine),
    clean_(data.partNo),
    category,
    severity,
    description,
    clean_(data.impact),
    clean_(data.reporter),
    clean_(data.rootCause),
    clean_(data.corrective),
    status,
    clean_(data.notes),
    now.toISOString(),
    clean_(data.updatedBy) || 'web-app'
  ];

  sheet.appendRow(row);
  var rowNumber = sheet.getLastRow();
  sheet.getRange(rowNumber, INCIDENT_COLUMN.timestamp, 1, 2).setNumberFormat('@');
  sheet.getRange(rowNumber, INCIDENT_COLUMN.updatedAt, 1, 2).setNumberFormat('@');
  sheet.getRange(rowNumber, 1, 1, CONFIG.INCIDENT_HEADERS.length)
    .setVerticalAlignment('top')
    .setWrap(true);

  return { ok: true, incident: readIncidentByRow_(sheet, rowNumber) };
}

function updateIncident_(sheet, id, patch) {
  var incidentId = clean_(id);
  if (!incidentId) throw new Error('ไม่พบ ID ของรายการ');

  var rowNumber = findIncidentRow_(sheet, incidentId);
  if (rowNumber === -1) {
    // The row may have been deleted directly in Sheets while this edit was
    // queued offline. Returning ok prevents that permanent failure from
    // blocking every later operation in the browser's sync queue.
    return { ok: true, missing: true, id: incidentId };
  }

  var allowed = ['status', 'description', 'rootCause', 'corrective', 'notes', 'severity', 'shift', 'category', 'impact', 'partNo', 'machine'];
  var updated = false;

  allowed.forEach(function (field) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) return;
    var value = clean_(patch[field]);
    if (['description', 'rootCause', 'corrective', 'notes', 'category', 'impact', 'partNo', 'machine'].indexOf(field) !== -1) value = sheetSafeText_(value);
    if (field === 'status' && VALID.statuses.indexOf(value) === -1) value = 'รอดำเนินการ';
    if (field === 'severity' && VALID.severities.indexOf(value) === -1) value = 'ปานกลาง';
    if (field === 'shift' && VALID.shifts.indexOf(value) === -1) value = 'กะเช้า';
    sheet.getRange(rowNumber, INCIDENT_COLUMN[field]).setValue(value);
    updated = true;
  });

  if (!updated) {
    return { ok: true, incident: readIncidentByRow_(sheet, rowNumber), unchanged: true };
  }

  var now = new Date().toISOString();
  sheet.getRange(rowNumber, INCIDENT_COLUMN.updatedAt).setValue(now).setNumberFormat('@');
  sheet.getRange(rowNumber, INCIDENT_COLUMN.updatedBy).setValue(clean_(patch.updatedBy) || 'web-app');

  return { ok: true, incident: readIncidentByRow_(sheet, rowNumber) };
}

function deleteIncident_(sheet, id) {
  var incidentId = clean_(id);
  if (!incidentId) throw new Error('ไม่พบ ID ของรายการ');
  var rowNumber = findIncidentRow_(sheet, incidentId);
  if (rowNumber === -1) {
    return { ok: true, deleted: false, message: 'ไม่พบรายการ (อาจถูกลบไปแล้ว)' };
  }
  sheet.deleteRow(rowNumber);
  return { ok: true, deleted: true, id: incidentId };
}

/* ============================================================================
   READ / WRITE HELPERS
   ============================================================================ */
function readEmployees_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, CONFIG.EMPLOYEE_HEADERS.length).getValues();
  return values.map(function (row) {
    return {
      id: clean_(row[0]),
      code: clean_(row[0]),
      name: clean_(row[1]),
      department: clean_(row[2]) || 'ROUTER',
      shift: clean_(row[3]) || 'กะเช้า',
      position: clean_(row[4]),
      phone: clean_(row[5]),
      active: !/^(ไม่ใช้งาน|ลาออก|inactive|false|0|no|leave|resigned)$/i.test(clean_(row[6]))
    };
  }).filter(function (employee) {
    return employee.code !== '' || employee.name !== '';
  });
}

function readIncidents_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, CONFIG.INCIDENT_HEADERS.length).getValues();
  return values.map(function (row) {
    return incidentFromRow_(row);
  }).filter(function (incident) {
    return incident.id !== '';
  });
}

function readIncidentByRow_(sheet, rowNumber) {
  var row = sheet.getRange(rowNumber, 1, 1, CONFIG.INCIDENT_HEADERS.length).getValues()[0];
  return incidentFromRow_(row);
}

function incidentFromRow_(row) {
  return {
    id: clean_(row[0]),
    timestamp: valueToText_(row[1]),
    date: normalizeDate_(row[2]),
    shift: clean_(row[3]),
    employeeId: clean_(row[4]),
    employeeName: clean_(row[5]),
    machine: clean_(row[6]),
    partNo: clean_(row[7]),
    category: clean_(row[8]),
    severity: clean_(row[9]),
    description: clean_(row[10]),
    impact: clean_(row[11]),
    reporter: clean_(row[12]),
    rootCause: clean_(row[13]),
    corrective: clean_(row[14]),
    status: clean_(row[15]) || 'รอดำเนินการ',
    notes: clean_(row[16]),
    updatedAt: valueToText_(row[17]),
    updatedBy: clean_(row[18]),
    model: clean_(row[19]),
    lot: clean_(row[20]),
    totalSheets: Math.max(0, Math.floor(Number(row[21]) || 0)),
    ngSheets: Math.max(0, Math.floor(Number(row[22]) || 0)),
    ngPercent: clean_(row[23]) || '0.00%'
  };
}

function findIncidentRow_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var index = 0; index < ids.length; index += 1) {
    if (clean_(ids[index][0]) === clean_(id)) return index + 2;
  }
  return -1;
}

function generateIncidentId_(sheet, date) {
  var prefix = 'ERR-' + Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyMMdd') + '-';
  var lastRow = sheet.getLastRow();
  var max = 0;

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    ids.forEach(function (row) {
      var value = clean_(row[0]);
      if (value.indexOf(prefix) === 0) {
        var suffix = parseInt(value.slice(prefix.length), 10);
        if (!isNaN(suffix) && suffix > max) max = suffix;
      }
    });
  }

  return prefix + ('00' + (max + 1)).slice(-3);
}

/* ============================================================================
   GENERAL HELPERS
   ============================================================================ */
function getSpreadsheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('ไม่พบ Google Sheets ที่ผูกกับสคริปต์ กรุณาเปิดจาก Extensions > Apps Script ในไฟล์ Sheets');
  }
  return spreadsheet;
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u0000/g, '').trim();
}

function valueToText_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return clean_(value);
}

function normalizeDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
  var text = clean_(value);
  if (!text) return formatDate_(new Date());

  var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return iso[1] + '-' + ('0' + iso[2]).slice(-2) + '-' + ('0' + iso[3]).slice(-2);
  }

  var thai = text.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (thai) {
    var year = parseInt(thai[3], 10);
    if (year > 2400) year -= 543;
    return year + '-' + ('0' + thai[2]).slice(-2) + '-' + ('0' + thai[1]).slice(-2);
  }

  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return formatDate_(parsed);
  return formatDate_(new Date());
}

function formatDate_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function dateOffset_(days) {
  var date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate_(date);
}

function json_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
