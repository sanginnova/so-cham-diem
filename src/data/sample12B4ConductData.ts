// Dữ liệu mẫu Sổ Chấm Điểm Rèn Luyện Lớp 12B4 Tháng 10
// Nguồn trích xuất chuẩn 100% từ file: D:\TOAN\CĐN01\12B4\12B4- Chấm điểm rèn luyện tháng 10.xlsx

export interface SampleConductItem {
  stt: number | string;
  name: string;
  score: number | string | null;
  violations: string;
  bonuses: string;
}

export interface SampleConductWeek {
  sheetName: string;
  weekNumber: number;
  month: number;
  students: SampleConductItem[];
}

export const SAMPLE_12B4_CONDUCT_DATA: SampleConductWeek[] = [
  {
    "sheetName": "T1-T10",
    "weekNumber": 1,
    "month": 10,
    "students": [
      {
        "stt": 1,
        "name": "Nguyễn Quang Anh",
        "score": "Bỏ học",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 2,
        "name": "Trần Duy Anh",
        "score": "Đi học đủ.",
        "violations": "Không làm bt vật lí",
        "bonuses": "Không làm bt vật lí"
      },
      {
        "stt": 3,
        "name": "Phạm Quốc Bảo",
        "score": "Đi học đủ; tổ trưởng hoàn thành tốt nhiệm vụ; 9đ GDKT-PL",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 4,
        "name": "Nguyễn Duy Chinh",
        "score": null,
        "violations": "Đi học muộn",
        "bonuses": "Đi học muộn"
      },
      {
        "stt": 5,
        "name": "Hà Nhất Chính",
        "score": "9đ GDKT-PL; đi đủ.",
        "violations": "Hay ngủ trong giờ",
        "bonuses": "Hay ngủ trong giờ"
      },
      {
        "stt": 6,
        "name": "Dương Đức Cường",
        "score": null,
        "violations": "Nghỉ học không phép 01; đi học muộn 01",
        "bonuses": "Nghỉ học không phép 01; đi học muộn 01"
      },
      {
        "stt": 7,
        "name": "Đặng Việt Dũng",
        "score": "9đ GDKT-PL; đi đủ.",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 8,
        "name": "Lê Trung Dũng",
        "score": null,
        "violations": "Thường xuyên ngủ trong giờ",
        "bonuses": "Thường xuyên ngủ trong giờ"
      },
      {
        "stt": 9,
        "name": "Trần Tiến Dũng",
        "score": "Nằm viện",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 10,
        "name": "Đặng Ngọc Duy",
        "score": "Đi học đủ",
        "violations": "Nói chuyện trong giờ.",
        "bonuses": "Nói chuyện trong giờ."
      },
      {
        "stt": 11,
        "name": "Phạm Quốc Đại",
        "score": "Đi học đủ",
        "violations": "Cần tích cực hơn",
        "bonuses": "Cần tích cực hơn"
      },
      {
        "stt": 12,
        "name": "Kiều Duy Đạt",
        "score": "10 môn Sử; 9 Văn;10 Hóa; Lớp trưởng thực hiện tốt nhiệm vụ",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 13,
        "name": "Bùi Thanh Hà",
        "score": null,
        "violations": "Nghỉ học không phép 01; đi học muộn 01",
        "bonuses": "Nghỉ học không phép 01; đi học muộn 01"
      },
      {
        "stt": 14,
        "name": "Trần Văn Hiển",
        "score": "Đi học đủ; 9 điểm Văn; tổ trưởng hoàn thành tốt nhiệm vụ",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 15,
        "name": "Hoàng Trung Hiếu",
        "score": null,
        "violations": "Mất trật tư; đổi chỗ; không soạn văn.",
        "bonuses": "Mất trật tư; đổi chỗ; không soạn văn."
      },
      {
        "stt": 16,
        "name": "Nguyễn Anh Hiếu",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 17,
        "name": "Phạm Xuân Hòa",
        "score": null,
        "violations": "Không làm bài tập Vật lí",
        "bonuses": "Không làm bài tập Vật lí"
      },
      {
        "stt": 18,
        "name": "Nông Việt Hoàng",
        "score": "Đi học đủ",
        "violations": "Ngủ trong giờ, không làm bt vật lí",
        "bonuses": "Ngủ trong giờ, không làm bt vật lí"
      },
      {
        "stt": 19,
        "name": "Âu Đình Huấn",
        "score": "Đi học đủ",
        "violations": "Ngủ trong giờ",
        "bonuses": "Ngủ trong giờ"
      },
      {
        "stt": 20,
        "name": "Ngô Gia Khánh",
        "score": "9đ Văn; Đi học đủ",
        "violations": "Mất trật tự",
        "bonuses": "Mất trật tự"
      },
      {
        "stt": 21,
        "name": "Nguyễn Đình Khánh",
        "score": "Đi đủ; 9đ môn GDKT",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 22,
        "name": "Nguyễn Anh Khoa",
        "score": "9 đ Văn; GDKT ",
        "violations": "Đi học muộn",
        "bonuses": "Đi học muộn"
      },
      {
        "stt": 23,
        "name": "Hoàng Trung Lâm",
        "score": "Đi đủ",
        "violations": "Thường xuyên ngủ trong giờ, không làm bt vật lí",
        "bonuses": "Thường xuyên ngủ trong giờ, không làm bt vật lí"
      },
      {
        "stt": 24,
        "name": "Nguyễn Hoàng Lịch",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 25,
        "name": "Phùng Gia Linh",
        "score": "9 Văn; Đi học đủ",
        "violations": "Không làm bt vật lí, không nộp điện thoại",
        "bonuses": "Không làm bt vật lí, không nộp điện thoại"
      },
      {
        "stt": 26,
        "name": "Mông Vũ Luân",
        "score": "Đi đủ",
        "violations": "Thu điện thoại, mất trật tự.",
        "bonuses": "Thu điện thoại, mất trật tự."
      },
      {
        "stt": 27,
        "name": "Đặng Văn Nghị",
        "score": "Đi đủ; 9 Văn",
        "violations": "Không làm bt vật lí",
        "bonuses": "Không làm bt vật lí"
      },
      {
        "stt": 28,
        "name": "Nguyễn Vũ Yên Nguyên",
        "score": "Đi đủ",
        "violations": "Mất trật tự",
        "bonuses": "Mất trật tự"
      },
      {
        "stt": 29,
        "name": "Bùi Lý Minh Nhật",
        "score": "Đi đủ",
        "violations": "Đổi chỗ tự do, không soạn văn, không làm bt",
        "bonuses": "Đổi chỗ tự do, không soạn văn, không làm bt"
      },
      {
        "stt": 30,
        "name": "Hoàng Minh Quân",
        "score": null,
        "violations": "Đi muộn; không soạn văn",
        "bonuses": "Đi muộn; không soạn văn"
      },
      {
        "stt": 31,
        "name": "Nguyễn Văn Thắng",
        "score": "Đi đủ",
        "violations": "Mất trật tự; không soạn văn",
        "bonuses": "Mất trật tự; không soạn văn"
      },
      {
        "stt": 32,
        "name": "Đinh Gia Thuận",
        "score": "Văn; GDKT 9;9",
        "violations": "Mất trật tự; đi học muộn",
        "bonuses": "Mất trật tự; đi học muộn"
      },
      {
        "stt": 33,
        "name": "Nguyễn Minh Tiến",
        "score": "Rút hồ sơ",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 34,
        "name": "Hoàng Hữu Tiệp",
        "score": null,
        "violations": "Nghỉ học không phép 01",
        "bonuses": "Nghỉ học không phép 01"
      },
      {
        "stt": 35,
        "name": "Nguyễn Minh Trí",
        "score": "2 điểm 10 Văn, Sử; Đi học đủ; Tổ trưởng thực hiện tốt nhiệm vụ",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 36,
        "name": "Hà Bảo Trung",
        "score": null,
        "violations": "Cãi giáo viên; đi học muộn; không đủ sách vở; không ghi bài; không đồng phục",
        "bonuses": "Cãi giáo viên; đi học muộn; không đủ sách vở; không ghi bài; không đồng phục"
      },
      {
        "stt": 37,
        "name": "Nguyễn Văn Tú",
        "score": null,
        "violations": "Đi học muộn; nghỉ không phép; thiếu đồ dùng học tập; không soạn văn",
        "bonuses": "Đi học muộn; nghỉ không phép; thiếu đồ dùng học tập; không soạn văn"
      },
      {
        "stt": 38,
        "name": "Nguyễn Nam Tùng",
        "score": "10 Sử; Đi học đủ",
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 39,
        "name": "Trần Trọng Tuyên",
        "score": null,
        "violations": "Đi học muộn; không làm bt vật lí",
        "bonuses": "Đi học muộn; không làm bt vật lí"
      },
      {
        "stt": 40,
        "name": "Nhâm Hoàng Việt",
        "score": "đi học đủ",
        "violations": "Ngủ trong giờ",
        "bonuses": "Ngủ trong giờ"
      }
    ]
  },
  {
    "sheetName": "T2-T10",
    "weekNumber": 1,
    "month": 10,
    "students": [
      {
        "stt": 1,
        "name": "Nguyễn Quang Anh",
        "score": "Bỏ học",
        "violations": "",
        "bonuses": "Bỏ học"
      },
      {
        "stt": 2,
        "name": "Trần Duy Anh",
        "score": "10 điểm địa; ",
        "violations": "Trốn chào cờ; không làm bài tập vật lí.",
        "bonuses": "10 điểm địa;"
      },
      {
        "stt": 3,
        "name": "Phạm Quốc Bảo",
        "score": "Tổ trưởng hoàn thành tốt nhiệm vụ",
        "violations": "đi muộn",
        "bonuses": "Tổ trưởng hoàn thành tốt nhiệm vụ"
      },
      {
        "stt": 4,
        "name": "Nguyễn Duy Chinh",
        "score": null,
        "violations": "Trốn chào cờ; Ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 5,
        "name": "Hà Nhất Chính",
        "score": "Đi đủ",
        "violations": "Ngủ trong giờ",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 6,
        "name": "Dương Đức Cường",
        "score": null,
        "violations": "đi học muộn, hay nghỉ học",
        "bonuses": ""
      },
      {
        "stt": 7,
        "name": "Đặng Việt Dũng",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 8,
        "name": "Lê Trung Dũng",
        "score": null,
        "violations": "Ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 9,
        "name": "Trần Tiến Dũng",
        "score": null,
        "violations": "Mất trật tự; Vào lớp muộn; Ăn quà trong giờ",
        "bonuses": ""
      },
      {
        "stt": 10,
        "name": "Đặng Ngọc Duy",
        "score": "Đi đủ",
        "violations": "Mất trật tự",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 11,
        "name": "Phạm Quốc Đại",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 12,
        "name": "Kiều Duy Đạt",
        "score": "10 Vật lý; Hóa 10; đi học đủ; lớp trưởng quản lí lớp tốt",
        "violations": "",
        "bonuses": "10 Vật lý; Hóa 10; đi học đủ; lớp trưởng quản lí lớp tốt"
      },
      {
        "stt": 13,
        "name": "Bùi Thanh Hà",
        "score": null,
        "violations": "Đi học muộn",
        "bonuses": ""
      },
      {
        "stt": 14,
        "name": "Trần Văn Hiển",
        "score": "10 Sử; tổ trưởng quản lí lớp tốt; đi đủ",
        "violations": "",
        "bonuses": "10 Sử; tổ trưởng quản lí lớp tốt; đi đủ"
      },
      {
        "stt": 15,
        "name": "Hoàng Trung Hiếu",
        "score": null,
        "violations": "mất trật tự",
        "bonuses": ""
      },
      {
        "stt": 16,
        "name": "Nguyễn Anh Hiếu",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 17,
        "name": "Phạm Xuân Hòa",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 18,
        "name": "Nông Việt Hoàng",
        "score": null,
        "violations": "Ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 19,
        "name": "Âu Đình Huấn",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 20,
        "name": "Ngô Gia Khánh",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 21,
        "name": "Nguyễn Đình Khánh",
        "score": "Đi đủ",
        "violations": "Ngủ trong giờ",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 22,
        "name": "Nguyễn Anh Khoa",
        "score": null,
        "violations": "Đi học muộn 3 lần",
        "bonuses": ""
      },
      {
        "stt": 23,
        "name": "Hoàng Trung Lâm",
        "score": "Đi đủ",
        "violations": "Không có SGK",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 24,
        "name": "Nguyễn Hoàng Lịch",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 25,
        "name": "Phùng Gia Linh",
        "score": null,
        "violations": "Mất trật tự; trong giờ học k tập trung",
        "bonuses": ""
      },
      {
        "stt": 26,
        "name": "Mông Vũ Luân",
        "score": null,
        "violations": "Vào lớp muộn 2 lần; mất trật tự 2 lần",
        "bonuses": ""
      },
      {
        "stt": 27,
        "name": "Đặng Văn Nghị",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 28,
        "name": "Nguyễn Vũ Yên Nguyên",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 29,
        "name": "Bùi Lý Minh Nhật",
        "score": "Đi đủ",
        "violations": "Đổi chỗ tự do; ngủ trong giờ; ăn quà trong giờ",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 30,
        "name": "Hoàng Minh Quân",
        "score": null,
        "violations": "Trốn chào cờ; đi học muộn, ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 31,
        "name": "Nguyễn Văn Thắng",
        "score": null,
        "violations": "Không nộp điện thoại; đi muộn; vào lớp muộn",
        "bonuses": ""
      },
      {
        "stt": 32,
        "name": "Đinh Gia Thuận",
        "score": "đi đủ",
        "violations": "",
        "bonuses": "đi đủ"
      },
      {
        "stt": 33,
        "name": "Nguyễn Minh Tiến",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 34,
        "name": "Hoàng Hữu Tiệp",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 35,
        "name": "Nguyễn Minh Trí",
        "score": "Đi đủ; tổ trưởng hoàn thành tốt nhiệm vụ",
        "violations": "",
        "bonuses": "Đi đủ; tổ trưởng hoàn thành tốt nhiệm vụ"
      },
      {
        "stt": 36,
        "name": "Hà Bảo Trung",
        "score": null,
        "violations": "Trốn chào cờ; không ghi bài; ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 37,
        "name": "Nguyễn Văn Tú",
        "score": null,
        "violations": "Đi học muộn, trốn chào cờ, ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 38,
        "name": "Nguyễn Nam Tùng",
        "score": "Đi đủ",
        "violations": "",
        "bonuses": "Đi đủ"
      },
      {
        "stt": 39,
        "name": "Trần Trọng Tuyên",
        "score": null,
        "violations": "Không làm bt Vật lí, không sách giáo khoa",
        "bonuses": ""
      },
      {
        "stt": 40,
        "name": "Nhâm Hoàng Việt",
        "score": null,
        "violations": "",
        "bonuses": ""
      }
    ]
  },
  {
    "sheetName": "T3-T10",
    "weekNumber": 1,
    "month": 10,
    "students": [
      {
        "stt": 1,
        "name": "Nguyễn Quang Anh",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 2,
        "name": "Trần Duy Anh",
        "score": "đi học đầy đủ (+2 đ)",
        "violations": "ngủ trong giờ (-3đ)",
        "bonuses": "đi học đầy đủ (+2 đ)"
      },
      {
        "stt": 3,
        "name": "Phạm Quốc Bảo",
        "score": "đi học đầy đủ (+2 đ)",
        "violations": "",
        "bonuses": "đi học đầy đủ (+2 đ)"
      },
      {
        "stt": 4,
        "name": "Nguyễn Duy Chinh",
        "score": null,
        "violations": "Đi học muộn; không trực nhật; 0 điểm GDKT-PL;",
        "bonuses": ""
      },
      {
        "stt": 5,
        "name": "Hà Nhất Chính",
        "score": null,
        "violations": "hay ngủ trong giờ , nói chuyện riêng",
        "bonuses": ""
      },
      {
        "stt": 6,
        "name": "Dương Đức Cường",
        "score": null,
        "violations": "hay nghỉ học tự do , đi học muộn",
        "bonuses": ""
      },
      {
        "stt": 7,
        "name": "Đặng Việt Dũng",
        "score": "đi học đầy đủ (+2 đ)",
        "violations": "",
        "bonuses": "đi học đầy đủ (+2 đ)"
      },
      {
        "stt": 8,
        "name": "Lê Trung Dũng",
        "score": "đi học đầy đủ (+2 đ)",
        "violations": "ngủ trong giờ",
        "bonuses": "đi học đầy đủ (+2 đ)"
      },
      {
        "stt": 9,
        "name": "Trần Tiến Dũng",
        "score": null,
        "violations": "mtt(-1đ), nghỉ không phép(-3đ), không viết bài(-1đ)",
        "bonuses": ""
      },
      {
        "stt": 10,
        "name": "Đặng Ngọc Duy",
        "score": "đi học đầy đủ (+2 đ)",
        "violations": "",
        "bonuses": "đi học đầy đủ (+2 đ)"
      },
      {
        "stt": 11,
        "name": "Phạm Quốc Đại",
        "score": "đi học đầy đủ (+2 đ)",
        "violations": "",
        "bonuses": "đi học đầy đủ (+2 đ)"
      },
      {
        "stt": 12,
        "name": "Kiều Duy Đạt",
        "score": "10đ hóa (+2đ)",
        "violations": "",
        "bonuses": "10đ hóa (+2đ)"
      },
      {
        "stt": 13,
        "name": "Bùi Thanh Hà",
        "score": null,
        "violations": "nghỉ không phép",
        "bonuses": ""
      },
      {
        "stt": 14,
        "name": "Trần Văn Hiển",
        "score": null,
        "violations": "nghỉ không phép",
        "bonuses": ""
      },
      {
        "stt": 15,
        "name": "Hoàng Trung Hiếu",
        "score": null,
        "violations": "ngủ trong giờ, đi học muộn , nghỉ học tự do",
        "bonuses": ""
      },
      {
        "stt": 16,
        "name": "Nguyễn Anh Hiếu",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 17,
        "name": "Phạm Xuân Hòa",
        "score": "đi học đầy đủ",
        "violations": "",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 18,
        "name": "Nông Việt Hoàng",
        "score": null,
        "violations": "ngủ trong giờ , không viết bài",
        "bonuses": ""
      },
      {
        "stt": 19,
        "name": "Âu Đình Huấn",
        "score": null,
        "violations": "ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 20,
        "name": "Ngô Gia Khánh",
        "score": "đi học đầy đủ",
        "violations": "",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 21,
        "name": "Nguyễn Đình Khánh",
        "score": null,
        "violations": "Đi học muộn; không trực nhật; 0 điểm GDKT-PL;",
        "bonuses": ""
      },
      {
        "stt": 22,
        "name": "Nguyễn Anh Khoa",
        "score": "10 điểm toán",
        "violations": "Nói chuyện trong giờ; đi học muộn",
        "bonuses": "10 điểm toán"
      },
      {
        "stt": 23,
        "name": "Hoàng Trung Lâm",
        "score": null,
        "violations": "ngủ trong giờ , 0đ vật lí",
        "bonuses": ""
      },
      {
        "stt": 24,
        "name": "Nguyễn Hoàng Lịch",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 25,
        "name": "Phùng Gia Linh",
        "score": null,
        "violations": "không viết bài , ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 26,
        "name": "Mông Vũ Luân",
        "score": null,
        "violations": "không nộp điện thoại , đi học muộn",
        "bonuses": ""
      },
      {
        "stt": 27,
        "name": "Đặng Văn Nghị",
        "score": "đi học đầy đủ",
        "violations": "",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 28,
        "name": "Nguyễn Vũ Yên Nguyên",
        "score": "đi học đầy đủ",
        "violations": "",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 29,
        "name": "Bùi Lý Minh Nhật",
        "score": null,
        "violations": "mtt, đổi chỗ tự do",
        "bonuses": ""
      },
      {
        "stt": 30,
        "name": "Hoàng Minh Quân",
        "score": null,
        "violations": "ngủ trong giờ nhiều lần, đi học muộn",
        "bonuses": ""
      },
      {
        "stt": 31,
        "name": "Nguyễn Văn Thắng",
        "score": "đi học đầy đủ",
        "violations": ",nghịch trong giờ , không ghi bài",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 32,
        "name": "Đinh Gia Thuận",
        "score": null,
        "violations": "0 điểm Lý; Nói chuyện trong giờ",
        "bonuses": ""
      },
      {
        "stt": 33,
        "name": "Nguyễn Minh Tiến",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 34,
        "name": "Hoàng Hữu Tiệp",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 35,
        "name": "Nguyễn Minh Trí",
        "score": "đi học đầy đủ",
        "violations": "",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 36,
        "name": "Hà Bảo Trung",
        "score": null,
        "violations": "không ghi bài , ngủ trong giờ",
        "bonuses": ""
      },
      {
        "stt": 37,
        "name": "Nguyễn Văn Tú",
        "score": null,
        "violations": "đi học muộn 2 lần , mtt",
        "bonuses": ""
      },
      {
        "stt": 38,
        "name": "Nguyễn Nam Tùng",
        "score": null,
        "violations": "",
        "bonuses": ""
      },
      {
        "stt": 39,
        "name": "Trần Trọng Tuyên",
        "score": "đi học đầy đủ",
        "violations": "ngủ trong giờ",
        "bonuses": "đi học đầy đủ"
      },
      {
        "stt": 40,
        "name": "Nhâm Hoàng Việt",
        "score": null,
        "violations": "mtt 2 lần",
        "bonuses": ""
      }
    ]
  }
];
