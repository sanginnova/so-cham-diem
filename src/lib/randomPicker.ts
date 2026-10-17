import type { Student } from '../types';

export interface PickerHistoryEntry {
  studentId: string;
  studentCode: string;
  fullName: string;
  calledAt: string; // ISO
  actionTaken?: 'bonus_point' | 'grade_entered' | 'skipped' | 'none';
  detail?: string;
}

export interface RandomPickerFilterOptions {
  excludeCalled: boolean;
  excludeAbsent: boolean;
  prioritizeMissingScores: boolean;
}

/**
 * Lọc danh sách học sinh đủ điều kiện quay / rút thăm
 */
export function filterEligibleStudents(
  students: Student[],
  calledStudentIds: Set<string>,
  absentStudentIds: Set<string>,
  options: RandomPickerFilterOptions
): Student[] {
  return students.filter((s) => {
    // 1. Loại trừ học sinh đã gọi nếu bật tùy chọn
    if (options.excludeCalled && calledStudentIds.has(s.id)) {
      return false;
    }

    // 2. Loại trừ học sinh vắng nếu bật tùy chọn
    if (options.excludeAbsent && absentStudentIds.has(s.id)) {
      return false;
    }

    return true;
  });
}

/**
 * Tính trọng số quay cho học sinh (nếu bật chế độ ưu tiên học sinh chưa có điểm)
 */
export function calculateStudentWeights(
  eligibleStudents: Student[],
  scoreCounts: Record<string, number>, // studentId -> số lượng đầu điểm đã có
  prioritizeMissing: boolean
): number[] {
  if (!prioritizeMissing || eligibleStudents.length === 0) {
    return eligibleStudents.map(() => 1);
  }

  // Học sinh có ít đầu điểm hơn sẽ có trọng số cao hơn (ưu tiên được gọi)
  const counts = eligibleStudents.map((s) => scoreCounts[s.id] ?? 0);
  const maxScores = Math.max(...counts, 1);

  return eligibleStudents.map((s) => {
    const studentCount = scoreCounts[s.id] ?? 0;
    // Trọng số gấp từ 1x đến 4x cho các em chưa có điểm
    return Math.max(1, (maxScores - studentCount + 1) * 1.5);
  });
}

/**
 * Chọn ngẫu nhiên N học sinh theo trọng số (Weighted Random Sampling Without Replacement)
 */
export function pickRandomStudents(
  students: Student[],
  count: number,
  weights?: number[]
): Student[] {
  if (students.length === 0 || count <= 0) return [];
  const pickCount = Math.min(count, students.length);

  const pool = [...students];
  const poolWeights = weights ? [...weights] : pool.map(() => 1);
  const picked: Student[] = [];

  for (let step = 0; step < pickCount; step++) {
    const totalWeight = poolWeights.reduce((sum, w) => sum + w, 0);
    let randomVal = Math.random() * totalWeight;
    let selectedIdx = 0;

    for (let i = 0; i < pool.length; i++) {
      randomVal -= poolWeights[i];
      if (randomVal <= 0) {
        selectedIdx = i;
        break;
      }
    }

    picked.push(pool[selectedIdx]);
    pool.splice(selectedIdx, 1);
    poolWeights.splice(selectedIdx, 1);
  }

  return picked;
}

/**
 * Lưu & Đọc lịch sử gọi tên của buổi học từ LocalStorage
 */
export function getSessionPickerHistory(classId: string, date: string): PickerHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`random_picker_history_${classId}_${date}`);
    return raw ? (JSON.parse(raw) as PickerHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionPickerHistory(classId: string, date: string, history: PickerHistoryEntry[]): void {
  try {
    localStorage.setItem(`random_picker_history_${classId}_${date}`, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save picker history:', err);
  }
}

/**
 * Hiệu ứng âm thanh bằng Web Audio API (100% Native, Không cần file mp3, hoạt động offline)
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Âm thanh tiếng kim quay tíc-tắc
 */
export function playTickSound(enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Âm thanh chúc mừng / pháo hoa khi dừng lại trúng học sinh
 */
export function playWinnerFanfare(enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Arpeggio C5 - E5 - G5 - C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + index * 0.09;
      const duration = 0.25;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch {
    // Ignore audio errors
  }
}

/**
 * Bảng màu pastel cao cấp hiện đại cho các nan quạt của Vòng quay may mắn
 */
export const WHEEL_COLORS = [
  '#4f46e5', // Indigo 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#e11d48', // Rose 600
  '#7c3aed', // Violet 600
  '#0284c7', // Sky 600
  '#ea580c', // Orange 600
  '#0891b2', // Cyan 600
  '#65a30d', // Lime 600
  '#db2777', // Pink 600
  '#4338ca', // Indigo 700
  '#047857', // Emerald 700
];
