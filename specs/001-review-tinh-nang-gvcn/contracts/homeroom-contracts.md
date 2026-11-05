# Interface Contracts: Phân Hệ Trợ Lý GVCN

**Feature**: `001-review-tinh-nang-gvcn` | **Date**: 2026-11-05

---

## 1. Engine Tự Động Điền Sổ (`homeroomAutoFill`)

```typescript
export interface AutoHomeroomNotesParams {
  students: Student[];
  disciplineLogs: DisciplineLog[];
  classConfig: ClassConfig;
  homeroomRecords?: HomeroomRecord[];
  getWeeklySummary?: (weekNumber: number, month?: number) => any[];
  getMonthlySummary?: (month: number) => any[];
  getSemesterSummary?: (semester: 1 | 2) => any[];
  existingNotes?: HomeroomBookNotes;
  overwrite?: boolean;
}

export function generateAutoHomeroomNotes(params: AutoHomeroomNotesParams): HomeroomBookNotes;
```

---

## 2. Trình Xuất Bản Sổ Chủ Nhiệm Word (`homeroomBookWordExport`)

```typescript
export interface HomeroomBookExportOptions {
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  schoolName?: string;
  department?: string;
  approverName?: string;
  scope?: 'all' | 'semester1' | 'semester2' | 'month';
  selectedMonth?: number;
  includeCover?: boolean;
  includeRegulations?: boolean;
  includeStudentList?: boolean;
  includeOrganization?: boolean;
  includeWeeklySummaries?: boolean;
  includeSemesterSummary?: boolean;
  includeStudentFollowUp?: boolean;
  classPresident?: string;
  academicVicePresident?: string;
  disciplineVicePresident?: string;
  parentRepresentativeHead?: string;
  parentRepresentativePhone?: string;
  students: Student[];
  classConfig: ClassConfig;
  logs: DisciplineLog[];
  notes?: HomeroomBookNotes;
  homeroomRecords?: HomeroomRecord[];
  getWeeklySummary: (weekNumber: number, month?: number) => StudentWeeklySummary[];
  getMonthlySummary?: (month: number) => StudentMonthlySummary[];
  getSemesterSummary?: (semester: 1 | 2) => StudentSemesterSummary[];
}

export function generateHomeroomBookBlob(options: HomeroomBookExportOptions): Promise<Blob>;
export function downloadHomeroomBook(options: HomeroomBookExportOptions): Promise<void>;
```
