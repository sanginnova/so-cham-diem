import { Student } from '../types';
import { removeVietnameseAccents } from './utils';

export interface StudentMatchDetail {
  originalLine: string;
  matchedStudent: Student;
  matchedBy: 'code' | 'exact_name' | 'normalized_name' | 'fuzzy_name';
}

export interface BulkStudentMatchResult {
  matchedIds: string[];
  matchedStudents: Student[];
  details: StudentMatchDetail[];
  unmatchedLines: string[];
  totalParsedLines: number;
}

/**
 * Normalizes a string for comparison:
 * lowercase, trimmed, collapse internal multi-spaces.
 */
function normalizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Cleans a line copied from Excel/Word:
 * Removes leading bullet/index like "1.", "1 -", "1\t", "1)", "#1"
 */
function cleanLineToken(raw: string): string {
  return raw
    .trim()
    .replace(/^#?\d+[\.\-\/\)\:\t\s]+/, '')
    .trim();
}

/**
 * Matches a list of lines (from Excel column copy or text list)
 * against the class active students.
 */
export function matchStudentsFromBulkText(
  rawText: string,
  students: Student[]
): BulkStudentMatchResult {
  if (!rawText || !rawText.trim()) {
    return {
      matchedIds: [],
      matchedStudents: [],
      details: [],
      unmatchedLines: [],
      totalParsedLines: 0,
    };
  }

  // Filter only active students
  const activeStudents = students.filter((s) => s.status === 'active');

  // Pre-index active students for fast & exact matching
  const codeMap = new Map<string, Student>();
  const exactNameMap = new Map<string, Student>();
  const noAccentNameMap = new Map<string, Student>();

  for (const st of activeStudents) {
    if (st.studentCode) {
      codeMap.set(normalizeString(st.studentCode), st);
    }
    const cleanName = normalizeString(st.fullName);
    exactNameMap.set(cleanName, st);
    noAccentNameMap.set(removeVietnameseAccents(cleanName), st);
  }

  // Split lines: support newlines or comma/semicolon if on a single line
  let lines: string[] = [];
  if (rawText.includes('\n') || rawText.includes('\r')) {
    lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } else if (rawText.includes(',') || rawText.includes(';')) {
    lines = rawText
      .split(/[,;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } else {
    lines = [rawText.trim()];
  }

  const matchedSet = new Set<string>();
  const matchedStudents: Student[] = [];
  const details: StudentMatchDetail[] = [];
  const unmatchedLines: string[] = [];

  for (const line of lines) {
    // Check if header line (e.g. "Họ và tên", "STT", "Danh sách học sinh")
    const lowerLine = line.toLowerCase();
    if (
      lowerLine === 'họ và tên' ||
      lowerLine === 'ho va ten' ||
      lowerLine === 'họ tên' ||
      lowerLine === 'ho ten' ||
      lowerLine === 'stt' ||
      lowerLine === 'mã hs' ||
      lowerLine === 'ma hs' ||
      lowerLine === 'tên học sinh'
    ) {
      continue;
    }

    // Prepare candidate tokens from the line (e.g. if copied 2+ columns: STT \t Name)
    const tokens = line.split('\t').map((t) => t.trim()).filter(Boolean);
    const cleanedLine = cleanLineToken(line);

    const candidates: { str: string; isCleaned: boolean }[] = [
      { str: cleanedLine, isCleaned: true },
      { str: line.trim(), isCleaned: false },
    ];

    for (const t of tokens) {
      const cleanT = cleanLineToken(t);
      if (cleanT && cleanT !== cleanedLine) {
        candidates.push({ str: cleanT, isCleaned: true });
      }
      if (t !== line.trim()) {
        candidates.push({ str: t, isCleaned: false });
      }
    }

    let matched: Student | undefined;
    let matchedBy: StudentMatchDetail['matchedBy'] = 'exact_name';

    for (const cand of candidates) {
      const norm = normalizeString(cand.str);
      if (!norm) continue;

      // 1. Match by student code
      if (codeMap.has(norm)) {
        matched = codeMap.get(norm);
        matchedBy = 'code';
        break;
      }

      // 2. Match by exact full name
      if (exactNameMap.has(norm)) {
        matched = exactNameMap.get(norm);
        matchedBy = 'exact_name';
        break;
      }

      // 3. Match by accent-removed full name
      const noAccent = removeVietnameseAccents(norm);
      if (noAccentNameMap.has(noAccent)) {
        matched = noAccentNameMap.get(noAccent);
        matchedBy = 'normalized_name';
        break;
      }
    }

    // 4. Fuzzy fallback: check if candidate is contained within a student name or vice-versa
    if (!matched) {
      const cleanNorm = removeVietnameseAccents(normalizeString(cleanedLine));
      // Only do fuzzy if candidate has at least 4 characters to avoid false hits on initials/numbers
      if (cleanNorm.length >= 4) {
        matched = activeStudents.find((st) => {
          const stNoAccent = removeVietnameseAccents(normalizeString(st.fullName));
          return stNoAccent === cleanNorm || stNoAccent.includes(cleanNorm) || cleanNorm.includes(stNoAccent);
        });
        if (matched) {
          matchedBy = 'fuzzy_name';
        }
      }
    }

    if (matched) {
      if (!matchedSet.has(matched.id)) {
        matchedSet.add(matched.id);
        matchedStudents.push(matched);
      }
      details.push({
        originalLine: line,
        matchedStudent: matched,
        matchedBy,
      });
    } else {
      unmatchedLines.push(line);
    }
  }

  return {
    matchedIds: Array.from(matchedSet),
    matchedStudents,
    details,
    unmatchedLines,
    totalParsedLines: lines.length,
  };
}
