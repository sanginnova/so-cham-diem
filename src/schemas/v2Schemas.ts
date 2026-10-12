import { z } from 'zod';

export const UserRoleV2Schema = z.enum([
  'owner',
  'admin',
  'inspector',
  'manager',
  'teacher',
  'recorder',
]);

export const UserStatusV2Schema = z.enum(['active', 'disabled']);

export const UserProfileV2Schema = z.object({
  uid: z.string().min(1, 'UID không được rỗng'),
  email: z.string().email('Email không đúng định dạng'),
  displayName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  role: UserRoleV2Schema,
  schoolId: z.string().min(1, 'Mã trường không được để trống'),
  assignedClassIds: z.array(z.string()).optional(),
  departmentId: z.string().optional(),
  phoneNumber: z.string().optional(),
  status: UserStatusV2Schema,
});

export const StudentStatusV2Schema = z.enum([
  'active',
  'transferred',
  'graduated',
  'dropped',
]);

export const StudentV2Schema = z.object({
  studentCode: z
    .string()
    .min(1, 'Mã học sinh không được rỗng')
    .max(50, 'Mã học sinh quá dài'),
  fullName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  firstName: z.string().min(1, 'Tên không được rỗng'),
  lastName: z.string().min(1, 'Họ đệm không được rỗng'),
  gender: z.enum(['Nam', 'Nữ']).optional(),
  birthDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, 'Ngày sinh không đúng định dạng (YYYY-MM-DD hoặc DD/MM/YYYY)')
    .optional()
    .or(z.literal('')),
  parentPhone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại phụ huynh không đúng định dạng')
    .optional()
    .or(z.literal('')),
  parentLookupToken: z.string().optional(),
  status: StudentStatusV2Schema.default('active'),
  schoolId: z.string().min(1),
});

export const EnrollmentV2Schema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  academicYearId: z.string().min(1),
  semesterId: z.string().optional(),
  status: z.enum(['active', 'transferred', 'completed']).default('active'),
});

export const BehaviorCategoryV2Schema = z.object({
  code: z.string().min(1, 'Mã tiêu chí không được rỗng'),
  name: z.string().min(2, 'Tên tiêu chí tối thiểu 2 ký tự'),
  group: z.enum([
    'attendance',
    'uniform',
    'study',
    'attitude',
    'dormitory',
    'safety',
    'activity',
    'other',
  ]),
  type: z.enum(['deduct', 'bonus']),
  points: z.number().positive('Số điểm phải lớn hơn 0'),
  scope: z.enum(['school', 'class']).default('school'),
  classId: z.string().optional(),
  active: z.boolean().default(true),
});

export const DisciplineLogV2CreateSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  semesterId: z.string().min(1),
  classId: z.string().min(1, 'Vui lòng chọn lớp học'),
  studentId: z.string().min(1, 'Vui lòng chọn học sinh'),
  categoryId: z.string().min(1, 'Vui lòng chọn hành vi/tiêu chuẩn'),
  categoryNameSnapshot: z.string().min(1),
  type: z.enum(['deduct', 'bonus']),
  points: z.number().positive('Điểm phải lớn hơn 0'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sự kiện phải có định dạng YYYY-MM-DD'),
  lessonPeriod: z.string().optional(),
  notes: z.string().max(500, 'Ghi chú không vượt quá 500 ký tự').optional(),
  reporterId: z.string().min(1),
  reporterName: z.string().min(1),
  source: z.enum(['teacher', 'manager', 'recorder', 'admin', 'import']),
});

export const BulkDisciplineLogV2Schema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  semesterId: z.string().min(1),
  classId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1, 'Chọn ít nhất 1 học sinh'),
  categoryId: z.string().min(1),
  categoryNameSnapshot: z.string().min(1),
  type: z.enum(['deduct', 'bonus']),
  points: z.number().positive(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lessonPeriod: z.string().optional(),
  notes: z.string().max(500).optional(),
  reporterId: z.string().min(1),
  reporterName: z.string().min(1),
  source: z.enum(['teacher', 'manager', 'recorder', 'admin', 'import']),
});

export const PeriodLockV2Schema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  semesterId: z.string().min(1),
  classId: z.string().min(1),
  periodType: z.enum(['week', 'month', 'semester']),
  periodNumber: z.number().int().positive(),
  status: z.enum(['open', 'locked']),
  reason: z.string().optional(),
});

export const UnlockPeriodV2Schema = z.object({
  lockId: z.string().min(1),
  reason: z.string().min(10, 'Lý do mở khóa phải có ít nhất 10 ký tự để lưu vết kiểm toán'),
});

export const AuditLogV2Schema = z.object({
  schoolId: z.string().min(1),
  actorId: z.string().min(1),
  actorName: z.string().min(1),
  actorRole: z.string().min(1),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  reason: z.string().optional(),
});
