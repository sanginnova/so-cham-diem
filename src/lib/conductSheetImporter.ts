import * as XLSX from 'xlsx';
import { Student, BehaviorType, DisciplineLog, BehaviorCategory, ClassConfig } from '../types';
import { removeVietnameseAccents } from './utils';

export interface ConductSheetStudentRow {
  stt: number;
  rawName: string;
  rank?: string;
  score: number | null;
  violationsRaw: string;
  bonusesRaw: string;
  matchedStudent?: Student;
  status: 'matched' | 'new_student' | 'error';
  parsedViolations: ParsedItemDetail[];
  parsedBonuses: ParsedItemDetail[];
}

export interface ParsedItemDetail {
  rawText: string;
  cleanName: string;
  score: number;
  count: number;
  matchedCategoryCode?: string;
  note?: string;
}

export interface ParsedConductSheet {
  sheetName: string;
  weekNumber: number;
  month: number;
  title: string;
  homeroomTeacher: string;
  className: string;
  students: ConductSheetStudentRow[];
  totalStudents: number;
  matchedCount: number;
  newStudentCount: number;
}

/**
 * Trích xuất số tuần và tháng từ tên sheet hoặc tiêu đề.
 * Ví dụ: "T3-T10" -> tuần 3, tháng 10; "Tuần 1/ Tháng 10" -> tuần 1, tháng 10
 */
export function extractWeekAndMonth(sheetName: string, titlePeriod?: string): { weekNumber: number; month: number } {
  // 1. Check titlePeriod first (e.g. "Tuần 1/ Tháng 10" or "Tuần 2 / Tháng 10")
  if (titlePeriod) {
    const periodMatch = titlePeriod.match(/Tuần\s*(\d+)[\s\/]+Tháng\s*(\d+)/i);
    if (periodMatch) {
      return {
        weekNumber: parseInt(periodMatch[1], 10),
        month: parseInt(periodMatch[2], 10),
      };
    }
  }

  // 2. Check sheetName (e.g. "T3-T10", "T1-T10", "T2-T10 ", "T4-T10")
  const sheetMatch = sheetName.trim().match(/T(\d+)\s*[-_]\s*T(\d+)/i);
  if (sheetMatch) {
    return {
      weekNumber: parseInt(sheetMatch[1], 10),
      month: parseInt(sheetMatch[2], 10),
    };
  }

  // 3. Fallback
  return { weekNumber: 1, month: 10 };
}

/**
 * Tách chuỗi danh sách mục theo dấu chấm phẩy (;), xuống dòng (\n, \r),
 * hoặc dấu phẩy (,) khi không phải dấu phẩy trong số thập phân (như 1,5 hoặc 0,5)
 */
export function splitItemText(text: string): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/(?:[;\n\r]+|(?<!\d),(?!\d))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '-');
}

/**
 * Tách các mục vi phạm từ chuỗi văn bản (ngăn cách bằng ;, xuống dòng, hoặc ,)
 * Đồng thời bóc tách điểm phạt nếu có trong ngoặc đơn, ví dụ "ngủ trong giờ (-3đ)", "mtt(-1đ)"
 */
export function parseViolationItems(text: string): ParsedItemDetail[] {
  if (!text || !text.trim()) return [];

  // Tách các mục theo dấu chấm phẩy, xuống dòng hoặc dấu phẩy
  const rawParts = splitItemText(text);

  return rawParts.map((raw) => {
    let clean = raw;
    let score = 1;
    let count = 1;

    // Tìm điểm trừ trong ngoặc: (-3đ), (-2 điểm), (-1đ), (-3)
    const scoreMatch = clean.match(/\(\s*[-–]?\s*(\d+(?:[.,]\d+)?)\s*(?:đ|điểm)?\s*\)/i);
    if (scoreMatch) {
      score = parseFloat(scoreMatch[1].replace(',', '.'));
      clean = clean.replace(scoreMatch[0], '').trim();
    }

    // Tìm số lần vi phạm: "2 lần", "3 lần", "01 lần", "02"
    const countMatch = clean.match(/(\d+)\s*lần/i);
    if (countMatch) {
      count = parseInt(countMatch[1], 10);
    } else {
      const numTailMatch = clean.match(/\b0?([1-9])\b$/);
      if (numTailMatch) {
        count = parseInt(numTailMatch[1], 10);
      }
    }

    return {
      rawText: raw,
      cleanName: clean,
      score: Math.abs(score),
      count: Math.max(1, count),
    };
  });
}

/**
 * Tách các mục điểm cộng từ chuỗi văn bản (ngăn cách bằng ;, xuống dòng, hoặc ,)
 * Đồng thời bóc tách điểm cộng nếu có trong ngoặc đơn: (+2 đ), (10 điểm địa), (+2đ)
 */
export function parseBonusItems(text: string): ParsedItemDetail[] {
  if (!text || !text.trim()) return [];

  const rawParts = splitItemText(text);

  return rawParts.map((raw) => {
    let clean = raw;
    let score = 1;
    let count = 1;

    // Điểm cộng trong ngoặc: (+2 đ), (+1 điểm), (+2đ)
    const bonusMatch = clean.match(/\(\s*\+?\s*(\d+(?:[.,]\d+)?)\s*(?:đ|điểm)?\s*\)/i);
    if (bonusMatch) {
      score = parseFloat(bonusMatch[1].replace(',', '.'));
      clean = clean.replace(bonusMatch[0], '').trim();
    } else if (clean.toLowerCase().includes('10 điểm') || clean.toLowerCase().includes('10 môn') || clean.toLowerCase().includes('10 đ') || clean.toLowerCase().startsWith('10 ') || clean.toLowerCase().startsWith('10đ')) {
      score = 2; // Điểm 10 hoa điểm 10 cộng 2đ
    } else if (clean.toLowerCase().includes('9 điểm') || clean.toLowerCase().includes('9đ') || clean.toLowerCase().startsWith('9 ')) {
      score = 1; // Điểm 9 cộng 1đ
    } else if (clean.toLowerCase().includes('tổ trưởng') || clean.toLowerCase().includes('lớp trưởng')) {
      score = 1; // Ban cán sự hoàn thành tốt nhiệm vụ
    } else if (clean.toLowerCase().includes('đi đủ') || clean.toLowerCase().includes('đi học đủ') || clean.toLowerCase().includes('đi học đầy đủ')) {
      score = 1; // Chuyên cần tuần
    }

    return {
      rawText: raw,
      cleanName: clean,
      score: Math.abs(score),
      count: Math.max(1, count),
    };
  });
}

/**
 * Đọc file Excel chấm điểm rèn luyện (theo mẫu D:\TOAN\CĐN01\12B4\12B4- Chấm điểm rèn luyện tháng 10.xlsx)
 */
export function parseConductWorkbook(
  workbook: XLSX.WorkBook,
  existingStudents: Student[]
): ParsedConductSheet[] {
  const result: ParsedConductSheet[] = [];

  // Tạo map tên học sinh để đối chiếu
  const studentMapByName = new Map<string, Student>();
  existingStudents.forEach((st) => {
    studentMapByName.set(removeVietnameseAccents(st.fullName.trim().toLowerCase()), st);
  });

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // Chuyển sang mảng 2D
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    if (rawData.length < 5) continue;

    let classTitle = '';
    let teacherName = '';
    let periodText = '';
    let headerRowIndex = -1;

    // Quét 6 dòng đầu để tìm tiêu đề
    for (let r = 0; r < Math.min(8, rawData.length); r++) {
      const row = rawData[r] || [];
      const rowText = row.map((c) => String(c || '').trim()).join(' ');

      if (rowText.includes('KẾT QUẢ RÈN LUYỆN')) {
        classTitle = rowText;
      }
      if (rowText.includes('GVCN:')) {
        const match = rowText.match(/GVCN:\s*([^;,\n]+)/i);
        if (match) teacherName = match[1].trim();
      }
      if (rowText.includes('Tuần') && rowText.includes('Tháng')) {
        const match = rowText.match(/Tuần\s*\d+[\s\/]+Tháng\s*\d+/i);
        if (match) periodText = match[0].trim();
      }

      // Nhận diện dòng tiêu đề cột
      const isHeaderRow = row.some((c) => {
        const s = removeVietnameseAccents(String(c || '').toLowerCase());
        return s === 'stt' || s === 'tt' || s === 'ho va ten' || s.includes('ren luyen');
      });

      if (isHeaderRow && row.some((c) => removeVietnameseAccents(String(c || '').toLowerCase()).includes('ho va ten') || removeVietnameseAccents(String(c || '').toLowerCase()) === 'ho ten')) {
        headerRowIndex = r;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: nếu dòng 4 (index 4) là header
      if (rawData.length > 4) headerRowIndex = 4;
      else continue;
    }

    // Bóc tách tên lớp từ tiêu đề (ví dụ "KẾT QUẢ RÈN LUYỆN LỚP 12B4" -> "12B4")
    let className = '';
    const classMatch = classTitle.match(/LỚP\s*([0-9A-Z]+)/i);
    if (classMatch) {
      className = classMatch[1].trim();
    } else {
      className = '12B4';
    }

    // Xác định cột
    const headerRow = rawData[headerRowIndex] || [];
    let colStt = 0;
    let colName = 1;
    let colRank = -1;
    let colScore = 2;
    let colViolations = 3;
    let colBonus = 4;

    headerRow.forEach((c, idx) => {
      const cleanHeader = removeVietnameseAccents(String(c || '').toLowerCase().trim());
      if (cleanHeader === 'stt' || cleanHeader === 'tt') colStt = idx;
      else if (cleanHeader.includes('ho va ten') || cleanHeader.includes('ho ten')) colName = idx;
      else if (cleanHeader.includes('xep loai')) colRank = idx;
      else if (cleanHeader.includes('ren luyen') || cleanHeader.includes('diem')) colScore = idx;
      else if (cleanHeader.includes('vi pham') || cleanHeader.includes('loi')) colViolations = idx;
      else if (cleanHeader.includes('cong') || cleanHeader.includes('khen')) colBonus = idx;
    });

    const { weekNumber, month } = extractWeekAndMonth(sheetName, periodText);

    const studentRows: ConductSheetStudentRow[] = [];
    let matchedCount = 0;
    let newStudentCount = 0;

    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r] || [];
      const rawName = String(row[colName] || '').trim();
      if (!rawName) continue;

      const rawStt = parseInt(String(row[colStt] || '').trim(), 10) || studentRows.length + 1;
      const rawScoreStr = String(row[colScore] || '').trim().replace(',', '.');
      const score = rawScoreStr && !isNaN(parseFloat(rawScoreStr)) ? parseFloat(rawScoreStr) : null;
      const rawViolations = String(row[colViolations] || '').trim();
      const rawBonuses = String(row[colBonus] || '').trim();
      const rawRank = colRank >= 0 ? String(row[colRank] || '').trim() : undefined;

      // Khớp học sinh
      const normName = removeVietnameseAccents(rawName.toLowerCase());
      const matched = studentMapByName.get(normName);

      if (matched) {
        matchedCount++;
      } else {
        newStudentCount++;
      }

      studentRows.push({
        stt: rawStt,
        rawName,
        rank: rawRank,
        score,
        violationsRaw: rawViolations,
        bonusesRaw: rawBonuses,
        matchedStudent: matched,
        status: matched ? 'matched' : 'new_student',
        parsedViolations: parseViolationItems(rawViolations),
        parsedBonuses: parseBonusItems(rawBonuses),
      });
    }

    if (studentRows.length > 0) {
      result.push({
        sheetName: sheetName.trim(),
        weekNumber,
        month,
        title: classTitle || `KẾT QUẢ RÈN LUYỆN LỚP ${className}`,
        homeroomTeacher: teacherName,
        className,
        students: studentRows,
        totalStudents: studentRows.length,
        matchedCount,
        newStudentCount,
      });
    }
  }

  return result;
}

export interface ParseConductTextOptions {
  weekNumber?: number;
  month?: number;
  className?: string;
  homeroomTeacher?: string;
}

/**
 * Phân tích dữ liệu bảng sao chép (copy & paste) từ Excel hoặc Google Sheets.
 * Hỗ trợ các trường hợp:
 * - Có dòng tiêu đề (STT | Họ và tên | Điểm rèn luyện | Lỗi vi phạm | Điểm cộng)
 * - Không có dòng tiêu đề (dán trực tiếp từ dòng học sinh số 1)
 * - Có hoặc không có cột STT
 * - Chứa tiêu đề lớp hoặc tuần tháng ở đầu
 */
export function parseConductPastedText(
  rawText: string,
  existingStudents: Student[],
  options?: ParseConductTextOptions
): ParsedConductSheet {
  const fallbackWeek = options?.weekNumber || 1;
  const fallbackMonth = options?.month || 10;
  const fallbackClass = options?.className || '12B4';
  const fallbackTeacher = options?.homeroomTeacher || '';

  // 1. Chuẩn hóa xuống dòng và tách dòng
  const rawLines = (rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      sheetName: `Dán từ Excel (Tuần ${fallbackWeek})`,
      weekNumber: fallbackWeek,
      month: fallbackMonth,
      title: `KẾT QUẢ RÈN LUYỆN LỚP ${fallbackClass}`,
      homeroomTeacher: fallbackTeacher,
      className: fallbackClass,
      students: [],
      totalStudents: 0,
      matchedCount: 0,
      newStudentCount: 0,
    };
  }

  // 2. Tìm kiếm thông tin tiêu đề (Lớp, Tuần, Tháng, GVCN) từ các dòng đầu nếu có
  let detectedTitle = '';
  let detectedTeacher = fallbackTeacher;
  let detectedWeek = fallbackWeek;
  let detectedMonth = fallbackMonth;
  let detectedClass = fallbackClass;
  let headerRowIndex = -1;

  for (let i = 0; i < Math.min(6, rawLines.length); i++) {
    const line = rawLines[i];
    const normLine = removeVietnameseAccents(line.toLowerCase());

    if (normLine.includes('ket qua ren luyen') || normLine.includes('so cham diem')) {
      detectedTitle = line;
      const classMatch = line.match(/LỚP\s*([0-9A-Z]+)/i);
      if (classMatch) detectedClass = classMatch[1].trim();
    }
    if (normLine.includes('gvcn:')) {
      const match = line.match(/GVCN:\s*([^;,\t\n]+)/i);
      if (match) detectedTeacher = match[1].trim();
    }
    if (normLine.includes('tuan') && normLine.includes('thang')) {
      const wm = extractWeekAndMonth('', line);
      detectedWeek = wm.weekNumber;
      detectedMonth = wm.month;
    }

    // Nhận diện dòng tiêu đề cột
    const cells = line.split('\t').map((c) => removeVietnameseAccents(c.trim().toLowerCase()));
    const hasNameCol = cells.some((c) => c === 'ho va ten' || c === 'ho ten' || c === 'ten' || c === 'ho va ten hoc sinh');
    const hasSttOrScoreOrViol = cells.some(
      (c) => c === 'stt' || c === 'tt' || c.includes('ren luyen') || c.includes('vi pham') || c.includes('loi') || c.includes('cong')
    );

    if (hasNameCol && hasSttOrScoreOrViol) {
      headerRowIndex = i;
      break;
    }
  }

  // 3. Xác định vị trí các cột
  let colStt = 0;
  let colName = 1;
  let colScore = 2;
  let colViolations = 3;
  let colBonus = 4;
  let colRank = -1;
  let startDataIndex = 0;

  if (headerRowIndex >= 0) {
    const headerCells = rawLines[headerRowIndex]
      .split('\t')
      .map((c) => removeVietnameseAccents(c.trim().toLowerCase()));
    startDataIndex = headerRowIndex + 1;

    headerCells.forEach((c, idx) => {
      if (c === 'stt' || c === 'tt') colStt = idx;
      else if (c.includes('ho va ten') || c === 'ho ten' || c === 'ten' || c.includes('ten hoc sinh')) colName = idx;
      else if (c.includes('xep loai') || c === 'xl') colRank = idx;
      else if (c.includes('ren luyen') || c === 'diem rl' || c === 'diem' || c.includes('diem ren luyen')) colScore = idx;
      else if (c.includes('vi pham') || c.includes('loi') || c.includes('khuyet diem')) colViolations = idx;
      else if (c.includes('cong') || c.includes('khen') || c.includes('thanh tich') || c.includes('diem cong')) colBonus = idx;
    });
  } else {
    // Không có dòng tiêu đề -> suy đoán cấu trúc từ dòng dữ liệu đầu tiên
    startDataIndex = 0;
    while (startDataIndex < rawLines.length && !rawLines[startDataIndex].includes('\t')) {
      startDataIndex++;
    }

    if (startDataIndex < rawLines.length) {
      const firstDataCells = rawLines[startDataIndex].split('\t');
      const firstCell = firstDataCells[0]?.trim() || '';
      const isFirstCellNumber = /^\d+$/.test(firstCell);

      if (isFirstCellNumber) {
        // Cấu trúc 5 cột: STT | Họ và tên | Điểm RL | Lỗi vi phạm | Điểm cộng
        colStt = 0;
        colName = 1;
        colScore = 2;
        colViolations = 3;
        colBonus = 4;
      } else {
        // Không có cột STT: Họ và tên | Điểm RL | Lỗi vi phạm | Điểm cộng
        colStt = -1;
        colName = 0;
        const secondCell = firstDataCells[1]?.trim().replace(',', '.') || '';
        const isSecondNumeric = secondCell !== '' && !isNaN(parseFloat(secondCell)) && parseFloat(secondCell) <= 20;

        if (isSecondNumeric) {
          colScore = 1;
          colViolations = 2;
          colBonus = 3;
        } else {
          colScore = -1;
          colViolations = 1;
          colBonus = 2;
        }
      }
    }
  }

  // 4. Map tên học sinh hiện có
  const studentMapByName = new Map<string, Student>();
  existingStudents.forEach((st) => {
    studentMapByName.set(removeVietnameseAccents(st.fullName.trim().toLowerCase()), st);
  });

  // 5. Duyệt từng dòng dữ liệu
  const studentRows: ConductSheetStudentRow[] = [];
  let matchedCount = 0;
  let newStudentCount = 0;

  for (let i = startDataIndex; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    const cells = line.split('\t');
    const rawName = cells[colName]?.trim() || '';

    // Bỏ qua nếu tên trống hoặc lặp lại tiêu đề
    if (!rawName) continue;
    const normName = removeVietnameseAccents(rawName.toLowerCase());
    if (normName === 'ho va ten' || normName === 'ho ten' || normName === 'stt' || normName === 'tt') continue;

    // STT
    let stt = studentRows.length + 1;
    if (colStt >= 0 && cells[colStt]) {
      const parsedStt = parseInt(cells[colStt].trim(), 10);
      if (!isNaN(parsedStt)) stt = parsedStt;
    }

    // Điểm rèn luyện
    let score: number | null = null;
    if (colScore >= 0 && cells[colScore] !== undefined) {
      const rawScoreStr = cells[colScore].trim().replace(',', '.');
      if (rawScoreStr && rawScoreStr !== '-' && rawScoreStr !== '—') {
        const parsedScore = parseFloat(rawScoreStr);
        if (!isNaN(parsedScore)) score = parsedScore;
      }
    }

    // Lỗi vi phạm
    const violationsRaw = colViolations >= 0 && cells[colViolations] ? cells[colViolations].trim() : '';

    // Điểm cộng
    const bonusesRaw = colBonus >= 0 && cells[colBonus] ? cells[colBonus].trim() : '';

    // Xếp loại
    const rank = colRank >= 0 && cells[colRank] ? cells[colRank].trim() : undefined;

    // Đối chiếu học sinh
    const matched = studentMapByName.get(normName);
    if (matched) {
      matchedCount++;
    } else {
      newStudentCount++;
    }

    studentRows.push({
      stt,
      rawName,
      rank,
      score,
      violationsRaw,
      bonusesRaw,
      matchedStudent: matched,
      status: matched ? 'matched' : 'new_student',
      parsedViolations: parseViolationItems(violationsRaw),
      parsedBonuses: parseBonusItems(bonusesRaw),
    });
  }

  return {
    sheetName: `Dán từ Excel (Tuần ${detectedWeek})`,
    weekNumber: detectedWeek,
    month: detectedMonth,
    title: detectedTitle || `KẾT QUẢ RÈN LUYỆN LỚP ${detectedClass}`,
    homeroomTeacher: detectedTeacher,
    className: detectedClass,
    students: studentRows,
    totalStudents: studentRows.length,
    matchedCount,
    newStudentCount,
  };
}

/**
 * Tạo danh sách nhật ký kỷ luật và điểm cộng từ kết quả parse để nhập vào hệ thống
 */
export function buildDisciplineLogsFromConductSheet(params: {
  parsedSheet: ParsedConductSheet;
  studentsMap: Map<string, Student>;
  targetWeekNumber: number;
  reporterName?: string;
  classConfig: ClassConfig;
  behaviorCategories: BehaviorCategory[];
}): Array<Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>> {
  const { parsedSheet, studentsMap, targetWeekNumber, reporterName, classConfig, behaviorCategories } = params;
  const newLogs: Array<Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>> = [];

  // Xác định ngày đại diện cho tuần
  const foundWeek = classConfig.weeks.find((w) => w.weekNumber === targetWeekNumber);
  const logDate = foundWeek ? foundWeek.startDate : new Date().toISOString().split('T')[0];
  const baseScore = classConfig.baseScore ?? 10;

  parsedSheet.students.forEach((row) => {
    const student = row.matchedStudent || studentsMap.get(removeVietnameseAccents(row.rawName.toLowerCase()));
    if (!student) return;

    // Phân bổ điểm cho các vi phạm để khớp chính xác điểm số row.score (nếu có trong bảng)
    let calculatedBonusTotal = 0;
    row.parsedBonuses.forEach((b) => {
      const normDesc = removeVietnameseAccents(b.cleanName.toLowerCase());
      if (!normDesc.includes('bo hoc') && !normDesc.includes('rut ho so') && !normDesc.includes('nam vien')) {
        calculatedBonusTotal += (b.score || 1) * (b.count || 1);
      }
    });

    const adjustedViolations = row.parsedViolations.map((v) => ({ ...v }));

    if (row.score !== null) {
      const targetDeduct = baseScore + calculatedBonusTotal - row.score;
      if (targetDeduct > 0 && adjustedViolations.length > 0) {
        const explicitDeductViols = adjustedViolations.filter((v) => /\(\s*[-–]?\s*\d/.test(v.rawText));
        const explicitDeductSum = explicitDeductViols.reduce((s, v) => s + v.score * v.count, 0);
        const remainingNeeded = targetDeduct - explicitDeductSum;

        const untaggedViols = adjustedViolations.filter((v) => !/\(\s*[-–]?\s*\d/.test(v.rawText));
        if (remainingNeeded > 0 && untaggedViols.length > 0) {
          const perItemScore = Math.round((remainingNeeded / untaggedViols.length) * 10) / 10;
          let allocated = 0;
          untaggedViols.forEach((uv, idx) => {
            if (idx === untaggedViols.length - 1) {
              uv.score = Math.max(0.5, Math.round((remainingNeeded - allocated) * 10) / 10);
            } else {
              uv.score = Math.max(0.5, perItemScore);
              allocated += uv.score;
            }
          });
        }
      }
    }

    // Trường hợp đặc biệt: Có điểm số row.score khác baseScore nhưng không có chuỗi vi phạm/thưởng cụ thể
    if (row.score !== null && adjustedViolations.length === 0 && row.parsedBonuses.length === 0) {
      if (row.score < baseScore) {
        newLogs.push({
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          month: parsedSheet.month || 10,
          weekNumber: targetWeekNumber,
          date: logDate,
          type: 'deduct',
          behaviorCode: 'L_OTHER',
          behaviorDescription: 'Điều chỉnh điểm rèn luyện theo Excel',
          scorePerUnit: Math.round((baseScore - row.score) * 10) / 10,
          count: 1,
          periodOrTime: 'Tuần ' + targetWeekNumber,
          reporter: reporterName || classConfig.homeroomTeacher || 'GVCN',
          basisOrRegulation: 'Sổ chấm điểm rèn luyện tuần',
          note: `Nhập từ mẫu Excel: ${parsedSheet.sheetName}`,
        });
      } else if (row.score > baseScore) {
        newLogs.push({
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          month: parsedSheet.month || 10,
          weekNumber: targetWeekNumber,
          date: logDate,
          type: 'bonus',
          behaviorCode: 'T_OTHER',
          behaviorDescription: 'Điểm cộng rèn luyện theo Excel',
          scorePerUnit: Math.round((row.score - baseScore) * 10) / 10,
          count: 1,
          periodOrTime: 'Tuần ' + targetWeekNumber,
          reporter: reporterName || classConfig.homeroomTeacher || 'GVCN',
          basisOrRegulation: 'Sổ chấm điểm rèn luyện tuần',
          note: `Nhập từ mẫu Excel: ${parsedSheet.sheetName}`,
        });
      }
    }

    // 1. Tạo nhật ký cho từng vi phạm
    adjustedViolations.forEach((viol) => {
      const normDesc = removeVietnameseAccents(viol.cleanName.toLowerCase());
      const matchedCat = behaviorCategories.find(
        (c) =>
          c.type === 'deduct' &&
          (normDesc.includes(removeVietnameseAccents(c.name.toLowerCase())) ||
            c.keywords?.some((k) => normDesc.includes(removeVietnameseAccents(k.toLowerCase()))))
      );

      const categoryCode = matchedCat ? matchedCat.code : 'L_OTHER';
      const scorePerUnit = viol.score || (matchedCat ? matchedCat.defaultScore : 1);

      newLogs.push({
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        month: parsedSheet.month || 10,
        weekNumber: targetWeekNumber,
        date: logDate,
        type: 'deduct',
        behaviorCode: categoryCode,
        behaviorDescription: viol.cleanName,
        scorePerUnit,
        count: viol.count,
        periodOrTime: 'Tuần ' + targetWeekNumber,
        reporter: reporterName || classConfig.homeroomTeacher || 'GVCN',
        basisOrRegulation: matchedCat?.basisOrRegulation || 'Sổ chấm điểm rèn luyện tuần',
        note: `Nhập từ mẫu Excel: ${parsedSheet.sheetName}`,
      });
    });

    // 2. Tạo nhật ký cho từng điểm cộng
    row.parsedBonuses.forEach((bonus) => {
      const normDesc = removeVietnameseAccents(bonus.cleanName.toLowerCase());

      // Bỏ qua nếu là ghi chú "bỏ học", "rút hồ sơ", "nằm viện"
      if (normDesc.includes('bo hoc') || normDesc.includes('rut ho so') || normDesc.includes('nam vien')) {
        return;
      }

      const matchedCat = behaviorCategories.find(
        (c) =>
          c.type === 'bonus' &&
          (normDesc.includes(removeVietnameseAccents(c.name.toLowerCase())) ||
            c.keywords?.some((k) => normDesc.includes(removeVietnameseAccents(k.toLowerCase()))))
      );

      const categoryCode = matchedCat ? matchedCat.code : 'T_OTHER';
      const scorePerUnit = bonus.score || (matchedCat ? matchedCat.defaultScore : 1);

      newLogs.push({
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        month: parsedSheet.month || 10,
        weekNumber: targetWeekNumber,
        date: logDate,
        type: 'bonus',
        behaviorCode: categoryCode,
        behaviorDescription: bonus.cleanName,
        scorePerUnit,
        count: bonus.count,
        periodOrTime: 'Tuần ' + targetWeekNumber,
        reporter: reporterName || classConfig.homeroomTeacher || 'GVCN',
        basisOrRegulation: matchedCat?.basisOrRegulation || 'Sổ chấm điểm rèn luyện tuần',
        note: `Nhập từ mẫu Excel: ${parsedSheet.sheetName}`,
      });
    });
  });

  return newLogs;
}
