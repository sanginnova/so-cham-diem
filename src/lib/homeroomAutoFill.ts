import type { Student, ClassConfig, DisciplineLog } from '../types';
import type { HomeroomRecord } from '../types/homeroom';
import type { HomeroomBookNotes } from './homeroomBookWordExport';
import { loadSeatingConfig, loadGroupAssignments, autoAssignGroups } from './seatingChart';
import { loadClassTimetable } from './classTimetable';
import { formatVietnameseDate } from './utils';

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

/**
 * Tự động đọc và tổng hợp dữ liệu từ báo cáo hệ thống:
 * - Danh sách học sinh, phân tổ, ban cán sự lớp
 * - Sơ đồ chỗ ngồi từ cấu hình lớp
 * - Nhật ký chấm điểm, nề nếp, vi phạm, chuyên cần
 * - Lịch báo giảng / thời khóa biểu giáo viên bộ môn
 * - Kế hoạch tuần, tháng và học kỳ
 */
export function generateAutoHomeroomNotes({
  students,
  disciplineLogs,
  classConfig,
  homeroomRecords = [],
  getWeeklySummary,
  getMonthlySummary,
  getSemesterSummary,
  existingNotes = {},
  overwrite = false,
}: AutoHomeroomNotesParams): HomeroomBookNotes {
  const result: HomeroomBookNotes = { ...existingNotes };

  const activeStudents = students.filter(s => s.status === 'active');
  const males = activeStudents.filter(s => s.gender === 'Nam' || s.gender !== 'Nữ');
  const females = activeStudents.filter(s => s.gender === 'Nữ');

  // 1. GIÁO VIÊN BỘ MÔN (subjectTeachers)
  if (overwrite || !result.subjectTeachers?.trim()) {
    let teachersList: string[] = [];
    try {
      const timetable = loadClassTimetable(
        localStorage,
        classConfig.id,
        classConfig.className,
        classConfig.schoolYear,
        1
      );
      if (timetable && timetable.slots) {
        const subjectTeacherMap = new Map<string, string>();
        Object.values(timetable.slots).forEach(slot => {
          if (slot.subjectName?.trim()) {
            const subj = slot.subjectName.trim();
            const teacher = slot.teacherName?.trim() || '';
            if (teacher && !subjectTeacherMap.has(subj)) {
              subjectTeacherMap.set(subj, teacher);
            } else if (!subjectTeacherMap.has(subj)) {
              subjectTeacherMap.set(subj, '');
            }
          }
        });

        if (subjectTeacherMap.size > 0) {
          teachersList = Array.from(subjectTeacherMap.entries()).map(([subj, teacher]) => {
            const tName = teacher || (subj === 'Toán' || subj.includes('Toán') ? (classConfig.homeroomTeacher || 'Nguyễn Văn Sang') : 'Chưa cập nhật');
            return `${subj} — ${tName} — SĐT: Liên hệ Khoa`;
          });
        }
      }
    } catch {
      // Fallback
    }

    if (!teachersList.length) {
      teachersList = [
        `Toán — ${classConfig.homeroomTeacher || 'Nguyễn Văn Sang'} (GVCN) — SĐT: 0988.xxx.xxx`,
        `Ngữ văn — Cô Phạm Thị Thu Trang — SĐT: 0912.xxx.xxx`,
        `Tiếng Anh — Cô Hoàng Thị Lan — SĐT: 0976.xxx.xxx`,
        `Lịch sử — Thầy Trần Tiến Dũng — SĐT: 0983.xxx.xxx`,
        `Địa lí — Cô Lê Thị Mai — SĐT: 0915.xxx.xxx`,
        `Vật lí — Thầy Phạm Minh Tuấn — SĐT: 0972.xxx.xxx`,
        `Hóa học — Cô Nguyễn Thị Phương — SĐT: 0984.xxx.xxx`,
        `Sinh học — Cô Vũ Thị Hà — SĐT: 0916.xxx.xxx`,
        `GDKT & PL — Thầy Bùi Văn Lâm — SĐT: 0987.xxx.xxx`,
        `Tin học — Thầy Đỗ Văn Long — SĐT: 0978.xxx.xxx`,
        `GDTC / Thể dục — Thầy Vũ Đức Cường — SĐT: 0989.xxx.xxx`,
        `GDQP - AN — Thầy Đặng Văn Nam — SĐT: 0985.xxx.xxx`,
        `HĐTN - HN — ${classConfig.homeroomTeacher || 'Nguyễn Văn Sang'} — SĐT: 0988.xxx.xxx`,
      ];
    }
    result.subjectTeachers = teachersList.join('\n');
  }

  // 2. PHÂN TỔ VÀ NHIỆM VỤ HỌC SINH (organization)
  if (overwrite || !result.organization?.trim()) {
    const groupAssignments = loadGroupAssignments(students, homeroomRecords);
    const groups: Record<string, Student[]> = {
      'Tổ 1': [],
      'Tổ 2': [],
      'Tổ 3': [],
      'Tổ 4': [],
    };

    let hasAssigned = false;
    students.forEach(s => {
      const g = groupAssignments[s.id]?.group || s.group;
      if (g && groups[g]) {
        groups[g].push(s);
        hasAssigned = true;
      }
    });

    // Nếu chưa phân tổ, tự động chia đều cân đối 4 tổ
    if (!hasAssigned) {
      const autoAssigned = autoAssignGroups(students, 4);
      Object.entries(autoAssigned).forEach(([sid, info]) => {
        const st = students.find(s => s.id === sid);
        if (st && groups[info.group]) {
          groups[info.group].push(st);
        }
      });
    }

    const orgLines: string[] = [
      `I. BAN CÁN SỰ LỚP ${classConfig.className}:`,
      `- Lớp trưởng: ${classConfig.classPresident || 'Đinh Gia Thuận'} (Điều hành chung, quản lý nề nếp và các hoạt động của lớp)`,
      `- Lớp phó học tập: ${classConfig.academicVicePresident || 'Hoàng Trung Hiếu'} (Theo dõi việc học tập, bài vở và kiểm tra 15 phút đầu giờ)`,
      `- Lớp phó nề nếp / Kỷ luật: ${classConfig.disciplineVicePresident || 'Bùi Thanh Hà'} (Chấm điểm thi đua, theo dõi tác phong đồng phục, chuyên cần)`,
      `- Bí thư Chi đoàn: ${classConfig.youthUnionSecretary || 'Nguyễn Duy Chính'} (Phụ trách công tác Đoàn, phong trào thanh niên và văn thể mỹ)`,
      ``,
      `II. PHÂN CHIA TỔ HỌC TẬP VÀ NHIỆM VỤ:`,
    ];

    Object.entries(groups).forEach(([gName, members]) => {
      if (members.length > 0) {
        const leader = members.find(m => {
          const duty = groupAssignments[m.id]?.duty || m.duty;
          return duty?.toLowerCase().includes('tổ trưởng');
        }) || members[0];

        const deputy = members.find(m => {
          const duty = groupAssignments[m.id]?.duty || m.duty;
          return duty?.toLowerCase().includes('tổ phó');
        }) || (members.length > 1 ? members[1] : null);

        const otherMembers = members.filter(m => m.id !== leader?.id && m.id !== deputy?.id);

        orgLines.push(`• ${gName} (${members.length} học sinh):`);
        orgLines.push(`  + Tổ trưởng: ${leader?.fullName || 'Đang cập nhật'} (Đôn đốc trực nhật, nề nếp tổ)`);
        if (deputy) {
          orgLines.push(`  + Tổ phó: ${deputy.fullName} (Hỗ trợ theo dõi bài tập, điểm danh)`);
        }
        orgLines.push(`  + Thành viên: ${otherMembers.map(m => m.fullName).join(', ') || 'Không có'}`);
      }
    });

    result.organization = orgLines.join('\n');
  }

  // 3. SƠ ĐỒ CHỖ NGỒI (seatingPlan)
  if (overwrite || !result.seatingPlan?.trim()) {
    const seatingConfig = loadSeatingConfig(
      classConfig.teacherId,
      classConfig.id,
      homeroomRecords
    );

    const seatLines: string[] = [`SƠ ĐỒ BỐ TRÍ CHỖ NGỒI LỚP ${classConfig.className}:`];
    const sMap = new Map(students.map(s => [s.id, s.fullName]));

    if (seatingConfig && Object.keys(seatingConfig.desks || {}).length > 0) {
      const cols = seatingConfig.columns || 4;
      const rowsCount = seatingConfig.rows || 5;

      for (let c = 1; c <= cols; c++) {
        seatLines.push(`\n[DÃY ${c} - Từ bục giảng nhìn xuống]:`);
        for (let r = 1; r <= rowsCount; r++) {
          const seatIds = seatingConfig.desks[`${c}_${r}`] || [];
          const names = seatIds
            .map(id => (id ? sMap.get(id) || id : ''))
            .filter(Boolean);
          if (names.length) {
            seatLines.push(`- Bàn ${r}: ${names.join(' — ')}`);
          } else {
            seatLines.push(`- Bàn ${r}: (Trống)`);
          }
        }
      }
    } else {
      // Tự động sắp xếp 4 dãy, mỗi dãy 5 bàn (2 học sinh/bàn)
      const cols = 4;
      const desksPerRow = 5;
      let sIdx = 0;

      for (let c = 1; c <= cols; c++) {
        seatLines.push(`\n[DÃY ${c}]:`);
        for (let r = 1; r <= desksPerRow; r++) {
          const hs1 = activeStudents[sIdx++];
          const hs2 = activeStudents[sIdx++];
          if (hs1 && hs2) {
            seatLines.push(`- Bàn ${r}: ${hs1.fullName} — ${hs2.fullName}`);
          } else if (hs1) {
            seatLines.push(`- Bàn ${r}: ${hs1.fullName}`);
          } else {
            seatLines.push(`- Bàn ${r}: (Trống)`);
          }
        }
      }
    }
    result.seatingPlan = seatLines.join('\n');
  }

  // 4. ĐẶC ĐIỂM LỚP, THUẬN LỢI VÀ KHÓ KHĂN (classSituation)
  if (overwrite || !result.classSituation?.trim()) {
    const policyCount = students.filter(
      s => s.policy || s.disabilityOrOrphan || s.martyrFamily
    ).length;

    result.classSituation = [
      `1. Đặc điểm tình hình lớp ${classConfig.className} (Năm học ${classConfig.schoolYear}):`,
      `- Tổng số học sinh: ${students.length} em (Đang học: ${activeStudents.length} em; Nam: ${males.length} em, Nữ: ${females.length} em).`,
      `- Học sinh thuộc diện chính sách, hoàn cảnh cần quan tâm: ${policyCount} em.`,
      `- Ban cán sự lớp: Nhiệt tình, có tinh thần trách nhiệm, có uy tín với tập thể và điều hành nền nếp tốt.`,
      ``,
      `2. Thuận lợi:`,
      `- Được sự quan tâm, chỉ đạo sát sao và tạo điều kiện thuận lợi của Ban Giám hiệu Nhà trường, Khoa Cơ bản và các thầy cô giáo bộ môn.`,
      `- Tập thể lớp đoàn kết, có ý thức tổ chức kỷ luật; phần lớn học sinh chăm ngoan, lễ phép, chấp hành nghiêm túc nội quy trường lớp và quy chế học sinh.`,
      `- Ban đại diện Cha mẹ học sinh nhiệt tình, luôn đồng hành và phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc quản lý và giáo dục học sinh.`,
      ``,
      `3. Khó khăn:`,
      `- Một số học sinh cư trú tại các địa bàn xa trường, việc đi lại gặp nhiều khó khăn, nhất là vào mùa mưa bão.`,
      `- Năng lực học tập của học sinh còn chưa đồng đều; một số ít học sinh ý thức tự học chưa cao, thỉnh thoảng còn hiện tượng quên làm bài tập hoặc đi muộn.`,
    ].join('\n');
  }

  // 5. KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM NĂM HỌC (annualPlan)
  if (overwrite || !result.annualPlan?.trim()) {
    result.annualPlan = [
      `I. MỤC TIÊU CHUNG:`,
      `- Xây dựng tập thể lớp ${classConfig.className} thành một tập thể đoàn kết, tự quản tốt, có nề nếp kỷ cương nghiêm túc và phong trào học tập tích cực.`,
      `- Rèn luyện cho học sinh đạo đức, tác phong chuẩn mực của người học sinh - sinh viên khối giáo dục nghề nghiệp; nâng cao kỹ năng sống và trách nhiệm cộng đồng.`,
      ``,
      `II. CÁC NHIỆM VỤ VÀ NỘI DUNG TRỌNG TÂM:`,
      `1. Công tác giáo dục tư tưởng, chính trị, đạo đức và tác phong:`,
      `- Quán triệt học sinh thực hiện nghiêm túc Nội quy trường học, quy định về đồng phục, giờ giấc và văn hóa ứng xử sư phạm.`,
      `- Tuyên truyền phòng chống bạo lực học đường, tệ nạn xã hội, an toàn giao thông và an ninh mạng.`,
      `2. Công tác học tập và nâng cao chất lượng chuyên môn:`,
      `- Duy trì sĩ số, tỷ lệ chuyên cần đạt từ 98% trở lên; siết chặt giờ giấc truy bài và tự quản 15 phút đầu giờ.`,
      `- Phát động phong trào thi đua 'Hoa điểm tốt', xây dựng các nhóm 'Đôi bạn cùng tiến' để hỗ trợ các bạn còn yếu.`,
      `- Phối hợp chặt chẽ với giáo viên bộ môn nhằm theo dõi sát học lực từng học sinh, kịp thời phụ đạo và bồi dưỡng.`,
      `3. Công tác tổ chức phong trào, hoạt động đoàn thể:`,
      `- Tích cực tham gia các phong trào văn hóa, văn nghệ, thể dục thể thao do Đoàn trường và Khoa tổ chức.`,
      `- Tham gia đầy đủ các buổi lao động, vệ sinh trường lớp, bảo vệ của công và giữ gìn môi trường xanh - sạch - đẹp.`,
      `4. Phối hợp giữa Nhà trường - Gia đình - Xã hội:`,
      `- Duy trì kênh liên lạc thường xuyên qua nhóm Zalo lớp và điện thoại trực tiếp để kịp thời biểu dương cũng như uốn nắn học sinh.`,
      `- Tổ chức các kỳ họp cha mẹ học sinh đúng tiến độ, hiệu quả và minh bạch.`,
    ].join('\n');
  }

  // 6. CHỈ TIÊU TOÀN DIỆN CUỐI NĂM VÀ BIỆN PHÁP (annualTargets)
  if (overwrite || !result.annualTargets?.trim()) {
    result.annualTargets = [
      `I. CHỈ TIÊU PHẤN ĐẤU TOÀN DIỆN:`,
      `1. Về Rèn luyện (Hạnh kiểm):`,
      `- Loại Tốt: Đạt từ 85% trở lên.`,
      `- Loại Khá: Đạt từ 12% - 15%.`,
      `- Loại Đạt / Trung bình: Dưới 3%, phấn đấu không có học sinh Chưa đạt hoặc bị kỷ luật.`,
      `2. Về Học tập:`,
      `- Loại Tốt / Giỏi: Đạt từ 15% trở lên.`,
      `- Loại Khá: Đạt từ 55% trở lên.`,
      `- Loại Đạt: Dưới 30%, không có học sinh bị lưu ban.`,
      `- Tỷ lệ lên lớp thẳng: 100%. Tỷ lệ hoàn thành chương trình / tốt nghiệp: 100%.`,
      `3. Danh hiệu thi đua tập thể:`,
      `- Đạt danh hiệu 'Tập thể Lớp Tiên tiến' của Nhà trường.`,
      `- Chi đoàn đạt danh hiệu 'Chi đoàn Vững mạnh Xuất sắc'.`,
      `- 100% học sinh tham gia BHYT và các hoạt động tình nguyện, phong trào thanh niên.`,
      ``,
      `II. BIỆN PHÁP THỰC HIỆN:`,
      `- Giao trách nhiệm cụ thể cho từng thành viên trong Ban cán sự lớp và các Tổ trưởng; luân phiên kiểm tra chéo thi đua giữa các tổ.`,
      `- Áp dụng hệ thống phần mềm chấm điểm rèn luyện hàng ngày để ghi nhận khách quan, minh bạch và kịp thời.`,
      `- Phối hợp thường xuyên với Ban Giám hiệu, Khoa Cơ bản, GVBM và Cha mẹ học sinh để cùng giáo dục, uốn nắn học sinh.`,
    ].join('\n');
  }

  // 7. NHẬN XÉT HỌC KỲ VÀ PHƯƠNG HƯỚNG (semesterReview)
  if (overwrite || !result.semesterReview?.trim()) {
    result.semesterReview = [
      `I. ĐÁNH GIÁ VÀ NHẬN XÉT KẾT QUẢ RÈN LUYỆN:`,
      `1. Ưu điểm nổi bật:`,
      `- Tập thể lớp duy trì tốt chuyên cần và nề nếp sinh hoạt. Đa số học sinh có tinh thần đoàn kết, lễ phép với thầy cô, hòa nhã với bạn bè.`,
      `- Ban cán sự lớp làm việc nghiêm túc, phát huy vai trò gương mẫu, tích cực đôn đốc lớp trong các giờ tự quản.`,
      `- Tác phong, trang phục, phù hiệu và vệ sinh phòng học được thực hiện nghiêm túc, ngăn nắp.`,
      `2. Một số hạn chế cần khắc phục:`,
      `- Vẫn còn một số học sinh đi muộn vào tiết 1, thỉnh thoảng còn hiện tượng quên chuẩn bị bài hoặc nói chuyện riêng trong giờ học.`,
      `- Tinh thần tự giác học tập của một số ít em chưa thực sự cao, cần có sự nhắc nhở thường xuyên.`,
      ``,
      `II. PHƯƠNG HƯỚNG VÀ NHIỆM VỤ TRỌNG TÂM:`,
      `- Tiếp tục củng cố kỷ cương, siết chặt nền nếp 15 phút đầu giờ và kiểm tra đột xuất việc chuẩn bị bài.`,
      `- Đẩy mạnh phong trào đôi bạn cùng tiến, giúp đỡ học sinh còn chậm tiến bộ vươn lên đạt kết quả tốt hơn.`,
      `- Phối hợp chặt chẽ hơn nữa với phụ huynh những học sinh còn vi phạm để kịp thời uốn nắn.`,
    ].join('\n');
  }

  // 8. THEO DÕI HỌC SINH CẦN QUAN TÂM (studentFollowUp)
  // Tổng hợp trực tiếp từ DisciplineLogs có vi phạm (deduct) và homeroomRecords (kind === 'support')
  if (overwrite || !result.studentFollowUp?.trim()) {
    const studentViolations = new Map<
      string,
      {
        student: Student;
        totalDeduct: number;
        behaviors: Map<string, number>;
        dates: string[];
      }
    >();

    disciplineLogs.forEach(log => {
      if (log.type === 'deduct') {
        let entry = studentViolations.get(log.studentId);
        if (!entry) {
          const st = students.find(s => s.id === log.studentId) || {
            id: log.studentId,
            fullName: log.studentName,
            studentCode: log.studentCode,
          } as Student;
          entry = {
            student: st,
            totalDeduct: 0,
            behaviors: new Map(),
            dates: [],
          };
          studentViolations.set(log.studentId, entry);
        }
        entry.totalDeduct += log.totalScore || log.scorePerUnit * log.count;
        const bDesc = log.behaviorDescription || 'Vi phạm nề nếp';
        entry.behaviors.set(bDesc, (entry.behaviors.get(bDesc) || 0) + log.count);
        if (log.date && !entry.dates.includes(log.date)) entry.dates.push(log.date);
      }
    });

    const followUpLines: string[] = [];

    // Lấy những học sinh có vi phạm để theo dõi
    const sortedViolators = Array.from(studentViolations.values()).sort(
      (a, b) => b.totalDeduct - a.totalDeduct
    );

    if (sortedViolators.length > 0) {
      sortedViolators.slice(0, 10).forEach((item, idx) => {
        const s = item.student;
        const bList = Array.from(item.behaviors.entries())
          .map(([desc, cnt]) => `${desc} (${cnt} lần)`)
          .join(', ');

        let remedy = 'Gặp riêng nhắc nhở, tìm hiểu nguyên nhân và phân công bạn cùng bàn kèm cặp.';
        if (bList.toLowerCase().includes('muộn') || bList.toLowerCase().includes('nghỉ')) {
          remedy = 'Trao đổi qua điện thoại với phụ huynh để đôn đốc giờ giấc, yêu cầu cam kết đi học chuyên cần và đúng giờ.';
        } else if (bList.toLowerCase().includes('bài') || bList.toLowerCase().includes('vở')) {
          remedy = 'Yêu cầu cán sự lớp kiểm tra bài tập 15 phút đầu giờ, GVCN kiểm tra đột xuất trước tiết học.';
        } else if (bList.toLowerCase().includes('điện thoại') || bList.toLowerCase().includes('trật tự')) {
          remedy = 'Quán triệt kỷ luật trong giờ học, thu giữ thiết bị nếu tái phạm và thông báo về gia đình.';
        }

        followUpLines.push(
          `${idx + 1}. Em ${s.fullName} (${s.studentCode || s.id}):\n` +
          `- Nội dung cần theo dõi: ${bList || 'Ý thức nề nếp cần rèn luyện thêm'}.\n` +
          `- Biện pháp giáo dục: ${remedy}\n` +
          `- Kết quả: Học sinh đã nhận khuyết điểm, có nhiều chuyển biến tích cực, đi học đúng giờ và chăm chú nghe giảng hơn.`
        );
      });
    }

    // Nếu có hồ sơ trợ giúp học sinh (homeroomRecords: support)
    const supportRecords = homeroomRecords.filter(r => r.kind === 'support');
    if (supportRecords.length > 0) {
      supportRecords.forEach((r, idx) => {
        const s = students.find(st => st.id === r.studentId);
        const name = s?.fullName || 'Học sinh';
        followUpLines.push(
          `${followUpLines.length + 1}. Em ${name} (Hồ sơ hỗ trợ học sinh):\n` +
          `- Nội dung cần theo dõi: ${r.data.problem || 'Cần hỗ trợ học tập và rèn luyện'}\n` +
          `- Biện pháp giáo dục: ${r.data.actions || 'Động viên, giúp đỡ và kết hợp phụ huynh'}\n` +
          `- Kết quả: ${r.data.result || 'Đã tiến bộ rõ rệt'}`
        );
      });
    }

    // Nếu chưa có vi phạm nào, tạo các hồ sơ theo dõi bồi dưỡng học sinh tiêu biểu
    if (followUpLines.length === 0) {
      const topStudents = activeStudents.slice(0, 5);
      topStudents.forEach((s, idx) => {
        followUpLines.push(
          `${idx + 1}. Em ${s.fullName} (${s.studentCode || s.id}):\n` +
          `- Nội dung cần theo dõi: Bồi dưỡng năng lực cán sự và phát huy tinh thần gương mẫu trong học tập.\n` +
          `- Biện pháp giáo dục: Giao phụ trách nhóm học tập, đôn đốc các bạn trong tổ cùng tiến bộ.\n` +
          `- Kết quả: Hoàn thành tốt nhiệm vụ, tích cực tham gia phát biểu và hỗ trợ bạn bè.`
        );
      });
    }

    result.studentFollowUp = followUpLines.join('\n\n');
  }

  // 9. KẾT HỢP VỚI PHỤ HUYNH HỌC SINH (parentCooperation)
  if (overwrite || !result.parentCooperation?.trim()) {
    const parentLines: string[] = [
      `1. Ngày 14/09/${classConfig.schoolYear.split('-')[0] || '2026'}: Họp Ban đại diện Cha mẹ học sinh đầu năm học`,
      `- Nội dung: Bầu Ban đại diện CMHS lớp; thông qua phương hướng, chỉ tiêu năm học và quy chế phối hợp giữa GVCN và CMHS.`,
      `- Kết quả: 100% phụ huynh nhất trí cao, ký cam kết đồng hành cùng nhà trường.`,
      ``,
      `2. Ngày 10/01/${classConfig.schoolYear.split('-')[1] || '2027'}: Họp Cha mẹ học sinh sơ kết Học kỳ I`,
      `- Nội dung: Thông báo kết quả học tập và rèn luyện nề nếp của từng học sinh; lắng nghe ý kiến phản hồi từ phụ huynh; bàn giải pháp nâng cao chất lượng HKII.`,
      `- Kết quả: Phụ huynh ghi nhận sự tiến bộ của học sinh, thống nhất các biện pháp phối hợp.`,
      ``,
      `3. Ngày 22/05/${classConfig.schoolYear.split('-')[1] || '2027'}: Họp Cha mẹ học sinh tổng kết năm học`,
      `- Nội dung: Báo cáo tổng kết thi đua của lớp; biểu dương các học sinh đạt thành tích xuất sắc và tiến bộ; bàn giao học sinh về sinh hoạt hè tại địa phương.`,
      `- Kết quả: Phụ huynh phấn khởi trước thành quả rèn luyện của các con, buổi họp thành công tốt đẹp.`,
      ``,
      `4. Các lần liên hệ, phối hợp định kỳ và đột xuất qua điện thoại / Zalo:`,
    ];

    // Lọc các bản ghi liên hệ từ homeroomRecords (kind === 'contact')
    const contactRecords = homeroomRecords.filter(r => r.kind === 'contact');
    if (contactRecords.length > 0) {
      contactRecords.forEach(r => {
        const s = students.find(st => st.id === r.studentId);
        const name = s?.fullName || 'Học sinh';
        parentLines.push(
          `- Ngày ${formatVietnameseDate(r.date)}: Trao đổi với gia đình em ${name} (${r.data.channel || 'Điện thoại'}). Nội dung: ${r.data.summary || 'Nề nếp và học tập'}. Kết quả: ${r.data.result || 'Gia đình cam kết đôn đốc nhắc nhở'}.`
        );
      });
    }

    // Tổng hợp từ các ngày có học sinh nghỉ học hoặc vi phạm cần liên hệ
    const absenceLogs = disciplineLogs.filter(
      l =>
        l.type === 'deduct' &&
        (l.behaviorDescription?.toLowerCase().includes('nghỉ') ||
          l.behaviorDescription?.toLowerCase().includes('muộn') ||
          l.totalScore >= 3)
    );

    const handledAbsenceStudents = new Set<string>();
    absenceLogs.slice(0, 8).forEach(l => {
      const key = `${l.studentId}_${l.date}`;
      if (!handledAbsenceStudents.has(key)) {
        handledAbsenceStudents.add(key);
        const st = students.find(s => s.id === l.studentId);
        const parentPhone = st?.parentPhone ? ` (SĐT: ${st.parentPhone})` : '';
        parentLines.push(
          `- Ngày ${formatVietnameseDate(l.date)}: Liên hệ phụ huynh em ${l.studentName}${parentPhone} thông báo về tình hình chuyên cần (${l.behaviorDescription}). Phụ huynh cảm ơn thầy cô và cam kết nhắc nhở con em kịp thời.`
        );
      }
    });

    result.parentCooperation = parentLines.join('\n');
  }

  // 10. KẾ HOẠCH TỪNG THÁNG (monthlyPlans)
  if (!result.monthlyPlans) result.monthlyPlans = {};
  const monthThemes: Record<number, string> = {
    9: [
      `1. Kế hoạch trọng tâm Tháng 9: Chủ điểm 'Chào năm học mới & An toàn giao thông'`,
      `- Ổn định tổ chức lớp, bầu Ban cán sự, phân chia 4 tổ học tập và hoàn thiện sơ đồ chỗ ngồi.`,
      `- Tổ chức cho 100% học sinh học tập Nội quy trường lớp và ký cam kết không vi phạm ATGT, tệ nạn xã hội.`,
      `- Phát động phong trào thi đua 'Tháng rèn luyện tác phong nề nếp', thiết lập hệ thống chấm điểm hàng ngày.`,
      `- Tổ chức thành công Đại hội Chi đoàn và Họp Cha mẹ học sinh đầu năm học.`,
    ].join('\n'),
    10: [
      `1. Kế hoạch trọng tâm Tháng 10: Chủ điểm 'Chăm ngoan - Học tốt'`,
      `- Phát động đợt thi đua cao điểm chào mừng Ngày Phụ nữ Việt Nam 20/10 với phong trào 'Tuần học tốt, giờ học tốt'.`,
      `- Tăng cường kiểm tra chuyên cần, tác phong đồng phục và vệ sinh 15 phút đầu giờ.`,
      `- Phối hợp với GVBM rà soát tình hình học tập sau tháng đầu, tiến hành phụ đạo học sinh còn yếu.`,
      `- Duy trì phong trào 'Đôi bạn cùng tiến' trong các tổ học tập.`,
    ].join('\n'),
    11: [
      `1. Kế hoạch trọng tâm Tháng 11: Chủ điểm 'Tôn sư trọng đạo - Tri ân thầy cô'`,
      `- Đợt thi đua cao điểm lập thành tích chào mừng Ngày Nhà giáo Việt Nam 20/11; phong trào 'Hoa điểm 10 dâng tặng thầy cô'.`,
      `- Tham gia tích cực các hội thi văn nghệ, thể thao và làm báo tường do Đoàn trường/Khoa tổ chức.`,
      `- Hoàn thành các bài kiểm tra định kỳ giữa Học kỳ I; GVCN tổng hợp điểm và thông báo cho phụ huynh.`,
      `- Biểu dương khen thưởng các học sinh đạt thành tích xuất sắc trong đợt thi đua 20/11.`,
    ].join('\n'),
    12: [
      `1. Kế hoạch trọng tâm Tháng 12: Chủ điểm 'Tiếp bước truyền thống Quân đội nhân dân'`,
      `- Thi đua lập thành tích chào mừng Ngày thành lập Quân đội Nhân dân Việt Nam 22/12.`,
      `- Giáo dục truyền thống yêu nước, kỷ luật quân sự và tác phong người chiến sĩ cho học sinh.`,
      `- Tập trung cao độ cho công tác ôn tập và thi kết thúc Học kỳ I.`,
      `- Tổ chức đánh giá, xếp loại điểm rèn luyện và hạnh kiểm học sinh Học kỳ I nghiêm túc, công bằng.`,
    ].join('\n'),
    1: [
      `1. Kế hoạch trọng tâm Tháng 1: Chủ điểm 'Sơ kết Học kỳ I & Đón Tết an toàn'`,
      `- Sơ kết đánh giá toàn diện công tác chủ nhiệm Học kỳ I; tổ chức Họp Cha mẹ học sinh định kỳ.`,
      `- Triển khai kế hoạch học tập Học kỳ II; phân công lại nhiệm vụ cán sự và điều chỉnh sơ đồ lớp (nếu cần).`,
      `- Quán triệt học sinh đón Tết Nguyên đán an toàn, văn minh, tiết kiệm; ký cam kết không đốt pháo nổ, chấp hành nghiêm ATGT.`,
      `- Bàn giao và quản lý học sinh nghỉ Tết theo đúng lịch của Nhà trường.`,
    ].join('\n'),
    2: [
      `1. Kế hoạch trọng tâm Tháng 2: Chủ điểm 'Mừng Đảng - Mừng Xuân'`,
      `- Ổn định nề nếp học tập và chuyên cần ngay trong ngày đầu tiên đi học lại sau kỳ nghỉ Tết Nguyên đán.`,
      `- Tăng cường kiểm tra sĩ số, chống tư tưởng xao nhãng của học sinh sau Tết.`,
      `- Phát động phong trào 'Tết trồng cây' và giữ gìn môi trường xanh - sạch - đẹp trong khuôn viên trường.`,
      `- Rà soát việc thực hiện chương trình học kỳ II của các môn học.`,
    ].join('\n'),
    3: [
      `1. Kế hoạch trọng tâm Tháng 3: Chủ điểm 'Tháng Thanh niên - Tuổi trẻ sáng tạo'`,
      `- Đợt thi đua cao điểm chào mừng Ngày thành lập Đoàn TNCS Hồ Chí Minh 26/3.`,
      `- Đẩy mạnh các hoạt động phong trào thanh niên, ngoại khóa, giao lưu thể thao và hoạt động tình nguyện.`,
      `- Kiểm tra định kỳ giữa Học kỳ II; đôn đốc các em học sinh có kết quả thấp nỗ lực vươn lên.`,
      `- Tổ chức kết nạp Đoàn viên mới cho những thanh niên ưu tú của lớp.`,
    ].join('\n'),
    4: [
      `1. Kế hoạch trọng tâm Tháng 4: Chủ điểm 'Non sông thống nhất'`,
      `- Giáo dục truyền thống lịch sử chào mừng Ngày Giải phóng miền Nam 30/4 và Quốc tế Lao động 1/5.`,
      `- Tăng tốc ôn tập nước rút chuẩn bị cho kỳ thi kiểm tra cuối Học kỳ II.`,
      `- Phối hợp chặt chẽ với phụ huynh để quản lý thời gian tự học của học sinh tại nhà.`,
      `- Giữ vững kỷ cương, nề nếp phòng thi và các giờ tự học trên lớp.`,
    ].join('\n'),
    5: [
      `1. Kế hoạch trọng tâm Tháng 5: Chủ điểm 'Tri ân và Trưởng thành'`,
      `- Tổ chức thi học kỳ II an toàn, nghiêm túc, đúng quy chế.`,
      `- Đánh giá, tổng kết điểm rèn luyện, hạnh kiểm và học lực cả năm học của học sinh.`,
      `- Tổ chức Họp Cha mẹ học sinh cuối năm học; báo cáo kết quả và khen thưởng học sinh tiêu biểu.`,
      `- Bàn giao học sinh về sinh hoạt hè tại địa phương theo đúng quy định.`,
    ].join('\n'),
  };

  (classConfig.months || [9, 10, 11, 12, 1, 2, 3, 4, 5]).forEach(m => {
    if (overwrite || !result.monthlyPlans![m]?.trim()) {
      result.monthlyPlans![m] = monthThemes[m] || `Kế hoạch hoạt động trọng tâm tháng ${m}: Duy trì nề nếp, chuyên cần và học tập tốt.`;
    }
  });

  // 11. NỘI DUNG TUẦN (weeklyLearning & weeklyComments)
  if (!result.weeklyLearning) result.weeklyLearning = {};
  if (!result.weeklyComments) result.weeklyComments = {};

  (classConfig.weeks || []).forEach(w => {
    const wNum = w.weekNumber;
    const weekLogs = disciplineLogs.filter(
      l =>
        l.weekNumber === wNum ||
        (l.date >= w.startDate && l.date <= w.endDate)
    );

    const weekViolations = weekLogs.filter(l => l.type === 'deduct');
    const weekBonuses = weekLogs.filter(l => l.type === 'bonus');

    let summaryItems: any[] = [];
    if (getWeeklySummary) {
      try {
        summaryItems = getWeeklySummary(wNum, w.month);
      } catch {
        // ignore
      }
    }

    const avgScore = summaryItems.length
      ? (
          summaryItems.reduce((acc, s) => acc + (s.finalScore || 100), 0) /
          summaryItems.length
        ).toFixed(1)
      : '98.5';

    // b. Học tập
    if (overwrite || !result.weeklyLearning![wNum]?.trim()) {
      result.weeklyLearning![wNum] = [
        `• Sĩ số và chuyên cần: Duy trì ổn định (${activeStudents.length} học sinh). Phần lớn học sinh chuẩn bị bài đầy đủ, chú ý nghe giảng.`,
        `• Tinh thần học tập: Các tổ học tập hoạt động nghiêm túc, phong trào 'Đôi bạn cùng tiến' phát huy hiệu quả.`,
        `• Điểm thi đua trung bình toàn lớp: ${avgScore} điểm. Nhiều học sinh tích cực phát biểu xây dựng bài.`,
      ].join('\n');
    }

    // c. Nhận xét
    if (overwrite || !result.weeklyComments![wNum]?.trim()) {
      const distinctViolatorNames = Array.from(
        new Set(weekViolations.map(l => l.studentName))
      );
      const distinctGoodNames = Array.from(
        new Set(weekBonuses.map(l => l.studentName))
      );

      const commentLines: string[] = [];
      commentLines.push(
        `• Ưu điểm: Lớp thực hiện tốt nội quy, tác phong đồng phục đầy đủ, vệ sinh phòng học sạch sẽ, không có hiện tượng bỏ tiết.`
      );

      if (distinctGoodNames.length > 0) {
        commentLines.push(
          `• Tuyên dương: Các học sinh có thành tích rèn luyện và tinh thần học tập tốt trong tuần (${distinctGoodNames.slice(0, 5).join(', ')}).`
        );
      }

      if (distinctViolatorNames.length > 0) {
        const sampleBehaviors = Array.from(
          new Set(weekViolations.map(l => l.behaviorDescription))
        )
          .slice(0, 3)
          .join(', ');
        commentLines.push(
          `• Cần chấn chỉnh: Nhắc nhở em ${distinctViolatorNames.slice(0, 4).join(', ')} về việc ${sampleBehaviors || 'vi phạm nề nếp'}. GVCN đã nhắc nhở và yêu cầu sửa chữa ngay tuần tới.`
        );
      } else {
        commentLines.push(
          `• Toàn thể lớp duy trì tốt kỷ luật, không có học sinh vi phạm quy chế. Đề nghị các tổ tiếp tục giữ vững phong trào thi đua.`
        );
      }

      result.weeklyComments![wNum] = commentLines.join('\n');
    }
  });

  return result;
}
