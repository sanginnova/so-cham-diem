import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { resolveLoginIdentifier } from '../lib/loginIdentifier';
import { planStudentImport } from '../lib/studentImport';
import { localDateString, validateLogNumbers } from '../lib/logValidation';
import { logsForWeek, targetDateForMovedWeek } from '../lib/weeklyPeriod';
import { isMonthlyBonus, monthBreakdown, weekBreakdown, sameLogEntry } from '../lib/scoreBreakdown';
import { currentSchoolYear, rowsForClass, schoolWeeksFrom, validateSchoolYear } from '../lib/classScope';
import { formatVietnameseDate } from '../lib/utils';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  Student,
  BehaviorCategory,
  DisciplineLog,
  ClassConfig,
  AchievementBonusRule,
  StudentWeeklySummary,
  StudentMonthlySummary,
  StudentSemesterSummary,
  EditHistoryEntry,
  UserRole,
  UserAccount,
  SchoolClass,
  PeriodLockStatus,
} from '../types';
import {
  auth,
  db,
  loginWithGoogle,
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  handleFirestoreError,
  OperationType,
  ensureFirebaseAuth,
  createManagedAuthUser,
  requestPasswordReset,
} from '../lib/firebase';
import {
  saveUserToCloud,
  getUserFromCloud,
  getAllUsersFromCloud,
  saveClassToCloud,
  getAllClassesFromCloud,
  saveClassConfigToCloud,
  getClassConfigFromCloud,
  saveStudentToCloud,
  deleteStudentFromCloud,
  getStudentsFromCloud,
  saveDisciplineLogToCloud,
  deleteDisciplineLogFromCloud,
  restoreDisciplineLogFromCloud,
  getDisciplineLogsFromCloud,
  saveBehaviorCategoryToCloud,
  getBehaviorCategoriesFromCloud,
  savePeriodLockToCloud,
  getPeriodLocksFromCloud,
} from '../lib/firestoreService';
import {
  INITIAL_CLASS_CONFIG,
  INITIAL_BEHAVIOR_CATEGORIES,
  INITIAL_STUDENTS,
  INITIAL_DISCIPLINE_LOGS,
  DEFAULT_ACHIEVEMENT_RULES,
  INITIAL_TEACHER_ID,
} from '../data/initialData';
import { scopeBackup } from '../lib/scopedBackup';
import { calculateRank, clampScore } from '../lib/utils';
import { calculateAttendanceStats, formatAttendanceBadgeText, formatAttendanceDetailText } from '../lib/attendanceStats';

interface AppContextType {
  workspaceClasses: ClassConfig[];
  selectWorkspaceClass: (id: string) => void;
  createWorkspaceClass: (name: string, year: string, start: string, ownerUid?: string) => Promise<void>;
  deleteWorkspaceClass: (classConfigId: string) => Promise<void>;
  currentUser: User | null;
  isAuthLoading: boolean;
  isLocalMode: boolean;
  setLocalMode: (val: boolean) => void;
  isCloudSyncing: boolean;
  cloudSyncError: string | null;
  isGoogleAuth: boolean;
  login: (fallbackEmail?: string) => Promise<void>;
  registerWithGoogle: (customClassName?: string, department?: string, fallbackEmail?: string) => Promise<void>;
  registerQuickOneTouch: (params: {
    displayName?: string;
    emailOrUsername?: string;
    className?: string;
    department?: string;
    phone?: string;
  }) => Promise<UserAccount>;
  loginAsGuest: () => void;
  registerWithEmailPassword: (params: {
    email: string;
    pass: string;
    name: string;
    className: string;
    department: string;
    phone?: string;
  }) => Promise<void>;
  loginUserWithEmailPassword: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  syncLocalToCloud: () => Promise<void>;

  // RBAC Roles & Accounts
  userRole: UserRole;
  activeAccount: UserAccount | null;
  userAccounts: UserAccount[];
  schoolClasses: SchoolClass[];
  lockedPeriods: PeriodLockStatus[];
  inspectorModeClass: SchoolClass | null;
  isPeriodLocked: (periodType: 'week' | 'month' | 'semester', periodValue: number) => boolean;
  loginAsRole: (role: UserRole, accountUid?: string) => void;
  switchAccount: (accountUid: string) => void;
  enterInspectorMode: (classItem: SchoolClass) => void;
  exitInspectorMode: () => void;
  switchWorkingClass: (classItem: SchoolClass) => void;
  toggleLockPeriod: (periodType: 'week' | 'month' | 'semester', periodValue: number, reason?: string) => Promise<boolean>;
  updateUserAccount: (uid: string, updates: Partial<UserAccount>) => void;
  resetUserPassword: (uid: string) => Promise<{ success: boolean; tempPass: string }>;
  toggleUserAccountStatus: (uid: string) => void;
  deleteUserAccount: (uid: string) => void;
  addUserAccount: (acc: Omit<UserAccount, 'uid' | 'lastLoginAt'>) => Promise<UserAccount>;
  createClassMonitorAccount: (params: {
    studentId?: string;
    fullName: string;
    username: string;
    password?: string;
    phone?: string;
    permissions?: {
      canAddViolations: boolean;
      canAddBonuses: boolean;
      canViewScores: boolean;
    };
  }) => Promise<UserAccount>;
  getClassMonitorAccount: (classId?: string) => UserAccount | undefined;
  toggleMonitorPermission: (uid: string, key: 'canAddViolations' | 'canAddBonuses' | 'canViewScores') => void;
  deleteSchoolClass: (classId: string) => Promise<void>;
  purgeOrphanedClasses: () => Promise<number>;
  addSchoolClass: (cls: SchoolClass) => Promise<void>;

  // Data
  classConfig: ClassConfig;
  students: Student[];
  behaviorCategories: BehaviorCategory[];
  disciplineLogs: DisciplineLog[];

  // Mutators
  updateClassConfig: (config: Partial<ClassConfig>) => Promise<void>;
  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>) => Promise<Student>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string, deleteRelatedLogs?: boolean) => Promise<void>;
  deleteStudentsBatch: (ids: string[], deleteRelatedLogs?: boolean) => Promise<{ count: number }>;
  toggleStudentStatus: (id: string) => Promise<void>;
  importStudentsBatch: (newStudents: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>>, onDuplicate?: 'update' | 'skip') => Promise<{ imported: number; updated: number }>;

  addBehaviorCategory: (cat: Omit<BehaviorCategory, 'id' | 'createdAt' | 'updatedAt' | 'teacherId'>) => Promise<BehaviorCategory>;
  updateBehaviorCategory: (id: string, updates: Partial<BehaviorCategory>) => Promise<void>;
  toggleBehaviorCategoryActive: (id: string) => Promise<void>;
  deleteBehaviorCategory: (id: string) => Promise<{ success: boolean; message?: string }>;
  resetBehaviorCategoriesToDefault: () => Promise<void>;

  // Achievement bonus rules & awards
  updateAchievementRule: (id: string, updates: Partial<AchievementBonusRule>) => Promise<void>;
  addAchievementRule: (rule: Omit<AchievementBonusRule, 'id'>) => Promise<AchievementBonusRule>;
  deleteAchievementRule: (id: string) => Promise<void>;
  resetAchievementRulesToDefault: () => Promise<void>;
  awardAchievementBonus: (params: {
    studentId: string;
    rule?: AchievementBonusRule;
    weekNumber?: number;
    month?: number;
    customScore?: number;
    customNote?: string;
  }) => Promise<{ log: DisciplineLog; alreadyAwarded?: boolean }>;
  batchAwardAchievementBonus: (params: {
    studentIds: string[];
    rule?: AchievementBonusRule;
    weekNumber?: number;
    month?: number;
    customScore?: number;
    customNote?: string;
  }) => Promise<{ awardedCount: number; skippedCount: number }>;
  revokeAchievementBonus: (logId: string) => Promise<void>;

  addDisciplineLog: (log: Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>) => Promise<{ log: DisciplineLog; duplicateWarning?: boolean }>;
  addBulkDisciplineLogs: (logs: Array<Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>>) => Promise<{ logs: DisciplineLog[] }>;
  updateDisciplineLog: (id: string, updates: Partial<DisciplineLog>, editorName: string) => Promise<void>;
  moveDisciplineLogToWeek: (id: string, targetWeekNumber: number, editorName?: string, customNote?: string) => Promise<void>;
  batchMoveDisciplineLogsToWeek: (logIds: string[], targetWeekNumber: number, editorName?: string, customNote?: string) => Promise<{ movedCount: number; errors: string[] }>;
  deleteDisciplineLog: (id: string, editorName: string) => Promise<void>;
  restoreDisciplineLog: (log: DisciplineLog) => Promise<void>;
  importDisciplineLogsBatch: (newLogs: Array<Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>>) => Promise<{ imported: number }>;

  // Calculated views
  getWeeklySummary: (weekNumber: number, month?: number) => StudentWeeklySummary[];
  getMonthlySummary: (month: number) => StudentMonthlySummary[];
  getSemesterSummary: (semester: 1 | 2) => StudentSemesterSummary[];
  getStudentLogs: (studentId: string) => DisciplineLog[];

  // Backup & Restore
  exportFullBackupJson: () => string;
  restoreFromJson: (jsonStr: string) => Promise<{ success: boolean; message: string; studentCount?: number; logCount?: number }>;
  resetToSampleData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'so_cham_diem_local_data_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false); // Always default to Cloud CSDL
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  const normalizeConfig = (config: ClassConfig): ClassConfig => ({
    ...config,
    maxScore: config.maxScore && config.maxScore > 10 ? config.maxScore : 100,
  });

  // Core collections in memory
  const [classConfig, applyClassConfig] = useState<ClassConfig>(() => normalizeConfig({ ...INITIAL_CLASS_CONFIG, id: '', teacherId: '', className: '', homeroomTeacher: '', teacherEmail: '', teacherPhone: '' }));
  const scopeRef = useRef(classConfig);
  const setClassConfig = (config: ClassConfig) => {
    const normalized = normalizeConfig(config);
    scopeRef.current = normalized;
    applyClassConfig(normalized);
  };
  const [students, applyStudents] = useState<Student[]>([]);
  const [behaviorCategories, applyCategories] = useState<BehaviorCategory[]>([]);
  const [disciplineLogs, applyLogs] = useState<DisciplineLog[]>([]);
  // Late Firebase writes from a previous class must never populate the new view.
  const setStudents: React.Dispatch<React.SetStateAction<Student[]>> = action => applyStudents(prev => rowsForClass(typeof action === 'function' ? action(prev) : action, scopeRef.current));
  const setBehaviorCategories: React.Dispatch<React.SetStateAction<BehaviorCategory[]>> = action => applyCategories(prev => {
    const loaded = rowsForClass(typeof action === 'function' ? action(prev) : action, scopeRef.current, true);
    if (!loaded.length) return INITIAL_BEHAVIOR_CATEGORIES;
    const currentCodes = new Set(loaded.map(c => c.code));
    const missing = INITIAL_BEHAVIOR_CATEGORIES.filter(c => !currentCodes.has(c.code)).map(c => ({
      ...c,
      id: `cat_${scopeRef.current.id}_${c.code}`,
      classId: scopeRef.current.id,
      teacherId: scopeRef.current.teacherId,
    }));
    return missing.length > 0 ? [...loaded, ...missing] : loaded;
  });
  const setDisciplineLogs: React.Dispatch<React.SetStateAction<DisciplineLog[]>> = action => applyLogs(prev => rowsForClass(typeof action === 'function' ? action(prev) : action, scopeRef.current));

  // Cloud profiles, never cached roles or passwords, determine access.
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [lockedPeriods, setLockedPeriods] = useState<PeriodLockStatus[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null);
  const [inspectorModeClass, setInspectorModeClass] = useState<SchoolClass | null>(null);
  const [workspaceClasses, setWorkspaceClasses] = useState<ClassConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const loadVersion = useRef(0);
  const clearSessionData = () => {
    loadVersion.current++;
    setActiveAccount(null); setUserRole('guest');
    setUserAccounts([]); setSchoolClasses([]); setLockedPeriods([]);
    setStudents([]); setDisciplineLogs([]); setBehaviorCategories([]);
    setClassConfig({ ...INITIAL_CLASS_CONFIG, id: '', teacherId: '', className: '', homeroomTeacher: '', teacherEmail: '', teacherPhone: '' });
    setInspectorModeClass(null);
    setSelectedConfigId(''); setWorkspaceClasses([]);
  };
  const loginAsRole = (role: UserRole, accountUid?: string) => {
    if (role === 'guest') { void logout(); return; }
    if (accountUid !== auth.currentUser?.uid || role !== activeAccount?.role) {
      alert('Vui lòng đăng xuất và đăng nhập bằng tài khoản cần sử dụng.');
    }
  };
  const switchAccount = (_accountUid: string) => {
    alert('Vui lòng đăng xuất và đăng nhập bằng tài khoản cần sử dụng.');
  };
  const isPeriodLocked = (periodType: 'week' | 'month' | 'semester', periodValue: number): boolean =>
    lockedPeriods.some((period) => (period.classId === classConfig.id || (!period.classId && classConfig.scopeVersion !== 2)) && period.periodType === periodType && period.periodValue === periodValue && period.isLocked);
  const scoreLock = (type: 'week' | 'month' | 'semester', value: number) => lockedPeriods.find(p => (p.classId === classConfig.id || (!p.classId && classConfig.scopeVersion !== 2)) && p.periodType === type && p.periodValue === value && p.isLocked);
  const legacyMonth = (month: number) => {
    const lock = scoreLock('month', month) || scoreLock('semester', classConfig.semester1Months.includes(month) ? 1 : 2);
    return (!!lock && lock.scoreVersion !== 2) || (classConfig.monthlyAverageFromMonth !== undefined && classConfig.months.indexOf(month) < classConfig.months.indexOf(classConfig.monthlyAverageFromMonth));
  };

  const enterInspectorMode = (classItem: SchoolClass) => {
    // Teachers are strictly restricted to their own homeroom class
    if (userRole === 'teacher') {
      console.warn('Giáo viên không có quyền thanh tra lớp học khác');
      return;
    }
    setStudents([]); setDisciplineLogs([]); setBehaviorCategories([]);
    setInspectorModeClass(classItem);
    setSelectedConfigId(''); setWorkspaceClasses([]);
  };

  const exitInspectorMode = () => {
    setInspectorModeClass(null);
    setSelectedConfigId(''); setWorkspaceClasses([]);
  };

  const switchWorkingClass = (classItem: SchoolClass) => {
    if (!['admin', 'owner'].includes(userRole)) return;
    enterInspectorMode(classItem);
  };

  const toggleLockPeriod = async (periodType: 'week' | 'month' | 'semester', periodValue: number, reason?: string) => {
    const classId = classConfig.scopeVersion === 2 ? classConfig.id : undefined;
    const old = lockedPeriods.find((item) => (item.classId || undefined) === classId && item.periodType === periodType && item.periodValue === periodValue);
    const next: PeriodLockStatus = { ...old, classId, periodType, periodValue, isLocked: !old?.isLocked,
      lockedAt: new Date().toISOString(), lockedBy: activeAccount?.displayName || '', reason: reason || old?.reason || '' };
    if (next.isLocked) {
      const summaries = periodType === 'week' ? getWeeklySummary(periodValue) : periodType === 'month' ? getMonthlySummary(periodValue) : getSemesterSummary(periodValue as 1 | 2);
      const review = summaries.map(s => `${s.fullName}: ${'finalScore' in s ? s.finalScore : s.averageScore}đ`).join('\n');
      if (!window.confirm(`Rà soát trước khi chốt ${periodType === 'week' ? 'tuần' : periodType === 'month' ? 'tháng' : 'học kỳ'} ${periodValue}\n${review}\n\nXác nhận đã kiểm tra lỗi, thưởng và điểm tổng kết?`)) return false;
      next.scoreVersion = 2;
      next.scores = Object.fromEntries(summaries.map(s => [s.studentId, 'finalScore' in s ? s.finalScore : s.averageScore]));
      if (periodType === 'semester') next.monthlyScores = Object.fromEntries((periodValue === 1 ? classConfig.semester1Months : classConfig.semester2Months).map(m => [m, Object.fromEntries(getMonthlySummary(m).map(s => [s.studentId, s.finalScore]))]));
    }
    try {
      await savePeriodLockToCloud(next);
      setLockedPeriods((prev) => [...prev.filter((item) => (item.classId || undefined) !== classId || item.periodType !== periodType || item.periodValue !== periodValue), next]);
      return true;
    } catch (error: any) { setCloudSyncError(error.message); alert('Không lưu được khóa sổ: ' + error.message); return false; }
  };

  const updateUserAccount = async (uid: string, updates: Partial<UserAccount>) => {
    const existing = userAccounts.find((account) => account.uid === uid);
    if (!existing) throw new Error('Không tìm thấy tài khoản.');
    const next = { ...existing, ...updates };
    try {
      await saveUserToCloud(next);
      setUserAccounts((prev) => prev.map((account) => account.uid === uid ? next : account));
      if (activeAccount?.uid === uid) setActiveAccount(next);
    } catch (error: any) { setCloudSyncError(error.message); alert('Không lưu được tài khoản: ' + error.message); }
  };

  const resetUserPassword = async (uid: string): Promise<{ success: boolean; tempPass: string }> => {
    const account = userAccounts.find((item) => item.uid === uid);
    if (!account) throw new Error('Không tìm thấy tài khoản.');
    await requestPasswordReset(account.email);
    return { success: true, tempPass: 'Đã gửi email đặt lại mật khẩu.' };
  };

  const toggleUserAccountStatus = (uid: string) => {
    const account = userAccounts.find((item) => item.uid === uid);
    if (account) void updateUserAccount(uid, { isActive: !account.isActive });
  };

  // Helper: Kiểm tra xem một lớp học có gắn liền với bất kỳ tài khoản GVCN nào còn tồn tại hay không
  const isClassTiedToTeacher = (cls: SchoolClass, users: UserAccount[]): boolean => {
    return users.some((u) => {
      if (u.assignedClassId && u.assignedClassId === cls.id) return true;
      if (cls.teacherId && u.uid === cls.teacherId) return true;
      if (cls.teacherEmail && u.email && cls.teacherEmail.toLowerCase() === u.email.toLowerCase()) return true;
      if (u.assignedClassName && cls.className) {
        const cleanUserClass = u.assignedClassName.toLowerCase().replace(/^lớp\s+/i, '').trim();
        const cleanSchoolClass = cls.className.toLowerCase().replace(/^lớp\s+/i, '').trim();
        if (cleanUserClass === cleanSchoolClass) return true;
      }
      return false;
    });
  };

  const addSchoolClass = async (cls: SchoolClass) => {
    await saveClassToCloud(cls);
    setSchoolClasses(prev => [...prev.filter(item => item.id !== cls.id), cls]);
  };

  const deleteSchoolClass = async (classId: string) => {
    await deleteDoc(doc(db, 'classes', classId));
    setSchoolClasses(prev => prev.filter(item => item.id !== classId));
  };

  const purgeOrphanedClasses = async (): Promise<number> => {
    const orphaned = schoolClasses.filter(cls => !isClassTiedToTeacher(cls, userAccounts));
    for (const cls of orphaned) await deleteSchoolClass(cls.id);
    return orphaned.length;
  };
  // Revoke access while preserving account tombstones and class history.
  const deleteUserAccount = (uid: string) => { void updateUserAccount(uid, { isActive: false }); };

  const addUserAccount = async (acc: Omit<UserAccount, 'uid' | 'lastLoginAt'>): Promise<UserAccount> => {
    if (!['admin', 'owner'].includes(activeAccount?.role || '')) throw new Error('Chỉ quản trị viên được tạo tài khoản giáo viên.');
    const uid = await createManagedAuthUser(acc.email.trim().toLowerCase(), acc.password || '', acc.displayName);
    const { password: _password, ...profile } = acc;
    const classId = `cls_${uid}`;
    const newAcc: UserAccount = { ...profile, uid, assignedClassId: classId, lastLoginAt: new Date().toISOString() };
    await saveUserToCloud(newAcc);
    await saveClassToCloud({ id: classId, className: acc.assignedClassName || 'Lớp chủ nhiệm', teacherId: uid,
      teacherName: acc.displayName, teacherEmail: acc.email, department: acc.department || '',
      schoolYear: INITIAL_CLASS_CONFIG.schoolYear, studentCount: 0, averageScore: 0, topRankCount: 0, violationCount: 0 });
    setUserAccounts((prev) => [...prev.filter((item) => item.uid !== uid), newAcc]);
    return newAcc;
  };

  const getClassMonitorAccount = (classId?: string): UserAccount | undefined => {
    const targetClassId = classId || classConfig.classDirectoryId || activeAccount?.assignedClassId || classConfig.id;
    return userAccounts.find(
      (a) => a.role === 'monitor' && a.assignedClassId === targetClassId
    );
  };

  const createClassMonitorAccount = async (params: {
    studentId?: string;
    fullName: string;
    username: string;
    password?: string;
    phone?: string;
    permissions?: {
      canAddViolations: boolean;
      canAddBonuses: boolean;
      canViewScores: boolean;
    };
  }): Promise<UserAccount> => {
    await ensureFirebaseAuth();
    const classId = classConfig.classDirectoryId || activeAccount?.assignedClassId || classConfig.id;
    const className = classConfig.className;

    // Check if monitor account for this class already exists
    const existingIndex = userAccounts.findIndex(
      (a) => a.role === 'monitor' && a.assignedClassId === classId
    );

    if (existingIndex >= 0) {
      const existing = userAccounts[existingIndex];
      const next = { ...existing, classConfigId: classConfig.id, displayName: params.fullName, phone: params.phone || '', permissions: params.permissions || existing.permissions };
      await saveUserToCloud(next);
      setUserAccounts((prev) => prev.map((item) => item.uid === next.uid ? next : item));
      return next;
    }
    if (!params.username.includes('@')) throw new Error('Vui lòng nhập email thực của lớp trưởng.');
    const email = params.username.trim().toLowerCase();
    const uid = await createManagedAuthUser(email, params.password || '', params.fullName);
    const newMonitorAccount: UserAccount = {
      uid,
      teacherId: getEffectiveTeacherId(),
      classConfigId: classConfig.id,
      email,
      username: params.username,
      displayName: params.fullName,
      role: 'monitor',
      assignedClassId: classId,
      assignedClassName: className,
      department: (activeAccount?.department) || 'Khoa Chuyên Môn',
      phone: params.phone || '',
      isActive: true,
      lastLoginAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      studentId: params.studentId,
      permissions: params.permissions || {
        canAddViolations: true,
        canAddBonuses: true,
        canViewScores: true,
      },
    };

    await saveUserToCloud(newMonitorAccount);
    setUserAccounts((prev) => [...prev, newMonitorAccount]);
    if (params.fullName) await updateClassConfig({ classPresident: params.fullName });

    return newMonitorAccount;
  };

  const toggleMonitorPermission = (uid: string, key: 'canAddViolations' | 'canAddBonuses' | 'canViewScores') => {
    const account = userAccounts.find((item) => item.uid === uid);
    if (!account) return;
    const permissions = account.permissions || { canAddViolations: false, canAddBonuses: false, canViewScores: false };
    void updateUserAccount(uid, { permissions: { ...permissions, [key]: !permissions[key] } });
  };

  // Firebase Auth is the only source of the signed-in identity.
  useEffect(() => {
    let disposed = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearSessionData();
      setCurrentUser(user && !user.isAnonymous ? user : null);
      setIsAuthLoading(true);
      try {
        if (user && !user.isAnonymous) {
          const profile = await getUserFromCloud(user.uid);
          if (disposed || auth.currentUser?.uid !== user.uid) return;
          if (profile?.isActive) {
            setActiveAccount(profile); setUserRole(profile.role);
            await loadUserDataFromFirestore(user.uid, profile);
          }
        }
      } catch (error: any) {
        if (!disposed) setCloudSyncError(error.message || 'Không thể tải tài khoản.');
      } finally {
        if (!disposed) { setIsAuthLoading(false); setIsLocalMode(false); }
      }
    });
    return () => { disposed = true; loadVersion.current++; unsubscribe(); };
  }, []);

  // Live data stays scoped to the authenticated account, including profile revocation.
  const selectWorkspaceClass = (id: string) => {
    const target = workspaceClasses.find(config => config.id === id);
    if (!target) throw new Error('Lớp không thuộc tài khoản đang sử dụng.');
    loadVersion.current++;
    setStudents([]); setDisciplineLogs([]); setBehaviorCategories([]);
    setClassConfig(target); setSelectedConfigId(id);
  };

  const createWorkspaceClass = async (name: string, year: string, start: string, ownerUid?: string) => {
    if (!activeAccount || activeAccount.role === 'monitor' || inspectorModeClass) throw new Error('Không có quyền tạo lớp ở chế độ hiện tại.');
    const schoolYear = validateSchoolYear(year);
    if (!name.trim()) throw new Error('Vui lòng nhập tên lớp.');
    if (workspaceClasses.some(config => config.className.toLowerCase() === name.trim().toLowerCase() && config.schoolYear.replace(/\s/g, '').replace('–', '-') === schoolYear)) throw new Error('Lớp trong niên khóa này đã tồn tại.');
    const weeks = schoolWeeksFrom(start);
    if (Number(start.slice(0, 4)) !== Number(schoolYear.slice(0, 4))) throw new Error('Ngày bắt đầu phải thuộc năm đầu của niên khóa.');
    const owner = ownerUid && ownerUid !== activeAccount.uid
      ? (['admin', 'owner'].includes(activeAccount.role) ? userAccounts.find(account => account.uid === ownerUid && account.isActive && account.role !== 'monitor') : undefined)
      : activeAccount;
    if (!owner) throw new Error('Giáo viên không hợp lệ hoặc không có quyền giao lớp.');
    const teacherId = owner.uid;
    const directoryId = `cls_${crypto.randomUUID()}`;
    const id = `cfg_${directoryId}`;
    const config: ClassConfig = { ...classConfig, id, classDirectoryId: directoryId, scopeVersion: 2, teacherId,
      className: name.trim(), schoolYear, weeks, homeroomTeacher: owner.displayName,
      teacherEmail: owner.email, teacherPhone: owner.phone || '',
      classPresident: '', academicVicePresident: '', disciplineVicePresident: '', youthUnionSecretary: '', updatedAt: new Date().toISOString() };
    const source = behaviorCategories.length ? behaviorCategories : INITIAL_BEHAVIOR_CATEGORIES;
    const categories = source.map(category => ({ ...category, id: `cat_${id}_${crypto.randomUUID()}`, classId: id, teacherId }));
    const batch = writeBatch(db);
    batch.set(doc(db, 'classConfigs', id), config);
    const directory: SchoolClass = { id: directoryId, className: config.className, schoolYear, teacherId,
      teacherName: owner.displayName, teacherEmail: owner.email, department: owner.department || '', studentCount: 0, averageScore: config.baseScore, topRankCount: 0, violationCount: 0 };
    batch.set(doc(db, 'classes', directoryId), directory);
    categories.forEach(category => batch.set(doc(db, 'behaviorCategories', category.id), category));
    await batch.commit();
    if (auth.currentUser?.uid !== activeAccount.uid) return;
    if (owner.uid !== activeAccount.uid) setInspectorModeClass(directory);
    loadVersion.current++;
    setStudents([]); setDisciplineLogs([]); setBehaviorCategories(categories);
    setWorkspaceClasses(prev => [...prev.filter(item => item.id !== id), config]);
    setClassConfig(config); setSelectedConfigId(id);
  };

  const deleteWorkspaceClass = async (configId: string) => {
    if (!activeAccount || activeAccount.role === 'monitor' || inspectorModeClass) {
      throw new Error('Bạn không có quyền xóa lớp học ở chế độ này.');
    }
    const targetConfig = workspaceClasses.find((c) => c.id === configId);
    if (!targetConfig) throw new Error('Không tìm thấy lớp học cần xóa.');

    if (
      targetConfig.teacherId &&
      targetConfig.teacherId !== activeAccount.uid &&
      !['admin', 'owner'].includes(activeAccount.role)
    ) {
      throw new Error('Bạn chỉ có quyền xóa lớp do chính mình quản lý.');
    }

    const remainingClasses = workspaceClasses.filter((c) => c.id !== configId);
    if (remainingClasses.length === 0) {
      throw new Error('Không thể xóa lớp duy nhất. Hệ thống cần duy trì ít nhất một lớp học (hãy tạo lớp mới trước khi xóa lớp này).');
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, 'classConfigs', configId));

    const directoryId = targetConfig.classDirectoryId || (targetConfig.id.startsWith('cfg_') ? targetConfig.id.slice(4) : targetConfig.id);
    batch.delete(doc(db, 'classes', directoryId));

    try {
      const [studentsSnap, logsSnap, catsSnap, monitorsSnap] = await Promise.all([
        getDocs(query(collection(db, 'students'), where('classId', '==', configId))),
        getDocs(query(collection(db, 'disciplineLogs'), where('classId', '==', configId))),
        getDocs(query(collection(db, 'behaviorCategories'), where('classId', '==', configId))),
        getDocs(query(collection(db, 'users'), where('classConfigId', '==', configId))),
      ]);

      studentsSnap.docs.forEach((d) => batch.delete(d.ref));
      logsSnap.docs.forEach((d) => batch.delete(d.ref));
      catsSnap.docs.forEach((d) => batch.delete(d.ref));
      monitorsSnap.docs.forEach((d) => batch.update(d.ref, { isActive: false, classConfigId: '' }));

      await batch.commit();
    } catch (err) {
      console.warn('Batch delete sub-collections warning:', err);
      try {
        await deleteDoc(doc(db, 'classConfigs', configId));
        await deleteDoc(doc(db, 'classes', directoryId));
      } catch (e) {
        throw err;
      }
    }

    setSchoolClasses((prev) => prev.filter((item) => item.id !== directoryId && item.id !== configId));
    loadVersion.current++;
    setWorkspaceClasses(remainingClasses);

    if (classConfig.id === configId || selectedConfigId === configId) {
      const nextConfig = remainingClasses[0];
      setClassConfig(nextConfig);
      setSelectedConfigId(nextConfig.id);
      setStudents([]);
      setDisciplineLogs([]);
      setBehaviorCategories([]);
    }
  };

  useEffect(() => {
    if (!currentUser || !activeAccount || currentUser.uid !== activeAccount.uid) return;
    const teacherId = activeAccount.role === 'monitor' ? activeAccount.teacherId : (inspectorModeClass?.teacherId || activeAccount.uid);
    if (!teacherId) return;
    let disposed = false;
    const stops: Array<() => void> = [];
    const onError = (error: Error) => { if (!disposed) setCloudSyncError(error.message); };
    stops.push(onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (disposed) return;
      const profile = snap.data() as UserAccount | undefined;
      if (!profile?.isActive) { clearSessionData(); void logoutUser(); return; }
      setActiveAccount(profile); setUserRole(profile.role);
    }, onError));
    const subscribe = (name: string, apply: (rows: any[]) => void) => {
      const source = activeAccount.role === 'monitor' && ['students', 'disciplineLogs'].includes(name)
        ? query(collection(db, name), where('teacherId', '==', teacherId), where('classId', '==', selectedConfigId || classConfig.id))
        : query(collection(db, name), where('teacherId', '==', teacherId));
      stops.push(onSnapshot(source,
        (snap) => { if (!disposed) apply(snap.docs.map((item) => item.data())); }, onError));
    };
    const scopeId = selectedConfigId || classConfig.id;
    subscribe('classConfigs', (rows: ClassConfig[]) => {
      const visible = activeAccount.role === 'monitor'
        ? rows.filter(config => config.id === activeAccount.classConfigId || (!activeAccount.classConfigId && config.scopeVersion !== 2))
        : rows;
      setWorkspaceClasses(visible);
      const selected = visible.find(config => config.id === scopeId)
        || visible.find(config => config.classDirectoryId === inspectorModeClass?.id)
        || visible.find(config => config.scopeVersion !== 2) || visible[0];
      if (selected) { setClassConfig(selected); if (selected.id !== selectedConfigId) setSelectedConfigId(selected.id); }
    });
    subscribe('students', rows => { if (classConfig.id === scopeId) setStudents(rowsForClass(rows, classConfig)); });
    stops.push(onSnapshot(collection(db, 'periodLocks'), (snap) => { if (!disposed) setLockedPeriods(snap.docs.map((item) => item.data() as PeriodLockStatus)); }, onError));
    const classSource = ['admin', 'owner'].includes(activeAccount.role) ? collection(db, 'classes')
      : query(collection(db, 'classes'), where('teacherId', '==', teacherId));
    stops.push(onSnapshot(classSource, (snap) => { if (!disposed) setSchoolClasses(snap.docs.map((item) => item.data() as SchoolClass)); }, onError));
    if (activeAccount.role !== 'monitor') {
      const userSource = ['admin', 'owner'].includes(activeAccount.role) ? collection(db, 'users')
        : query(collection(db, 'users'), where('teacherId', '==', activeAccount.uid), where('role', '==', 'monitor'));
      stops.push(onSnapshot(userSource, (snap) => { if (!disposed) {
        const profiles = snap.docs.map((item) => item.data() as UserAccount);
        setUserAccounts(['admin', 'owner'].includes(activeAccount.role) ? profiles : [activeAccount, ...profiles]);
      } }, onError));
    }
    subscribe('behaviorCategories', rows => { if (classConfig.id === scopeId) setBehaviorCategories(rowsForClass(rows, classConfig, true)); });
    if (activeAccount.role !== 'monitor' || activeAccount.permissions?.canViewScores) subscribe('disciplineLogs', rows => { if (classConfig.id === scopeId) setDisciplineLogs(rowsForClass(rows, classConfig)); });
    else setDisciplineLogs([]);
    return () => { disposed = true; stops.forEach((stop) => stop()); };
  }, [currentUser?.uid, activeAccount?.uid, activeAccount?.role, activeAccount?.teacherId, activeAccount?.classConfigId, activeAccount?.permissions?.canViewScores, inspectorModeClass?.teacherId, inspectorModeClass?.id, selectedConfigId, classConfig.id]);

  const isGoogleAuth = !!(
    currentUser &&
    !currentUser.isAnonymous &&
    currentUser.providerData?.some((p) => p.providerId === 'google.com')
  );

  const getEffectiveTeacherId = (): string => {
    if (!auth.currentUser || auth.currentUser.isAnonymous || !activeAccount?.isActive) throw new Error('Vui lòng đăng nhập trước khi lưu dữ liệu.');
    return activeAccount.role === 'monitor' ? activeAccount.teacherId! : (inspectorModeClass?.teacherId || activeAccount.uid);
  };

  const loadUserDataFromFirestore = async (userId: string, accountObj?: UserAccount) => {
    const version = ++loadVersion.current;
    setIsCloudSyncing(true); setCloudSyncError(null);
    setStudents([]); setDisciplineLogs([]); setBehaviorCategories([]);
    try {
      const account = accountObj || await getUserFromCloud(userId);
      if (!account?.isActive) throw new Error('Tài khoản chưa được cấp quyền hoặc đã bị khóa.');
      const teacherId = account.role === 'monitor' ? account.teacherId : userId;
      if (!teacherId) throw new Error('Tài khoản lớp trưởng chưa được gán giáo viên.');
      const legacyConfig = await getClassConfigFromCloud(teacherId);
      const config = account.role === 'monitor' && account.classConfigId ? (await getDoc(doc(db, 'classConfigs', account.classConfigId))).data() as ClassConfig : legacyConfig;
      const monitorClassId = account.role === 'monitor' ? config?.id : undefined;
      if (account.role === 'monitor' && !monitorClassId) throw new Error('Lớp trưởng chưa được gán lớp.');
      const [studentsData, categories, logs, accounts, classes, locks] = await Promise.all([
        getStudentsFromCloud(teacherId, monitorClassId),
        getBehaviorCategoriesFromCloud(teacherId),
        account.role === 'monitor' && !account.permissions?.canViewScores ? Promise.resolve([]) : getDisciplineLogsFromCloud(teacherId, monitorClassId),
        getAllUsersFromCloud(), getAllClassesFromCloud(), getPeriodLocksFromCloud(),
      ]);
      if (version !== loadVersion.current || auth.currentUser?.uid !== userId) return;
      let nextConfig = config;
      if (!nextConfig && account.role !== 'monitor') {
        nextConfig = { ...INITIAL_CLASS_CONFIG, id: `cfg_${userId}`, teacherId: userId,
          className: account.assignedClassName || 'Lớp chủ nhiệm', homeroomTeacher: account.displayName,
          teacherEmail: account.email, teacherPhone: account.phone || '' };
        await saveClassConfigToCloud(nextConfig);
      }
      let nextCategories = categories;
      if (!nextCategories.length && account.role !== 'monitor') {
        nextCategories = INITIAL_BEHAVIOR_CATEGORIES.map((category) => ({ ...category, id: `cat_${userId}_${category.code}`, teacherId: userId }));
        await Promise.all(nextCategories.map(saveBehaviorCategoryToCloud));
      }
      if (version !== loadVersion.current || auth.currentUser?.uid !== userId) return;
      if (nextConfig) setClassConfig(nextConfig);
      if (nextConfig) { setSelectedConfigId(nextConfig.id); setStudents(rowsForClass(studentsData, nextConfig)); setDisciplineLogs(rowsForClass(logs, nextConfig)); setBehaviorCategories(rowsForClass(nextCategories, nextConfig, true)); }
      setUserAccounts(accounts); setSchoolClasses(classes); setLockedPeriods(locks);
    } catch (error: any) {
      if (version === loadVersion.current) setCloudSyncError(error.message || 'Không thể đồng bộ từ Firestore');
      throw error;
    } finally {
      if (version === loadVersion.current) setIsCloudSyncing(false);
    }
  };

  const registerQuickOneTouch = async (_params: { displayName?: string; emailOrUsername?: string; className?: string; department?: string; phone?: string }): Promise<UserAccount> => {
    await login();
    const account = await getUserFromCloud(auth.currentUser!.uid);
    if (!account) throw new Error('Không thể tải tài khoản.');
    return account;
  };

  const login = async () => {
    setIsCloudSyncing(true);
    let user: User | null = null;
    try {
      user = await loginWithGoogle();
    } catch (err: any) {
      setIsCloudSyncing(false);
      console.warn('Google login error detail:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        throw new Error(
          'Tên miền này chưa được cấp phép trong Firebase Console (auth/unauthorized-domain). Quản trị viên vui lòng thêm tên miền này vào mục Authentication > Settings > Authorized domains trên Firebase Console, hoặc thầy cô vui lòng đăng nhập bằng Tên đăng nhập & Mật khẩu.'
        );
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        throw new Error(
          'Trình duyệt đã chặn cửa sổ đăng nhập Google (Pop-up). Thầy cô vui lòng cho phép pop-up trên trình duyệt hoặc đăng nhập bằng Tên đăng nhập & Mật khẩu.'
        );
      } else if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.');
      }
      throw err;
    }

    try {
      let acc = await getUserFromCloud(user.uid);
      if (!acc) {
        const teacherId = user.uid;
        const classId = `cls_${Date.now()}`;
        const autoClassName = 'Điện CN K45';
        const newClass: SchoolClass = {
          id: classId,
          className: autoClassName,
          teacherId,
          teacherName: user.displayName || 'Giáo viên',
          teacherEmail: user.email || '',
          department: 'Khoa Chuyên ngành',
          schoolYear: currentSchoolYear(),
          studentCount: 0,
          averageScore: 10.0,
          topRankCount: 0,
          violationCount: 0,
        };

          acc = {
          uid: teacherId,
          email: user.email || '',
          username: user.email ? user.email.split('@')[0] : 'user',
          displayName: user.displayName || 'Giáo viên',
          role: 'teacher',
          authProvider: 'google',
          assignedClassId: classId,
          assignedClassName: `Lớp ${autoClassName}`,
          department: 'Khoa Chuyên ngành',
          phone: user.phoneNumber || '',
          isActive: true,
          lastLoginAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          avatarUrl: user.photoURL || '',
        };

        await saveUserToCloud(acc);
        await saveClassToCloud(newClass);

        const newConfig: ClassConfig = {
          ...INITIAL_CLASS_CONFIG,
          id: `cfg_${classId}`,
          className: autoClassName,
          homeroomTeacher: user.displayName || 'Giáo viên',
          teacherEmail: user.email || '',
          teacherPhone: user.phoneNumber || '',
          teacherId,
        };
        await saveClassConfigToCloud(newConfig);

        setUserAccounts((prev) => [...prev, acc!]);
        setSchoolClasses((prev) => [...prev, newClass]);
        setClassConfig(newConfig);
      } else {
        acc = { ...acc, authProvider: 'google' };
      }

      if (!acc.isActive) { await logoutUser(); throw new Error('Tài khoản đã bị khóa.'); }

      setActiveAccount(acc);
      setUserRole(acc.role);
      setIsLocalMode(false);
      await loadUserDataFromFirestore(user.uid, acc);
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const registerWithGoogle = async (customClassName?: string, department?: string) => {
    setIsCloudSyncing(true);
    let user: User | null = null;
    try {
      user = await loginWithGoogle();
    } catch (err: any) {
      setIsCloudSyncing(false);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        throw new Error(
          'Tên miền hiện tại chưa được cấp quyền Google OAuth trong Firebase Console (auth/unauthorized-domain). Thầy cô vui lòng sử dụng biểu mẫu Đăng ký bằng Tên đăng nhập & Mật khẩu bên dưới!'
        );
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        throw new Error(
          'Trình duyệt đã chặn cửa sổ đăng nhập Google. Thầy cô vui lòng cho phép pop-up hoặc đăng ký bằng Mật khẩu bên dưới.'
        );
      }
      throw err;
    }

    try {
      const existing = await getUserFromCloud(user.uid);
      if (existing) {
        if (!existing.isActive) throw new Error('Tài khoản đã bị khóa.');
        setActiveAccount(existing); setUserRole(existing.role);
        await loadUserDataFromFirestore(user.uid, existing);
        return;
      }
      const teacherId = user.uid;
      const classId = `cls_${Date.now()}`;
      const className = customClassName?.trim() || 'Lớp Mới K46';

      const newClass: SchoolClass = {
        id: classId,
        className,
        teacherId,
        teacherName: user.displayName || 'Giáo viên',
        teacherEmail: user.email || '',
        department: department || 'Khoa Chuyên ngành',
        schoolYear: currentSchoolYear(),
        studentCount: 0,
        averageScore: 10.0,
        topRankCount: 0,
        violationCount: 0,
      };

      const newAcc: UserAccount = {
        uid: teacherId,
        email: user.email || '',
        username: user.email ? user.email.split('@')[0] : 'user',
        displayName: user.displayName || 'Giáo viên',
        role: 'teacher',
        assignedClassId: classId,
        assignedClassName: `Lớp ${className}`,
        department: department || 'Khoa Chuyên ngành',
        phone: user.phoneNumber || '',
        isActive: true,
        lastLoginAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        avatarUrl: user.photoURL || '',
      };

      await saveUserToCloud(newAcc);
      await saveClassToCloud(newClass);

      const newConfig: ClassConfig = {
        ...INITIAL_CLASS_CONFIG,
        id: `cfg_${classId}`,
        className,
        homeroomTeacher: user.displayName || 'Giáo viên',
        teacherEmail: user.email || '',
        teacherPhone: user.phoneNumber || '',
        teacherId,
      };
      await saveClassConfigToCloud(newConfig);

      setUserAccounts((prev) => [...prev, newAcc]);
      setSchoolClasses((prev) => [...prev, newClass]);
      setClassConfig(newConfig);
      setActiveAccount(newAcc);
      setUserRole(newAcc.role);
      setIsLocalMode(false);
      await loadUserDataFromFirestore(user.uid, newAcc);
    } catch (err: any) {
      console.error('Google register error:', err);
      throw err;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const loginAsGuest = () => { void logout(); };

  const registerWithEmailPassword = async (params: {
    email: string;
    pass: string;
    name: string;
    className: string;
    department: string;
    phone?: string;
  }) => {
    setIsCloudSyncing(true);
    try {
      const cleanInput = params.email.trim().toLowerCase();
      const isEmail = cleanInput.includes('@');
      const username = isEmail ? cleanInput.split('@')[0] : cleanInput;
      const effectiveEmail = resolveLoginIdentifier(cleanInput);

      const existing = userAccounts.find(
        (a) =>
          a.email.toLowerCase() === effectiveEmail.toLowerCase() ||
          (a.username && a.username.toLowerCase() === username.toLowerCase())
      );
      if (existing) {
        throw new Error('Tên đăng nhập hoặc Email này đã được sử dụng. Vui lòng chọn tên khác.');
      }

      const user = await registerWithEmail(effectiveEmail, params.pass, params.name);
      const teacherId = user.uid;

      const classId = `cls_${Date.now()}`;
      const newClass: SchoolClass = {
        id: classId,
        className: params.className,
        teacherId,
        teacherName: params.name,
        teacherEmail: effectiveEmail,
        department: params.department || 'Khoa Chuyên ngành',
        schoolYear: currentSchoolYear(),
        studentCount: 0,
        averageScore: 10.0,
        topRankCount: 0,
        violationCount: 0,
      };
      const newAccount: UserAccount = {
        uid: teacherId,
        email: effectiveEmail,
        username,
        displayName: params.name,
        role: 'teacher',
        assignedClassId: classId,
        assignedClassName: `Lớp ${params.className}`,
        department: params.department,
        phone: params.phone || '',
        isActive: true,
        lastLoginAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };

      // Save user & class to Firestore
      await saveUserToCloud(newAccount);
      await saveClassToCloud(newClass);

      // Create fresh class config for this teacher
      const newConfig: ClassConfig = {
        ...INITIAL_CLASS_CONFIG,
        id: `cfg_${classId}`,
        className: params.className,
        homeroomTeacher: params.name,
        teacherEmail: effectiveEmail,
        teacherPhone: params.phone || '',
        teacherId,
      };
      await saveClassConfigToCloud(newConfig);

      // Save default behavior categories for this teacher
      const newCats = INITIAL_BEHAVIOR_CATEGORIES.map((c) => ({
        ...c,
        id: `cat_${teacherId}_${c.code}`,
        teacherId,
      }));
      await Promise.all(newCats.map((c) => saveBehaviorCategoryToCloud(c)));

      setUserAccounts((prev) => [...prev, newAccount]);
      setSchoolClasses((prev) => [...prev, newClass]);
      setClassConfig(newConfig);
      setBehaviorCategories(newCats);
      setStudents([]);
      setDisciplineLogs([]);
      setActiveAccount(newAccount);
      setUserRole(newAccount.role);
      setIsLocalMode(false);
    } catch (err: any) {
      console.error('Registration error:', err);
      throw err;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const loginUserWithEmailPassword = async (loginIdentifier: string, pass: string) => {
    setIsCloudSyncing(true);
    try {
      const identifier = loginIdentifier.trim().toLowerCase();
      const email = resolveLoginIdentifier(identifier);
      const user = await loginWithEmail(email, pass);
      let account = await getUserFromCloud(user.uid);
      if (!account) {
        account = { uid: user.uid, email: user.email || email, displayName: user.displayName || 'Giáo viên',
          role: 'teacher', assignedClassId: `cls_${user.uid}`, assignedClassName: 'Lớp chủ nhiệm', isActive: true };
        await saveUserToCloud(account);
        await saveClassToCloud({ id: account.assignedClassId, className: account.assignedClassName, teacherId: user.uid,
          teacherName: account.displayName, teacherEmail: account.email, department: '', schoolYear: INITIAL_CLASS_CONFIG.schoolYear,
          studentCount: 0, averageScore: 0, topRankCount: 0, violationCount: 0 });
      }
      if (!account.isActive) { await logoutUser(); throw new Error('Tài khoản đã bị khóa.'); }
      setActiveAccount(account); setUserRole(account.role); setIsLocalMode(false);
      await loadUserDataFromFirestore(user.uid, account);
    } catch (error: any) {
      throw new Error(error.code?.startsWith('auth/') ? 'Tên tài khoản/email hoặc mật khẩu không chính xác.' : error.message);
    } finally { setIsCloudSyncing(false); }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      clearSessionData();
      setIsLocalMode(false);
      try {
        localStorage.removeItem('so_cham_diem_active_uid');
        localStorage.setItem('so_cham_diem_user_role', 'guest');
      } catch (e) {}
    }
  };

  // Cloud data is already synchronized; retry only the active authenticated scope.
  const syncLocalToCloud = async () => {
    const teacherId = getEffectiveTeacherId();
    if (activeAccount?.role === 'monitor') throw new Error('Lớp trưởng không được tải toàn bộ dữ liệu lên.');
    if (classConfig.teacherId !== teacherId || students.some((item) => item.teacherId !== teacherId)
      || disciplineLogs.some((item) => item.teacherId !== teacherId)) throw new Error('Dữ liệu không thuộc tài khoản đang sử dụng.');
    setIsCloudSyncing(true);
    try {
      await saveClassConfigToCloud(classConfig);
      await Promise.all(students.map(saveStudentToCloud));
      await Promise.all(behaviorCategories.map(saveBehaviorCategoryToCloud));
      await Promise.all(disciplineLogs.map(saveDisciplineLogToCloud));
      setCloudSyncError(null);
    } finally { setIsCloudSyncing(false); }
  };

  // Update Class Config
  const updateClassConfig = async (updates: Partial<ClassConfig>) => {
    if (classConfig.scopeVersion === 2 && updates.schoolYear && updates.schoolYear !== classConfig.schoolYear) throw new Error('Để chuyển niên khóa, hãy tạo lớp/niên khóa mới. Dữ liệu năm cũ được giữ riêng.');
    const updated = {
      ...classConfig,
      ...updates,
      id: classConfig.id,
      teacherId: classConfig.teacherId,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveClassConfigToCloud(updated);
      setClassConfig(updated);
    } catch (err) {
      setCloudSyncError(String(err)); throw err;
    }
  };

  // Add Student
  const addStudent = async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>): Promise<Student> => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng chỉ được phép chấm điểm nề nếp, không có quyền thêm học sinh mới vào danh sách lớp.');
    }
    const teacherId = getEffectiveTeacherId();
    const token = data.parentLookupToken || Math.random().toString(36).substring(2, 12).toUpperCase();
    const newStudent: Student = {
      ...data,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parentLookupToken: token,
      teacherId,
      classId: classConfig.id,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveStudentToCloud(newStudent);
      setStudents((prev) => [...prev.filter((item) => item.id !== newStudent.id), newStudent]);
    } catch (err) {
      setCloudSyncError(String(err)); throw err;
    }
    return newStudent;
  };

  // Persist before reflecting an edit in the interface.
  const updateStudent = async (id: string, updates: Partial<Student>) => {
    if (userRole === 'monitor') throw new Error('Lớp trưởng không được chỉnh sửa học sinh.');
    const student = students.find((item) => item.id === id);
    if (!student) return;
    const next = { ...student, ...updates, id: student.id, teacherId: student.teacherId, updatedAt: new Date().toISOString() };
    await saveStudentToCloud(next);
    setStudents((prev) => prev.map((item) => item.id === id ? next : item));
  };

  // Delete single student
  const deleteStudent = async (id: string, deleteRelatedLogs: boolean = true) => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền xóa học sinh.');
    }
    await deleteStudentsBatch([id], deleteRelatedLogs);
  };

  // Delete multiple students batch
  const deleteStudentsBatch = async (
    ids: string[],
    deleteRelatedLogs: boolean = true
  ): Promise<{ count: number }> => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền xóa học sinh.');
    }
    if (!ids || ids.length === 0) return { count: 0 };
    const idSet = new Set(ids);

    const relatedLogs = deleteRelatedLogs ? disciplineLogs.filter(log => idSet.has(log.studentId)) : [];
    for (const log of relatedLogs) {
      const semester = classConfig.semester1Months.includes(log.month) ? 1 : 2;
      if (isPeriodLocked('week', log.weekNumber) || isPeriodLocked('month', log.month) || isPeriodLocked('semester', semester)) {
        throw new Error('Học sinh có nhật ký thuộc kỳ đã khóa. Không thể xóa kèm nhật ký.');
      }
    }
    const records = [...relatedLogs.map(log => ({ collection: 'disciplineLogs', id: log.id })), ...ids.map(id => ({ collection: 'students', id }))];
    try {
      for (let i = 0; i < records.length; i += 10) {
        const chunk = records.slice(i, i + 10);
        const batch = writeBatch(db);
        chunk.forEach(item => batch.delete(doc(db, item.collection, item.id)));
        await batch.commit();
        const studentIds = new Set(chunk.filter(item => item.collection === 'students').map(item => item.id));
        const logIds = new Set(chunk.filter(item => item.collection === 'disciplineLogs').map(item => item.id));
        setStudents(prev => prev.filter(student => !studentIds.has(student.id)));
        setDisciplineLogs(prev => prev.filter(log => !logIds.has(log.id)));
      }
    } catch (error) {
      setCloudSyncError(String(error));
      throw new Error('Không xóa được toàn bộ dữ liệu. Vui lòng kiểm tra lại danh sách. ' + String(error));
    }
    return { count: ids.length };
  };

  // Toggle active/inactive student
  const toggleStudentStatus = async (id: string) => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền chuyển trạng thái học sinh.');
    }
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    await updateStudent(id, { status: newStatus });
  };

  // Batch import students
  const importStudentsBatch = async (
    newStudents: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>>,
    onDuplicate: 'update' | 'skip' = 'update'
  ): Promise<{ imported: number; updated: number }> => {
    if (userRole === 'monitor') throw new Error('Lớp trưởng không có quyền nhập dữ liệu học sinh.');
    const teacherId = getEffectiveTeacherId();
    const plan = planStudentImport(students, newStudents, onDuplicate, teacherId, classConfig.id,
      () => `std_${Date.now()}_${crypto.randomUUID()}`, new Date().toISOString());
    try {
      for (let i = 0; i < plan.changed.length; i += 400) {
        const chunk = plan.changed.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(student => batch.set(doc(db, 'students', student.id), student));
        await batch.commit();
        setStudents(prev => [...prev.filter(student => !chunk.some(saved => saved.id === student.id)), ...chunk]);
      }
    } catch (error) {
      setCloudSyncError(String(error));
      throw new Error('Không nhập được toàn bộ danh sách. Các dòng đã lưu vẫn được giữ; có thể nhập lại cùng tệp theo mã học sinh. ' + String(error));
    }
    return { imported: plan.imported, updated: plan.updated };
  };
  // Add Category
  const addBehaviorCategory = async (
    cat: Omit<BehaviorCategory, 'id' | 'createdAt' | 'updatedAt' | 'teacherId'>
  ): Promise<BehaviorCategory> => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền thêm mới danh mục vi phạm.');
    }
    const teacherId = getEffectiveTeacherId();
    const newCat: BehaviorCategory = {
      ...cat,
      classId: classConfig.id,
      id: `cat_${cat.code.toUpperCase()}_${Date.now()}`,
      teacherId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveBehaviorCategoryToCloud(newCat);
    setBehaviorCategories((prev) => [...prev.filter((item) => item.id !== newCat.id), newCat]);
    return newCat;
  };

  // Persist category edits before reflecting them in the interface.
  const updateBehaviorCategory = async (id: string, updates: Partial<BehaviorCategory>) => {
    if (userRole === 'monitor') throw new Error('Lớp trưởng không được chỉnh sửa danh mục.');
    const category = behaviorCategories.find((item) => item.id === id);
    if (!category) return;
    const next = { ...category, ...updates, id: category.id, teacherId: category.teacherId, updatedAt: new Date().toISOString() };
    if (!Number.isFinite(next.defaultScore) || next.defaultScore < 0) throw new Error('Điểm cộng/trừ phải là số không âm.');
    await saveBehaviorCategoryToCloud(next);
    setBehaviorCategories((prev) => prev.map((item) => item.id === id ? next : item));
  };

  // Toggle active category
  const toggleBehaviorCategoryActive = async (id: string) => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền thay đổi trạng thái danh mục.');
    }
    const cat = behaviorCategories.find((c) => c.id === id);
    if (!cat) return;
    await updateBehaviorCategory(id, { isActive: !cat.isActive });
  };

  // Delete category: check if used in logs
  const deleteBehaviorCategory = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền xóa danh mục.');
    }
    const cat = behaviorCategories.find((c) => c.id === id);
    if (!cat) return { success: false, message: 'Không tìm thấy danh mục' };

    // Check if category is used in any discipline log
    const isUsed = disciplineLogs.some((l) => l.behaviorCode.toUpperCase() === cat.code.toUpperCase());
    if (isUsed) {
      return {
        success: false,
        message: `Mã danh mục "${cat.code}" đã được sử dụng trong các bản ghi nhật ký. Để bảo vệ tính toàn vẹn của lịch sử, bạn chỉ có thể [Vô hiệu hóa] danh mục này thay vì xóa.`,
      };
    }

    await deleteDoc(doc(db, 'behaviorCategories', id));
    setBehaviorCategories((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  const resetBehaviorCategoriesToDefault = async () => {
    if (userRole === 'monitor') throw new Error('Lớp trưởng không được khôi phục danh mục.');
    const teacherId = getEffectiveTeacherId();
    const categories = INITIAL_BEHAVIOR_CATEGORIES.map((category) => ({ ...category,
      id: behaviorCategories.find(existing => existing.code === category.code)?.id || `cat_${classConfig.id}_${category.code}`, classId: classConfig.id, teacherId }));
    await Promise.all(categories.map(saveBehaviorCategoryToCloud));
    setBehaviorCategories(categories);
  };

  // ACHIEVEMENT BONUS RULES MUTATORS
  const updateAchievementRule = async (id: string, updates: Partial<AchievementBonusRule>) => {
    const currentRules = classConfig.achievementBonusRules || DEFAULT_ACHIEVEMENT_RULES;
    const updatedRules = currentRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    await updateClassConfig({ achievementBonusRules: updatedRules });
  };

  const addAchievementRule = async (rule: Omit<AchievementBonusRule, 'id'>): Promise<AchievementBonusRule> => {
    const currentRules = classConfig.achievementBonusRules || DEFAULT_ACHIEVEMENT_RULES;
    const newRule: AchievementBonusRule = {
      ...rule,
      id: `tt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
    };
    const updatedRules = [...currentRules, newRule];
    await updateClassConfig({ achievementBonusRules: updatedRules });
    return newRule;
  };

  const deleteAchievementRule = async (id: string) => {
    const currentRules = classConfig.achievementBonusRules || DEFAULT_ACHIEVEMENT_RULES;
    const updatedRules = currentRules.filter((r) => r.id !== id);
    await updateClassConfig({ achievementBonusRules: updatedRules });
  };

  const resetAchievementRulesToDefault = async () => {
    await updateClassConfig({ achievementBonusRules: DEFAULT_ACHIEVEMENT_RULES });
  };

  // Award Achievement Bonus (Điểm thưởng tuần / tháng khi có thành tích)
  const awardAchievementBonus = async (params: {
    studentId: string;
    rule?: AchievementBonusRule;
    weekNumber?: number;
    month?: number;
    customScore?: number;
    customNote?: string;
  }): Promise<{ log: DisciplineLog; alreadyAwarded?: boolean }> => {
    const student = students.find((s) => s.id === params.studentId);
    if (!student) throw new Error('Không tìm thấy thông tin học sinh');

    const effectiveScore = params.customScore !== undefined ? params.customScore : (params.rule?.bonusScore ?? 2.0);
    const targetWeek = params.weekNumber || classConfig.weeks.find(w => w.month === params.month && !isPeriodLocked('week', w.weekNumber))?.weekNumber || classConfig.weeks.find(w => w.month === params.month)?.weekNumber || 1;
    const targetMonth = params.month || (classConfig.weeks.find((w) => w.weekNumber === targetWeek)?.month || 9);
    const isWeekly = params.weekNumber !== undefined || params.rule?.period === 'weekly';
    const periodType = isWeekly ? 'weekly' : 'monthly';

    // Check if already awarded this achievement rule in this week/month (only when rule is provided)
    if (params.rule) {
      const existingLog = disciplineLogs.find(
        (l) =>
          l.studentId === params.studentId &&
          l.behaviorCode === params.rule!.code &&
          (params.rule!.period === 'weekly' ? l.weekNumber === targetWeek : l.month === targetMonth)
      );

      if (existingLog) {
        return { log: existingLog, alreadyAwarded: true };
      }
    }

    const todayStr = localDateString();
    const ruleCode = params.rule?.code || `TT_CUSTOM_${Date.now()}`;
    const defaultTitle = isWeekly ? `Khen thưởng tuần ${targetWeek}` : `Khen thưởng tháng ${targetMonth}`;
    const displayTitle = params.rule?.title || params.customNote?.trim() || defaultTitle;
    if (!params.rule && disciplineLogs.some(l => l.studentId === params.studentId && l.type === 'bonus' && (isWeekly ? l.weekNumber === targetWeek : l.month === targetMonth) && l.behaviorDescription === `[Thành tích ${periodType === 'weekly' ? 'tuần' : 'tháng'}] ${displayTitle}`)) throw new Error('Thành tích này đã được trao trong kỳ. Hãy sửa bản ghi thưởng đã có.');

    const logRes = await addDisciplineLog({
      date: todayStr,
      month: targetMonth,
      weekNumber: targetWeek,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      behaviorCode: ruleCode,
      behaviorDescription: `[Thành tích ${periodType === 'weekly' ? 'tuần' : 'tháng'}] ${displayTitle}`,
      type: 'bonus',
      scorePerUnit: effectiveScore,
      count: 1,
      periodOrTime: periodType === 'weekly' ? `Tổng kết Tuần ${targetWeek}` : `Tổng kết Tháng ${targetMonth}`,
      reporter: classConfig.homeroomTeacher || 'GVCN',
      basisOrRegulation: params.rule?.description || 'Khen thưởng thành tích theo đề xuất của GVCN',
      note: params.customNote || (params.rule?.isAutoEligible ? 'Đạt tiêu chuẩn thi đua tự động' : 'Tuyên dương khen thưởng thành tích'),
    });

    return { log: logRes.log, alreadyAwarded: false };
  };

  // Batch Award Achievement Bonus
  const batchAwardAchievementBonus = async (params: {
    studentIds: string[];
    rule?: AchievementBonusRule;
    weekNumber?: number;
    month?: number;
    customScore?: number;
    customNote?: string;
  }): Promise<{ awardedCount: number; skippedCount: number }> => {
    let awardedCount = 0;
    let skippedCount = 0;

    for (const sId of params.studentIds) {
      const res = await awardAchievementBonus({
        studentId: sId,
        rule: params.rule,
        weekNumber: params.weekNumber,
        month: params.month,
        customScore: params.customScore,
        customNote: params.customNote,
      });
      if (res.alreadyAwarded) {
        skippedCount++;
      } else {
        awardedCount++;
      }
    }

    return { awardedCount, skippedCount };
  };

  // Revoke Achievement Bonus
  const revokeAchievementBonus = async (logId: string) => {
    await deleteDisciplineLog(logId, classConfig.homeroomTeacher || 'GVCN');
  };

  // Add Discipline Log with Period Lock Guard
  const addDisciplineLog = async (
    logData: Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>
  ): Promise<{ log: DisciplineLog; duplicateWarning?: boolean }> => {
    validateLogNumbers(logData);
    if (isPeriodLocked('month', logData.month) || isPeriodLocked('semester', classConfig.semester1Months.includes(logData.month) ? 1 : 2)) throw new Error('Tháng hoặc học kỳ đã khóa. Không thể ghi nhận.');
    if (isPeriodLocked('week', logData.weekNumber)) {
      throw new Error(`Tuần ${logData.weekNumber} đã được khóa thi đua bởi Ban Giám Hiệu. Không thể thêm mới dữ liệu.`);
    }

    if (activeAccount?.role === 'monitor') {
      if (logData.type === 'deduct' && activeAccount.permissions && !activeAccount.permissions.canAddViolations) {
        throw new Error('Tài khoản Lớp trưởng chưa được cấp quyền ghi nhận điểm trừ vi phạm.');
      }
      if (logData.type === 'bonus' && activeAccount.permissions && !activeAccount.permissions.canAddBonuses) {
        throw new Error('Tài khoản Lớp trưởng chưa được cấp quyền ghi nhận điểm thưởng thi đua.');
      }
    }

    const teacherId = getEffectiveTeacherId();
    const effectiveReporter = logData.reporter || (activeAccount?.role === 'monitor' ? `Lớp trưởng ${activeAccount.displayName}` : classConfig.homeroomTeacher || 'GVCN');

    const isDuplicate = disciplineLogs.some(l => sameLogEntry(l, logData));
    if (isDuplicate) throw new Error('Bản ghi này đã có: cùng học sinh, ngày, tiết và hành vi. Hãy sửa bản ghi cũ hoặc tăng số lần.');

    const newLog: DisciplineLog = {
      ...logData,
      reporter: effectiveReporter,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      totalScore: Math.round(logData.scorePerUnit * logData.count * 100) / 100,
      teacherId,
      classId: classConfig.id,
      createdBy: auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          editorName: effectiveReporter,
          action: 'create',
          newValue: `Tạo mới: ${logData.behaviorCode} - ${logData.behaviorDescription} (${logData.count} lần, ${logData.scorePerUnit}đ)`,
        },
      ],
    };

    try {
      await saveDisciplineLogToCloud(newLog);
      setDisciplineLogs((prev) => [newLog, ...prev.filter((log) => log.id !== newLog.id)]);
    } catch (err) {
      setCloudSyncError(String(err)); throw err;
    }

    return { log: newLog, duplicateWarning: isDuplicate };
  };

  // Add Bulk Discipline Logs (Ghi nhận hàng loạt nhiều học sinh)
  const addBulkDisciplineLogs = async (
    logsData: Array<Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>>
  ): Promise<{ logs: DisciplineLog[] }> => {
    if (!logsData || logsData.length === 0) return { logs: [] };
    logsData.forEach(validateLogNumbers);
    if (logsData.some(data => isPeriodLocked('week', data.weekNumber) || isPeriodLocked('month', data.month) || isPeriodLocked('semester', classConfig.semester1Months.includes(data.month) ? 1 : 2))) throw new Error('Có bản ghi thuộc kỳ đã khóa. Không thể lưu.');
    if (logsData.some((data, index) => disciplineLogs.some(l => sameLogEntry(l, data)) || logsData.slice(0, index).some(l => sameLogEntry(l, data)))) throw new Error('Có bản ghi trùng học sinh, ngày, tiết và hành vi. Hãy kiểm tra lại danh sách trước khi lưu.');

    const first = logsData[0];
    if (isPeriodLocked('week', first.weekNumber)) {
      throw new Error(`Tuần ${first.weekNumber} đã được khóa thi đua. Không thể thực hiện ghi nhận hàng loạt.`);
    }

    if (activeAccount?.role === 'monitor') {
      if (first.type === 'deduct' && activeAccount.permissions && !activeAccount.permissions.canAddViolations) {
        throw new Error('Tài khoản Lớp trưởng chưa được cấp quyền ghi nhận điểm trừ vi phạm.');
      }
      if (first.type === 'bonus' && activeAccount.permissions && !activeAccount.permissions.canAddBonuses) {
        throw new Error('Tài khoản Lớp trưởng chưa được cấp quyền ghi nhận điểm thưởng thi đua.');
      }
    }

    const teacherId = getEffectiveTeacherId();
    const nowIso = new Date().toISOString();
    const effectiveReporter = first.reporter || (activeAccount?.role === 'monitor' ? `Lớp trưởng ${activeAccount.displayName}` : classConfig.homeroomTeacher || 'GVCN');

    const createdLogs: DisciplineLog[] = logsData.map((data, idx) => ({
      ...data,
      reporter: data.reporter || effectiveReporter,
      id: `log_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      totalScore: Math.round(data.scorePerUnit * data.count * 100) / 100,
      teacherId,
      classId: classConfig.id,
      createdBy: auth.currentUser?.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          timestamp: nowIso,
          editorName: data.reporter || effectiveReporter,
          action: 'create',
          newValue: `Ghi nhận hàng loạt: ${data.behaviorCode} - ${data.behaviorDescription} (${data.scorePerUnit}đ)`,
        },
      ],
    }));

    // Commit state after all records have been persisted.

    // Immediately save all logs into Cloud Firestore
    try {
      await Promise.all(createdLogs.map((item) => saveDisciplineLogToCloud(item)));
      setDisciplineLogs((prev) => [...createdLogs, ...prev.filter((log) => !createdLogs.some((item) => item.id === log.id))]);
    } catch (err) {
      setCloudSyncError(String(err)); throw err;
    }

    return { logs: createdLogs };
  };

  // Update Discipline Log with edit history and period lock guard
  const updateDisciplineLog = async (id: string, updates: Partial<DisciplineLog>, editorName: string) => {
    const target = disciplineLogs.find((l) => l.id === id);
    if (!target) return;

    if (isPeriodLocked('week', target.weekNumber) || isPeriodLocked('month', target.month) || isPeriodLocked('semester', classConfig.semester1Months.includes(target.month) ? 1 : 2)) {
      throw new Error(`Tuần, tháng hoặc học kỳ của bản ghi đã khóa thi đua. Không thể chỉnh sửa.`);
    }

    // Determine target week and month if date is updated
    let newWeekNumber = updates.weekNumber ?? target.weekNumber;
    let newMonth = updates.month ?? target.month;
    let newDate = updates.date ?? target.date;
    if (updates.date && updates.date !== target.date) {
      const matchingWeek = classConfig.weeks.find((w) => w.startDate <= updates.date! && updates.date! <= w.endDate);
      if (matchingWeek) {
        newWeekNumber = matchingWeek.weekNumber;
        newMonth = matchingWeek.month;
      } else {
        const d = new Date(updates.date);
        if (!isNaN(d.getTime())) {
          newMonth = d.getMonth() + 1;
        }
      }
    } else if (updates.weekNumber && updates.weekNumber !== target.weekNumber) {
      const matchingWeek = classConfig.weeks.find((w) => w.weekNumber === updates.weekNumber);
      if (matchingWeek) {
        newMonth = matchingWeek.month;
        newDate = targetDateForMovedWeek(target.date, matchingWeek);
      }
    }

    if (isPeriodLocked('week', newWeekNumber)) {
      throw new Error(`Tuần ${newWeekNumber} đã được khóa thi đua. Không thể chuyển bản ghi sang tuần này.`);
    }
    if (isPeriodLocked('month', newMonth) || isPeriodLocked('semester', classConfig.semester1Months.includes(newMonth) ? 1 : 2)) {
      throw new Error(`Tháng ${newMonth} hoặc học kỳ của ngày mới đã được khóa thi đua.`);
    }

    const dateChanged = Boolean(newDate !== target.date);
    const previousDesc = `${target.date ? `[${formatVietnameseDate(target.date)}] ` : ''}${target.behaviorCode} - ${target.behaviorDescription} (${target.count} lần, ${target.scorePerUnit}đ, tổng: ${target.totalScore}đ)`;
    const newCount = updates.count ?? target.count;
    const newScorePerUnit = updates.scorePerUnit ?? target.scorePerUnit;
    const calculatedTotalScore = Math.round(newCount * newScorePerUnit * 100) / 100;

    const historyEntry: EditHistoryEntry = {
      timestamp: new Date().toISOString(),
      editorName: editorName || classConfig.homeroomTeacher || 'Giáo viên',
      action: 'update',
      previousValue: previousDesc,
      newValue: `Cập nhật: ${dateChanged ? `[Ngày ${formatVietnameseDate(newDate)}] ` : ''}${updates.behaviorCode ?? target.behaviorCode} - ${updates.behaviorDescription ?? target.behaviorDescription} (${newCount} lần, ${newScorePerUnit}đ, tổng: ${calculatedTotalScore}đ)`,
    };

    const updatedLog: DisciplineLog = {
      ...target,
      ...updates,
      date: newDate,
      weekNumber: newWeekNumber,
      month: newMonth,
      totalScore: calculatedTotalScore,
      updatedAt: new Date().toISOString(),
      history: [...(target.history || []), historyEntry],
    };
    validateLogNumbers(updatedLog);

    try {
      await saveDisciplineLogToCloud(updatedLog);
      setDisciplineLogs((prev) => prev.map((l) => (l.id === id ? updatedLog : l)));
    } catch (err) {
      setCloudSyncError(String(err)); throw err;
    }
  };

  // Move Weekly Bonus / Discipline Log to another week
  const moveDisciplineLogToWeek = async (
    id: string,
    targetWeekNumber: number,
    editorName?: string,
    customNote?: string
  ) => {
    const target = disciplineLogs.find((l) => l.id === id);
    if (!target) throw new Error('Không tìm thấy bản ghi điểm.');

    if (
      isPeriodLocked('week', target.weekNumber) ||
      isPeriodLocked('month', target.month) ||
      isPeriodLocked('semester', classConfig.semester1Months.includes(target.month) ? 1 : 2)
    ) {
      throw new Error(`Tuần ${target.weekNumber} hoặc tháng hiện tại đã khóa thi đua. Không thể di chuyển.`);
    }

    const targetWeek = classConfig.weeks.find((w) => w.weekNumber === targetWeekNumber);
    if (!targetWeek) throw new Error(`Không tìm thấy cấu hình Tuần ${targetWeekNumber}.`);

    if (
      isPeriodLocked('week', targetWeek.weekNumber) ||
      isPeriodLocked('month', targetWeek.month) ||
      isPeriodLocked('semester', classConfig.semester1Months.includes(targetWeek.month) ? 1 : 2)
    ) {
      throw new Error(`Tuần ${targetWeekNumber} hoặc Tháng ${targetWeek.month} đã khóa thi đua. Không thể chuyển vào tuần này.`);
    }

    if (target.weekNumber === targetWeekNumber) {
      throw new Error(`Bản ghi hiện tại đã thuộc Tuần ${targetWeekNumber}.`);
    }

    const newDate = targetDateForMovedWeek(target.date, targetWeek);

    // Update periodOrTime if it mentions the old week
    let newPeriodOrTime = target.periodOrTime;
    if (newPeriodOrTime && newPeriodOrTime.includes(`Tuần ${target.weekNumber}`)) {
      newPeriodOrTime = newPeriodOrTime.replace(`Tuần ${target.weekNumber}`, `Tuần ${targetWeekNumber}`);
    } else if (!newPeriodOrTime) {
      newPeriodOrTime = `Tổng kết Tuần ${targetWeekNumber}`;
    }

    // Update behaviorDescription if it contains default weekly title
    let newBehaviorDesc = target.behaviorDescription;
    if (newBehaviorDesc.includes(`Khen thưởng tuần ${target.weekNumber}`)) {
      newBehaviorDesc = newBehaviorDesc.replace(`Khen thưởng tuần ${target.weekNumber}`, `Khen thưởng tuần ${targetWeekNumber}`);
    }

    const moveTag = customNote?.trim() || `(Chuyển từ Tuần ${target.weekNumber} sang Tuần ${targetWeekNumber})`;
    const updatedNote = target.note ? `${target.note} • ${moveTag}` : moveTag;

    const historyEntry: EditHistoryEntry = {
      timestamp: new Date().toISOString(),
      editorName: editorName || activeAccount?.displayName || classConfig.homeroomTeacher || 'Giáo viên',
      action: 'update',
      previousValue: `Tuần ${target.weekNumber} (Ngày ${target.date})`,
      newValue: `Di chuyển sang Tuần ${targetWeekNumber} (Ngày ${newDate})`,
    };

    const updatedLog: DisciplineLog = {
      ...target,
      weekNumber: targetWeek.weekNumber,
      month: targetWeek.month,
      date: newDate,
      periodOrTime: newPeriodOrTime,
      behaviorDescription: newBehaviorDesc,
      note: updatedNote,
      updatedAt: new Date().toISOString(),
      history: [...(target.history || []), historyEntry],
    };
    validateLogNumbers(updatedLog);

    try {
      await saveDisciplineLogToCloud(updatedLog);
      setDisciplineLogs((prev) => prev.map((l) => (l.id === id ? updatedLog : l)));
    } catch (err) {
      setCloudSyncError(String(err));
      throw err;
    }
  };

  const batchMoveDisciplineLogsToWeek = async (
    logIds: string[],
    targetWeekNumber: number,
    editorName?: string,
    customNote?: string
  ): Promise<{ movedCount: number; errors: string[] }> => {
    let movedCount = 0;
    const errors: string[] = [];
    for (const id of logIds) {
      try {
        await moveDisciplineLogToWeek(id, targetWeekNumber, editorName, customNote);
        movedCount++;
      } catch (err: any) {
        errors.push(err.message || String(err));
      }
    }
    return { movedCount, errors };
  };

  // Delete Discipline Log with period lock guard
  const deleteDisciplineLog = async (id: string, editorName: string) => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền xóa bản ghi điểm nề nếp. Vui lòng báo Giáo viên chủ nhiệm!');
    }
    const target = disciplineLogs.find((l) => l.id === id);
    if (target && (isPeriodLocked('month', target.month) || isPeriodLocked('semester', classConfig.semester1Months.includes(target.month) ? 1 : 2))) throw new Error('Tháng hoặc học kỳ đã khóa. Không thể xóa bản ghi.');
    if (target && isPeriodLocked('week', target.weekNumber)) {
      throw new Error(`Tuần ${target.weekNumber} đã được khóa thi đua. Không thể xóa bản ghi.`);
    }

    try {
      await deleteDisciplineLogFromCloud(id, target, editorName);
      setDisciplineLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setCloudSyncError(String(err)); throw err;
    }
  };

  const restoreDisciplineLog = async (log: DisciplineLog) => {
    if (userRole === 'monitor') throw new Error('Chỉ giáo viên được hoàn tác xóa.');
    if (log.classId !== classConfig.id || log.teacherId !== getEffectiveTeacherId()) throw new Error('Bản ghi thuộc lớp khác.');
    if (isPeriodLocked('week', log.weekNumber) || isPeriodLocked('month', log.month) || isPeriodLocked('semester', classConfig.semester1Months.includes(log.month) ? 1 : 2)) throw new Error('Kỳ đã khóa. Không thể hoàn tác.');
    if (disciplineLogs.some(l => l.id === log.id || sameLogEntry(l, log))) throw new Error('Bản ghi đã được khôi phục hoặc có bản ghi tương tự.');
    const next = { ...log, createdBy: auth.currentUser?.uid, updatedAt: new Date().toISOString(), history: [...(log.history || []), { timestamp: new Date().toISOString(), editorName: activeAccount?.displayName || classConfig.homeroomTeacher, action: 'update' as const, newValue: 'Hoàn tác xóa bản ghi nhập sai' }] };
    await restoreDisciplineLogFromCloud(next);
    setDisciplineLogs(prev => [next, ...prev.filter(l => l.id !== next.id)]);
  };

  // Batch import discipline logs (Nhật ký lỗi / nề nếp)
  const importDisciplineLogsBatch = async (
    newLogs: Array<Omit<DisciplineLog, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId' | 'totalScore'>>
  ): Promise<{ imported: number }> => {
    if (userRole === 'monitor') {
      throw new Error('Lớp trưởng không có quyền tải tệp nhật ký lỗi hàng loạt.');
    }
    if (!newLogs || newLogs.length === 0) return { imported: 0 };
    const teacherId = getEffectiveTeacherId();
    const nowIso = new Date().toISOString();

    const createdLogs: DisciplineLog[] = newLogs.map((item, idx) => ({
      ...item,
      id: `log_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      totalScore: Math.round(item.scorePerUnit * item.count * 100) / 100,
      teacherId,
      classId: classConfig.id,
      createdBy: auth.currentUser?.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          timestamp: nowIso,
          editorName: item.reporter || classConfig.homeroomTeacher || 'Giáo viên',
          action: 'create',
          newValue: `Tải lên từ file Excel/CSV: ${item.behaviorCode} - ${item.behaviorDescription} (${item.count} lần, ${item.scorePerUnit}đ)`,
        },
      ],
    }));
    createdLogs.forEach(validateLogNumbers);

    try {
      const chunkSize = 10;
      for (let i = 0; i < createdLogs.length; i += chunkSize) {
        const chunk = createdLogs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((l) => {
          batch.set(doc(db, 'disciplineLogs', l.id), l);
        });
        await batch.commit();
        setDisciplineLogs((prev) => [...chunk, ...prev.filter((log) => !chunk.some((saved) => saved.id === log.id))]);
      }
    } catch (err) {
      setCloudSyncError(String(err));
      throw new Error('Không nhập được toàn bộ nhật ký. Các dòng đã lưu vẫn được giữ; kiểm tra danh sách trước khi nhập lại. ' + String(err));
    }

    return { imported: createdLogs.length };
  };

  // CALCULATION LOGIC: Weekly Summary
  // Rule: Điểm tuần = clamp (0 - 10) của (10 - tổng điểm trừ + tổng điểm cộng)
  const getWeeklySummary = (weekNumber: number, month?: number): StudentWeeklySummary[] => {
    // Filter logs for this week
    const lock = scoreLock('week', weekNumber);
    const oldLocked = !!lock && lock.scoreVersion !== 2;
    const weekLogs = logsForWeek(disciplineLogs, weekNumber).filter(l => oldLocked || !isMonthlyBonus(l));

    return students.map((s) => {
      const studentLogs = weekLogs.filter((l) => l.studentId === s.id);
      let violationCount = 0;
      let bonusCount = 0;
      let totalDeduct = 0;
      let totalBonus = 0;

      studentLogs.forEach((log) => {
        if (log.type === 'deduct') {
          violationCount += log.count;
          totalDeduct += log.totalScore;
        } else {
          bonusCount += log.count;
          totalBonus += log.totalScore;
        }
      });

      totalDeduct = Math.round(totalDeduct * 100) / 100;
      totalBonus = Math.round(totalBonus * 100) / 100;

      const achievementLogs = studentLogs.filter(
        (l) => l.type === 'bonus' && (l.behaviorCode.startsWith('TT_') || l.behaviorDescription.includes('[Thành tích'))
      );
      const achievementBonus = Math.round(achievementLogs.reduce((acc, curr) => acc + curr.totalScore, 0) * 100) / 100;
      const achievementCount = achievementLogs.length;
      const achievements = achievementLogs.map((l) => l.behaviorDescription.replace('[Thành tích tuần] ', '').replace('[Thành tích tháng] ', ''));

      const attStats = calculateAttendanceStats(studentLogs);
      const hasAbsence = attStats.excusedAbsenceCount > 0 || attStats.unexcusedAbsenceCount > 0 || attStats.truancyCount > 0;

      const rawScore = classConfig.baseScore - totalDeduct + totalBonus;
      const finalScore = lock?.scores?.[s.id] ?? clampScore(rawScore, classConfig.minScore);
      const rank = calculateRank(finalScore, classConfig.rankThresholds);

      let notes = '';
      if (achievementCount > 0) {
        notes = `🏆 Nhận thưởng ${achievementCount} thành tích (+${achievementBonus}đ)`;
        if (violationCount > 0) notes += `, ${violationCount} lỗi (-${totalDeduct}đ)`;
      } else if (violationCount > 0 && totalBonus > 0) {
        notes = `${violationCount} lỗi (-${totalDeduct}đ), ${bonusCount} việc tốt (+${totalBonus}đ)`;
      } else if (violationCount > 0) {
        notes = `${violationCount} lượt vi phạm (-${totalDeduct}đ)`;
      } else if (bonusCount > 0) {
        notes = `${bonusCount} khen thưởng (+${totalBonus}đ)`;
      } else {
        notes = 'Nề nếp tốt, duy trì trọn vẹn điểm nền';
      }

      if (hasAbsence) {
        notes = `Vắng (${formatAttendanceBadgeText(attStats)}). ` + notes;
      }

      return {
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        dateOfBirth: s.dateOfBirth,
        status: s.status,
        violationCount,
        bonusCount,
        totalDeduct,
        totalBonus,
        excusedAbsenceCount: attStats.excusedAbsenceCount,
        unexcusedAbsenceCount: attStats.unexcusedAbsenceCount,
        truancyCount: attStats.truancyCount,
        achievementBonus,
        achievementCount,
        achievements,
        finalScore,
        rank,
        notes,
      };
    });
  };

  // CALCULATION LOGIC: Monthly Summary
  // Monthly average of completed/finalized weeks plus month-only awards;
  // pre-upgrade locked periods retain their legacy formula or frozen scores.
  const getMonthlySummary = (month: number): StudentMonthlySummary[] => {
    const monthLogs = disciplineLogs.filter((l) => l.month === month);

    return students.map((s) => {
      const studentLogs = monthLogs.filter((l) => l.studentId === s.id);
      const weekDeductions: Record<number, number> = {};
      let totalDeduct = 0;
      let totalBonus = 0;
      let violationCount = 0;
      let bonusCount = 0;

      studentLogs.forEach((log) => {
        if (log.type === 'deduct') {
          violationCount += log.count;
          totalDeduct += log.totalScore;
          weekDeductions[log.weekNumber] = (weekDeductions[log.weekNumber] || 0) + log.totalScore;
        } else {
          bonusCount += log.count;
          totalBonus += log.totalScore;
        }
      });

      totalDeduct = Math.round(totalDeduct * 100) / 100;
      totalBonus = Math.round(totalBonus * 100) / 100;

      const achievementLogs = studentLogs.filter(
        (l) => l.type === 'bonus' && (l.behaviorCode.startsWith('TT_') || l.behaviorDescription.includes('[Thành tích'))
      );
      const monthlyAchievements = achievementLogs.filter(isMonthlyBonus);
      const achievementBonus = Math.round(monthlyAchievements.reduce((acc, curr) => acc + curr.totalScore, 0) * 100) / 100;
      const achievementCount = monthlyAchievements.length;
      const achievements = monthlyAchievements.map(l => l.behaviorDescription.replace('[Thành tích tháng] ', ''));

      const allStudentLogs = disciplineLogs.filter(l => l.studentId === s.id);
      const breakdown = monthBreakdown(allStudentLogs, classConfig, month, w => isPeriodLocked('week', w), legacyMonth(month), undefined, w => {
        const lock = scoreLock('week', w);
        return lock?.scores?.[s.id] ?? (lock && lock.scoreVersion !== 2 ? weekBreakdown(allStudentLogs.filter(l => l.weekNumber === w), classConfig, true).score : undefined);
      });
      const attStats = calculateAttendanceStats(studentLogs);
      const hasAbsence = attStats.excusedAbsenceCount > 0 || attStats.unexcusedAbsenceCount > 0 || attStats.truancyCount > 0;

      const weeks = breakdown.weeks.map(w => w.score);
      const score = breakdown.score;
      const finalScore = scoreLock('month', month)?.scores?.[s.id] ?? scoreLock('semester', classConfig.semester1Months.includes(month) ? 1 : 2)?.monthlyScores?.[month]?.[s.id] ?? Math.round(score * 100) / 100;
      const rank = calculateRank(finalScore, classConfig.rankThresholds);

      let notes = '';
      const xuatSacThreshold = classConfig.rankThresholds?.xuatSac ?? 12;
      const datThreshold = classConfig.rankThresholds?.dat ?? 5;
      if (achievementCount > 0) {
        notes = `🏆 Nhận thưởng ${achievementCount} thành tích tháng (+${achievementBonus}đ)`;
        if (violationCount > 0) notes += `, ${violationCount} lỗi (-${totalDeduct}đ)`;
      } else if (violationCount === 0 && totalBonus === 0) {
        notes = 'Ý thức nề nếp tháng gương mẫu';
      } else if (violationCount > 2) {
        notes = `Vi phạm lặp lại (${violationCount} lần), cần giáo viên theo dõi sát`;
      } else if (finalScore >= xuatSacThreshold) {
        notes = 'Đạt kết quả thi đua xuất sắc';
      } else if (finalScore < datThreshold) {
        notes = 'Cần liên hệ phụ huynh phối hợp rèn luyện';
      } else {
        notes = 'Đạt yêu cầu rèn luyện nề nếp';
      }

      if (hasAbsence) {
        notes = `Vắng (${formatAttendanceBadgeText(attStats)}). ` + notes;
      }

      return {
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        status: s.status,
        weekDeductions,
        monthlyBonus: breakdown.monthlyBonus,
        weeklyBonus: Math.round((totalBonus - breakdown.monthlyBonus) * 100) / 100,
        totalDeduct,
        totalBonus,
        excusedAbsenceCount: attStats.excusedAbsenceCount,
        unexcusedAbsenceCount: attStats.unexcusedAbsenceCount,
        truancyCount: attStats.truancyCount,
        achievementBonus,
        achievementCount,
        achievements,
        finalScore,
        rank,
        violationCount,
        bonusCount,
        notes: `${breakdown.legacy ? 'Công thức cũ' : `TB ${weeks.length} tuần ${weeks.length ? Math.round(weeks.reduce((n, v) => n + v, 0) / weeks.length * 100) / 100 : 'chưa có'} + thưởng tháng ${breakdown.monthlyBonus}đ`} → ${finalScore}đ. ${notes}`,
      };
    });
  };

  // CALCULATION LOGIC: Semester Summary
  const getSemesterSummary = (semester: 1 | 2): StudentSemesterSummary[] => {
    const targetMonths = semester === 1 ? classConfig.semester1Months : classConfig.semester2Months;

    return students.map((s) => {
      const monthlyScores: Record<number, number | null> = {};
      let scoreSum = 0;
      let monthsWithScoreCount = 0;
      let totalViolations = 0;
      let totalDeduct = 0;
      let totalBonus = 0;

      targetMonths.forEach((m) => {
        const monthLogs = disciplineLogs.filter((l) => l.studentId === s.id && l.month === m);
        let mDeduct = 0;
        let mBonus = 0;
        monthLogs.forEach((l) => {
          if (l.type === 'deduct') {
            mDeduct += l.totalScore;
            totalViolations += l.count;
          } else {
            mBonus += l.totalScore;
          }
        });

        totalDeduct += mDeduct;
        totalBonus += mBonus;

        // If there are records in the system for this month
        const hasLogsInMonth = disciplineLogs.some((l) => l.month === m) || isPeriodLocked('month', m) || classConfig.weeks.some(w => w.month === m && (w.endDate < localDateString() || isPeriodLocked('week', w.weekNumber)));
        if (hasLogsInMonth) {
          const clamped = getMonthlySummary(m).find(row => row.studentId === s.id)!.finalScore;
          monthlyScores[m] = clamped;
          scoreSum += clamped;
          monthsWithScoreCount++;
        } else {
          monthlyScores[m] = null;
        }
      });

      const averageScore = scoreLock('semester', semester)?.scores?.[s.id] ?? (monthsWithScoreCount > 0 ? clampScore(scoreSum / monthsWithScoreCount, classConfig.minScore) : classConfig.baseScore);
      
      const semesterLogs = disciplineLogs.filter((l) => l.studentId === s.id && targetMonths.includes(l.month));
      const attStats = calculateAttendanceStats(semesterLogs);
      const hasAbsence = attStats.excusedAbsenceCount > 0 || attStats.unexcusedAbsenceCount > 0 || attStats.truancyCount > 0;

      const finalRank = calculateRank(averageScore, classConfig.rankThresholds);

      return {
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        status: s.status,
        monthlyScores,
        averageScore,
        finalRank,
        totalViolations,
        totalDeduct: Math.round(totalDeduct * 100) / 100,
        totalBonus: Math.round(totalBonus * 100) / 100,
        excusedAbsenceCount: attStats.excusedAbsenceCount,
        unexcusedAbsenceCount: attStats.unexcusedAbsenceCount,
        truancyCount: attStats.truancyCount,
      };
    });
  };

  // Get logs for specific student
  const getStudentLogs = (studentId: string): DisciplineLog[] => {
    return disciplineLogs.filter((l) => l.studentId === studentId);
  };

  // Export full backup JSON
  const exportFullBackupJson = (): string => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      classConfig,
      students,
      behaviorCategories,
      disciplineLogs,
    };
    return JSON.stringify(backupObj, null, 2);
  };

  // Import is additive; every imported ID is scoped to the recipient teacher.
  const restoreFromJson = async (jsonStr: string): Promise<{ success: boolean; message: string; studentCount?: number; logCount?: number }> => {
    try {
      const teacherId = getEffectiveTeacherId();
      if (activeAccount?.role === 'monitor') throw new Error('Lớp trưởng không được khôi phục dữ liệu.');
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed.students) || !Array.isArray(parsed.disciplineLogs)) throw new Error('Tệp phải có danh sách students và disciplineLogs.');
      const data = scopeBackup(parsed, teacherId, auth.currentUser!.uid, classConfig);
      await saveClassConfigToCloud(data.classConfig);
      // Students are committed first so log rules can validate their references.
      for (const [name, records] of [['students', data.students], ['behaviorCategories', data.behaviorCategories], ['disciplineLogs', data.disciplineLogs]] as const) {
        const size = name === 'disciplineLogs' ? 10 : 400;
        for (let offset = 0; offset < records.length; offset += size) {
          const batch = writeBatch(db);
          records.slice(offset, offset + size).forEach((record) => batch.set(doc(db, name, record.id), record));
          await batch.commit();
        }
      }
      return { success: true, message: 'Đã nhập bản sao lưu vào dữ liệu của tài khoản hiện tại.', studentCount: data.students.length, logCount: data.disciplineLogs.length };
    } catch (error: any) { return { success: false, message: 'Không thể khôi phục: ' + error.message + '. Nếu nhập dở dang, có thể thử lại cùng tệp.' }; }
  };

  // Reset to initial sample data
  const resetToSampleData = async () => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) throw new Error('Vui lòng đăng xuất trước khi xem dữ liệu mẫu.');
    setClassConfig(INITIAL_CLASS_CONFIG);
    setStudents(INITIAL_STUDENTS);
    setBehaviorCategories(INITIAL_BEHAVIOR_CATEGORIES);
    setDisciplineLogs(INITIAL_DISCIPLINE_LOGS);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthLoading,
        isLocalMode,
        setLocalMode: setIsLocalMode,
        isCloudSyncing,
        cloudSyncError,
        isGoogleAuth,
        login,
        registerWithGoogle,
        registerQuickOneTouch,
        loginAsGuest,
        registerWithEmailPassword,
        loginUserWithEmailPassword,
        logout,
        syncLocalToCloud,

        // RBAC
        userRole,
        activeAccount,
        userAccounts,
        schoolClasses,
        lockedPeriods: lockedPeriods.filter(period => period.classId === classConfig.id || (!period.classId && classConfig.scopeVersion !== 2)),
        inspectorModeClass,
        workspaceClasses,
        selectWorkspaceClass,
        createWorkspaceClass,
        deleteWorkspaceClass,
        isPeriodLocked,
        loginAsRole,
        switchAccount,
        enterInspectorMode,
        exitInspectorMode,
        switchWorkingClass,
        toggleLockPeriod,
        updateUserAccount,
        resetUserPassword,
        toggleUserAccountStatus,
        deleteUserAccount,
        addUserAccount,
        createClassMonitorAccount,
        getClassMonitorAccount,
        toggleMonitorPermission,
        deleteSchoolClass,
        purgeOrphanedClasses,
        addSchoolClass,

        classConfig,
        students,
        behaviorCategories,
        disciplineLogs,

        updateClassConfig,
        addStudent,
        updateStudent,
        deleteStudent,
        deleteStudentsBatch,
        toggleStudentStatus,
        importStudentsBatch,

        addBehaviorCategory,
        updateBehaviorCategory,
        toggleBehaviorCategoryActive,
        deleteBehaviorCategory,
        resetBehaviorCategoriesToDefault,

        updateAchievementRule,
        addAchievementRule,
        deleteAchievementRule,
        resetAchievementRulesToDefault,
        awardAchievementBonus,
        batchAwardAchievementBonus,
        revokeAchievementBonus,

        addDisciplineLog,
        addBulkDisciplineLogs,
        updateDisciplineLog,
        moveDisciplineLogToWeek,
        batchMoveDisciplineLogsToWeek,
        deleteDisciplineLog,
        restoreDisciplineLog,
        importDisciplineLogsBatch,

        getWeeklySummary,
        getMonthlySummary,
        getSemesterSummary,
        getStudentLogs,

        exportFullBackupJson,
        restoreFromJson,
        resetToSampleData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
