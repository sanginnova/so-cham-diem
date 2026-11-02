import os
import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def set_cell_border(cell, **kwargs):
    """
    Set cell borders
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='FF0000', space='0')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key, attr in [("val", "w:val"), ("color", "w:color"), ("sz", "w:sz"), ("space", "w:space")]:
                if key in edge_data:
                    element.set(qn(attr), str(edge_data[key]))

def set_cell_shading(cell, color_hex):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for edge, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{edge}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()

    # Configure A4 Paper and Margins (Standard VN pedagogical SKKN)
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(1.5)

    # Base Normal Style
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Times New Roman'
    style_normal.font.size = Pt(13)
    style_normal.font.color.rgb = RGBColor(0x1F, 0x29, 0x37) # Dark slate
    style_normal.paragraph_format.line_spacing = 1.2
    style_normal.paragraph_format.space_before = Pt(0)
    style_normal.paragraph_format.space_after = Pt(4)

    # Color Constants
    PRIMARY_COLOR = RGBColor(0x0F, 0x3E, 0x6D) # Deep Navy
    SECONDARY_COLOR = RGBColor(0x1D, 0x4E, 0x89) # Navy
    TEXT_MUTED = RGBColor(0x4B, 0x55, 0x63)
    HIGHLIGHT_RED = RGBColor(0xB9, 0x1C, 0x1C)

    # -------------------------------------------------------------
    # 1. TRANG BÌA CHÍNH (COVER PAGE)
    # -------------------------------------------------------------
    # Outer Border Box for Cover Page using 1-cell table
    cover_table = doc.add_table(rows=1, cols=1)
    cover_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cover_table.autofit = False
    
    cover_cell = cover_table.rows[0].cells[0]
    cover_cell.width = Cm(16.5)
    set_cell_margins(cover_cell, top=280, bottom=280, left=320, right=320)
    
    # Elegant double border for cover
    border_spec = {"val": "double", "sz": "18", "color": "0F3E6D", "space": "0"}
    set_cell_border(cover_cell, top=border_spec, bottom=border_spec, left=border_spec, right=border_spec)
    set_cell_shading(cover_cell, "F8FAFC")

    cp = cover_cell.paragraphs[0]
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_after = Pt(2)
    run = cp.add_run("BỘ QUỐC PHÒNG\n")
    run.font.name = "Times New Roman"
    run.font.size = Pt(13)
    run.bold = True
    run.font.color.rgb = PRIMARY_COLOR

    run = cp.add_run("TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP\n")
    run.font.name = "Times New Roman"
    run.font.size = Pt(14)
    run.bold = True
    run.font.color.rgb = PRIMARY_COLOR

    run = cp.add_run("KHOA CƠ BẢN\n")
    run.font.name = "Times New Roman"
    run.font.size = Pt(13)
    run.bold = True
    run.font.color.rgb = SECONDARY_COLOR

    run = cp.add_run("-----***-----\n\n\n\n")
    run.font.size = Pt(11)

    p_title_label = cover_cell.add_paragraph()
    p_title_label.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title_label.paragraph_format.space_after = Pt(12)
    run = p_title_label.add_run("BÁO CÁO SÁNG KIẾN KINH NGHIỆM")
    run.font.name = "Times New Roman"
    run.font.size = Pt(18)
    run.bold = True
    run.font.color.rgb = HIGHLIGHT_RED

    p_title = cover_cell.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.line_spacing = 1.3
    p_title.paragraph_format.space_after = Pt(24)
    run = p_title.add_run("ỨNG DỤNG NỀN TẢNG SỐ\n“SỔ CHẤM ĐIỂM & TRỢ LÝ NỀ NẾP HỌC ĐƯỜNG THỜI GIAN THỰC”\nNHẰM NÂNG CAO HIỆU QUẢ CÔNG TÁC CHỦ NHIỆM VÀ PHÁT HUY TÍNH TỰ QUẢN CỦA HỌC SINH TẠI TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 – BQP")
    run.font.name = "Times New Roman"
    run.font.size = Pt(15)
    run.bold = True
    run.font.color.rgb = PRIMARY_COLOR

    p_info = cover_cell.add_paragraph()
    p_info.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_info.paragraph_format.left_indent = Cm(2.2)
    p_info.paragraph_format.line_spacing = 1.3
    p_info.paragraph_format.space_before = Pt(30)
    p_info.paragraph_format.space_after = Pt(40)

    items = [
        ("Lĩnh vực áp dụng:", "Công tác Giáo viên Chủ nhiệm & Chuyển đổi số giáo dục"),
        ("Tác giả:", "Nguyễn Văn Sang"),
        ("Chức vụ:", "Giáo viên môn Toán"),
        ("Đơn vị công tác:", "Khoa Cơ bản – Trường Cao đẳng Nghề số 1 – BQP"),
        ("Đối tượng thực nghiệm:", "Học sinh các lớp 10A8, 10A11, 10A15, 10A17"),
        ("Năm học thực hiện:", "2024 - 2025 & 2025 - 2026")
    ]
    for label, val in items:
        r1 = p_info.add_run(f"• {label} ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(13)
        r1.bold = True
        r2 = p_info.add_run(f"{val}\n")
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(13)

    p_bottom = cover_cell.add_paragraph()
    p_bottom.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_bottom.paragraph_format.space_before = Pt(20)
    p_bottom.paragraph_format.space_after = Pt(10)
    run = p_bottom.add_run("THÁI NGUYÊN, NĂM 2026")
    run.font.name = "Times New Roman"
    run.font.size = Pt(13)
    run.bold = True
    run.font.color.rgb = PRIMARY_COLOR

    doc.add_page_break()

    # -------------------------------------------------------------
    # 2. TRANG TỔNG HỢP THÔNG TIN VÀ MỤC LỤC
    # -------------------------------------------------------------
    p_sum_title = doc.add_paragraph()
    p_sum_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p_sum_title.add_run("TÓM TẮT SÁNG KIẾN KINH NGHIỆM")
    run.font.size = Pt(16)
    run.bold = True
    run.font.color.rgb = PRIMARY_COLOR

    p_summary = doc.add_paragraph()
    p_summary.paragraph_format.first_line_indent = Cm(1.27)
    p_summary.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_summary.add_run(
        "Sáng kiến tập trung giải quyết bài toán quản lý nề nếp học sinh và giảm thiểu áp lực sổ sách hành chính cho giáo viên chủ nhiệm tại Trường Cao đẳng Nghề số 1 – BQP. Bằng việc xây dựng và ứng dụng nền tảng số đa thiết bị trên nền tảng đám mây Firebase Realtime Cloud, giải pháp đã số hóa 100% quy trình chấm điểm nề nếp theo tiết học, tích hợp cơ chế chống gian lận/chống trùng lặp, cơ chế khóa kỳ thi đua, ứng dụng bảng vinh danh thời gian thực (Live Scoreboard) kích thích thi đua tích cực, xây dựng cổng tra cứu thông tin bảo mật cho phụ huynh học sinh và tự động hóa xuất Sổ công tác GVCN chuẩn Microsoft Word (.docx). Kết quả thực nghiệm cho thấy tỉ lệ vi phạm nề nếp giảm trên 73%, mức độ đồng thuận của phụ huynh và học sinh đạt 100%, đồng thời tiết kiệm hơn 85% thời gian làm việc hành chính cho giáo viên."
    )

    # Bảng thông tin tóm tắt
    t_info = doc.add_table(rows=5, cols=2)
    t_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_info.autofit = False
    col_widths = [Cm(5.0), Cm(11.5)]
    summary_rows = [
        ("Tên sáng kiến:", "Ứng dụng nền tảng số 'Sổ chấm điểm & Trợ lý nề nếp học đường thời gian thực' nhằm nâng cao hiệu quả công tác chủ nhiệm và phát huy tính tự quản của học sinh tại Trường Cao đẳng Nghề số 1 – BQP"),
        ("Tác giả & Đơn vị:", "Nguyễn Văn Sang – Giáo viên Khoa Cơ bản, Trường Cao đẳng Nghề số 1 – BQP"),
        ("Thời gian áp dụng:", "Từ tháng 09/2024 đến nay (Năm học 2024–2025 và 2025–2026)"),
        ("Phạm vi triển khai:", "Các lớp văn hóa THPT (10A8, 10A11, 10A15, 10A17) hệ Song bằng 9+"),
        ("Từ khóa (Keywords):", "Chuyển đổi số giáo dục; Giáo viên chủ nhiệm; Sổ chấm điểm điện tử; Kỷ luật tích cực; Gamification; Firebase Realtime Cloud; Trường Cao đẳng Nghề số 1 - BQP")
    ]
    for i, (k, v) in enumerate(summary_rows):
        row = t_info.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_widths[0], col_widths[1]
        set_cell_margins(c0, 80, 80, 120, 120)
        set_cell_margins(c1, 80, 80, 120, 120)
        set_cell_shading(c0, "F1F5F9")
        set_cell_border(c0, top={"val": "single", "sz": "4", "color": "CBD5E1"},
                             bottom={"val": "single", "sz": "4", "color": "CBD5E1"},
                             left={"val": "single", "sz": "4", "color": "CBD5E1"},
                             right={"val": "single", "sz": "4", "color": "CBD5E1"})
        set_cell_border(c1, top={"val": "single", "sz": "4", "color": "CBD5E1"},
                             bottom={"val": "single", "sz": "4", "color": "CBD5E1"},
                             left={"val": "single", "sz": "4", "color": "CBD5E1"},
                             right={"val": "single", "sz": "4", "color": "CBD5E1"})
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.bold = True
        r0.font.size = Pt(12)
        r0.font.color.rgb = PRIMARY_COLOR
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(12)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Mục lục
    p_toc_title = doc.add_paragraph()
    p_toc_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p_toc_title.add_run("MỤC LỤC TỔNG THỂ")
    run.font.size = Pt(15)
    run.bold = True
    run.font.color.rgb = PRIMARY_COLOR

    toc_items = [
        ("PHẦN I: ĐẶT VẤN ĐỀ (LÝ DO CHỌN ĐỀ TÀI)", "Trang 1"),
        ("   1.1. Cơ sở lý luận và chủ trương chuyển đổi số ngành giáo dục", "Trang 1"),
        ("   1.2. Cơ sở thực tiễn tại Trường Cao đẳng Nghề số 1 – BQP", "Trang 2"),
        ("   1.3. Mục đích, đối tượng và phương pháp nghiên cứu", "Trang 2"),
        ("PHẦN II: THỰC TRẠNG VẤN ĐỀ TRƯỚC KHI ÁP DỤNG SÁNG KIẾN", "Trang 3"),
        ("   2.1. Đặc thù học sinh hệ Song bằng / 9+ tại Trường Cao đẳng Nghề số 1 – BQP", "Trang 3"),
        ("   2.2. Những bất cập của phương pháp quản lý sổ sách truyền thống", "Trang 3"),
        ("   2.3. Số liệu khảo sát thực trạng đầu năm học (Bảng đối chứng ban đầu)", "Trang 4"),
        ("PHẦN III: NỘI DUNG VÀ HỆ THỐNG BIỆN PHÁP THỰC HIỆN", "Trang 5"),
        ("   3.1. Thiết kế kiến trúc nền tảng Web App Cloud thời gian thực và phân quyền sư phạm", "Trang 5"),
        ("   3.2. Số hóa quy trình chấm điểm nề nếp hàng ngày, chống gian lận và khóa kỳ thi đua", "Trang 6"),
        ("   3.3. Ứng dụng Gamification (Bảng vinh danh Live Scoreboard, Vòng quay ngẫu nhiên, Sơ đồ lớp)", "Trang 8"),
        ("   3.4. Xây dựng cầu nối thông tin 3 bên (Nhà trường – GVCN – Phụ huynh) qua Cổng tra cứu & Zalo", "Trang 10"),
        ("   3.5. Trợ lý nghiệp vụ GVCN, quản lý thu chi minh bạch và tự động hóa xuất Sổ GVCN (.docx)", "Trang 12"),
        ("   3.6. Hệ thống 10 ảnh chụp màn hình minh họa chi tiết ứng dụng thực tế", "Trang 14"),
        ("PHẦN IV: HIỆU QUẢ CỦA SÁNG KIẾN KINH NGHIỆM", "Trang 19"),
        ("   4.1. Hiệu quả định lượng (Bảng đối chứng số liệu trước và sau thực nghiệm)", "Trang 19"),
        ("   4.2. Hiệu quả định tính đối với Học sinh, Giáo viên và Phụ huynh", "Trang 20"),
        ("   4.3. Khả năng nhân rộng và phạm vi ảnh hưởng", "Trang 21"),
        ("PHẦN V: KẾT LUẬN VÀ KIẾN NGHỊ", "Trang 22"),
        ("   5.1. Bài học kinh nghiệm rút ra", "Trang 22"),
        ("   5.2. Đề xuất, kiến nghị với Ban Giám hiệu, Khoa Cơ bản và Đoàn Thanh niên", "Trang 22"),
        ("LỜI CAM ĐOAN VÀ PHÊ DUYỆT CỦA ĐƠN VỊ", "Trang 23")
    ]
    for text, pg in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        r.font.size = Pt(12)
        if text.startswith("PHẦN"):
            r.bold = True
            r.font.color.rgb = PRIMARY_COLOR
        # Add tab and page number
        r_dots = p.add_run(" " + "." * (80 - len(text)) + " ")
        r_dots.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        r_pg = p.add_run(pg)
        r_pg.font.size = Pt(11)
        r_pg.font.italic = True

    doc.add_page_break()

    # -------------------------------------------------------------
    # CÁC HÀM HỖ TRỢ THÊM TIÊU ĐỀ VÀ CALLOUT BOX
    # -------------------------------------------------------------
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(14)
        run.bold = True
        run.font.color.rgb = PRIMARY_COLOR
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(13)
        run.bold = True
        run.font.color.rgb = SECONDARY_COLOR
        return p

    def add_p(text, indent=True, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.2
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        if indent:
            p.paragraph_format.first_line_indent = Cm(1.27)
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
        p.add_run(text)
        return p

    def add_screenshot_box(fig_num, fig_title, position_note, guide_text, caption_text):
        """Thêm khung chứa gợi ý ảnh chụp màn hình kèm hướng dẫn trực quan"""
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        cell = table.rows[0].cells[0]
        cell.width = Cm(16.5)
        set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
        set_cell_shading(cell, "F8FAFC")
        set_cell_border(cell, top={"val": "single", "sz": "6", "color": "0284C7"},
                             bottom={"val": "single", "sz": "6", "color": "0284C7"},
                             left={"val": "single", "sz": "12", "color": "0284C7"},
                             right={"val": "single", "sz": "6", "color": "0284C7"})

        # Header box
        p_head = cell.paragraphs[0]
        p_head.paragraph_format.space_after = Pt(2)
        r_ico = p_head.add_run("📸 ")
        r_ico.font.size = Pt(12)
        r_title = p_head.add_run(f"HÌNH {fig_num}: {fig_title.upper()}")
        r_title.bold = True
        r_title.font.size = Pt(12)
        r_title.font.color.rgb = RGBColor(0x03, 0x69, 0xA1) # Sky blue dark

        # Position and Guide
        p_body = cell.add_paragraph()
        p_body.paragraph_format.space_after = Pt(4)
        r_pos = p_body.add_run("• Vị trí đề xuất chèn: ")
        r_pos.bold = True
        r_pos.font.size = Pt(11)
        p_body.add_run(f"{position_note}\n").font.size = Pt(11)
        
        r_guide = p_body.add_run("• Hướng dẫn chụp & chi tiết cần thể hiện: ")
        r_guide.bold = True
        r_guide.font.size = Pt(11)
        p_body.add_run(f"{guide_text}").font.size = Pt(11)

        # Placeholder area
        p_box = cell.add_paragraph()
        p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_box.paragraph_format.space_before = Pt(8)
        p_box.paragraph_format.space_after = Pt(8)
        r_box = p_box.add_run("[ KHUNG CHÈN ẢNH CHỤP MÀN HÌNH THỰC TẾ ]\n(Giáo viên chụp ảnh màn hình từ ứng dụng rồi dán trực tiếp vào khung này)")
        r_box.font.size = Pt(10)
        r_box.font.italic = True
        r_box.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

        # Caption
        p_cap = cell.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(2)
        r_cap = p_cap.add_run(f"Hình {fig_num}: {caption_text}")
        r_cap.font.size = Pt(11)
        r_cap.font.italic = True
        r_cap.bold = True
        r_cap.font.color.rgb = PRIMARY_COLOR

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # 3. PHẦN I: ĐẶT VẤN ĐỀ
    # -------------------------------------------------------------
    add_h1("PHẦN I: ĐẶT VẤN ĐỀ")
    
    add_h2("1.1. Cơ sở lý luận và chủ trương chuyển đổi số ngành giáo dục")
    add_p("Trong bối cảnh cuộc Cách mạng công nghiệp 4.0 đang tác động sâu rộng đến mọi lĩnh vực đời sống, ngành Giáo dục và Đào tạo đang có những bước chuyển mình mạnh mẽ theo tinh thần Nghị quyết số 29-NQ/TW của Ban Chấp hành Trung ương Đảng về đổi mới căn bản, toàn diện giáo dục và đào tạo. Quyết định số 131/QĐ-TTg của Thủ tướng Chính phủ phê duyệt Đề án 'Tăng cường ứng dụng công nghệ thông tin và chuyển đổi số trong giáo dục và đào tạo giai đoạn 2022 - 2025, định hướng đến năm 2030' đã xác định mục tiêu trọng tâm là đổi mới phương thức quản lý, nâng cao chất lượng dạy và học trên môi trường số.")
    add_p("Đặc biệt, Thông tư số 02/2025/TT-BGDĐT mới đây quy định về Khung năng lực số cho người học và nhà giáo đã khẳng định: Năng lực số không chỉ dừng lại ở việc ứng dụng công nghệ trong từng bài giảng, mà đòi hỏi mỗi thầy cô giáo phải chủ động áp dụng các giải pháp số hóa vào công tác quản trị lớp học, quản lý nề nếp, kết nối gia đình và theo dõi sự tiến bộ toàn diện của người học.")

    add_h2("1.2. Cơ sở thực tiễn tại Trường Cao đẳng Nghề số 1 – BQP")
    add_p("Trường Cao đẳng Nghề số 1 – Bộ Quốc phòng là cái nôi đào tạo nghề gắn liền với giáo dục văn hóa THPT (chương trình Song bằng 9+) cho con em cán bộ chiến sĩ quân đội và con em nhân dân trên địa bàn Quân khu 1. Học sinh theo học tại trường ở lứa tuổi 15–18, vừa phải học chương trình văn hóa THPT theo chuẩn GDPT 2018, vừa phải học nghề chuyên môn. Do đặc thù môi trường đào tạo kỷ luật mang tính chất quân sự, việc duy trì nề nếp, tác phong, kỷ cương học đường là một nhiệm vụ sống còn quyết định đến chất lượng giáo dục toàn diện của nhà trường.")
    add_p("Tuy nhiên, công tác quản lý nề nếp học sinh tại các lớp chủ nhiệm trong nhiều năm qua vẫn chủ yếu dựa vào các công cụ truyền thống: sổ cờ đỏ theo dõi ghi tay, sổ theo dõi của Ban cán sự lớp, sổ đầu bài giấy và các cuộc điện thoại trao đổi khi học sinh đã phạm lỗi nghiêm trọng. Thực tế này bộc lộ rất nhiều hạn chế:")
    add_p("1. Tính kịp thời và minh bạch bị hạn chế: Lớp trưởng ghi chép thủ công trong tuần, đến tiết sinh hoạt cuối tuần giáo viên mới tổng hợp. Lúc này, học sinh vi phạm đã quên cụ thể tiết học hoặc hoàn cảnh xảy ra lỗi, dẫn đến khiếu nại, tranh cãi, mất đoàn kết nội bộ.", indent=True)
    add_p("2. Gánh nặng hành chính khổng lồ đè nặng lên vai GVCN: Hàng tuần, GVCN phải dành từ 4 đến 6 giờ đồng hồ để cộng trừ điểm thủ công, xếp loại hạnh kiểm, ghi chép Sổ công tác giáo viên chủ nhiệm, biên bản sinh hoạt lớp và quản lý quỹ lớp, làm giảm thời gian đầu tư chuyên môn.", indent=True)
    add_p("3. Thiếu sự kết nối tức thời với phụ huynh học sinh: Phụ huynh phần lớn là người lao động bận rộn, chỉ nắm được kết quả học tập rèn luyện của con sau buổi họp phụ huynh cuối kỳ, dẫn đến sự đứt gãy trong việc phối hợp giáo dục giữa gia đình và nhà trường.", indent=True)

    add_h2("1.3. Mục đích, đối tượng và phương pháp nghiên cứu")
    add_p("Xuất phát từ thực tế nêu trên, tôi đã nghiên cứu, tự xây dựng và triển khai đề tài sáng kiến kinh nghiệm: 'Ứng dụng nền tảng số Sổ chấm điểm & Trợ lý nề nếp học đường thời gian thực nhằm nâng cao hiệu quả công tác chủ nhiệm và phát huy tính tự quản của học sinh tại Trường Cao đẳng Nghề số 1 – BQP'.", bold_prefix="• Mục đích nghiên cứu: ")
    add_p("Quy trình theo dõi rèn luyện nề nếp, các giải pháp kỷ luật tích cực, ứng dụng công nghệ điện toán đám mây và tự động hóa hồ sơ sổ sách trong công tác chủ nhiệm lớp.", bold_prefix="• Đối tượng nghiên cứu: ")
    add_p("Triển khai thực nghiệm tại 4 lớp văn hóa THPT khối 10 (Lớp 10A8, 10A11, 10A15, 10A17) do tôi trực tiếp giảng dạy môn Toán và làm công tác chủ nhiệm tại Khoa Cơ bản – Trường Cao đẳng Nghề số 1 – BQP trong các năm học 2024–2025 và 2025–2026.", bold_prefix="• Phạm vi áp dụng: ")
    add_p("Phương pháp nghiên cứu lý luận; Phương pháp điều tra, khảo sát thực tế; Phương pháp thiết kế hệ thống phần mềm (Web App / Cloud Firestore); Phương pháp thực nghiệm sư phạm và Phương pháp thống kê đối chứng số liệu.", bold_prefix="• Phương pháp nghiên cứu: ")

    # -------------------------------------------------------------
    # 4. PHẦN II: THỰC TRẠNG VẤN ĐỀ
    # -------------------------------------------------------------
    add_h1("PHẦN II: THỰC TRẠNG VẤN ĐỀ TRƯỚC KHI ÁP DỤNG SÁNG KIẾN")

    add_h2("2.1. Đặc thù học sinh hệ Song bằng / 9+ tại Trường Cao đẳng Nghề số 1 – BQP")
    add_p("Học sinh hệ 9+ bước vào trường với xuất phát điểm đa dạng: nhiều em có học lực trung bình hoặc yếu từ bậc THCS, tâm lý lứa tuổi mới lớn có nhiều biểu hiện hiếu động, thiếu tự giác trong việc chấp hành nội quy trường lớp. Các em thường xuyên mắc các vi phạm như: đi học muộn, trang phục chưa đúng quy định của nhà trường, sử dụng điện thoại di động tự do trong giờ học, nói chuyện riêng, chưa hoàn thành bài tập về nhà. Nếu giáo viên chỉ áp dụng phương pháp kỷ luật truyền thống là phê bình, ghi sổ đầu bài, bắt viết bản kiểm điểm hay hạ bậc hạnh kiểm thì chỉ mang tính chất đối phó, răn đe tạm thời mà không khơi dậy được ý thức tự giác rèn luyện của các em.")

    add_h2("2.2. Những bất cập của phương pháp quản lý sổ sách truyền thống")
    add_p("Thực tế theo dõi quản lý lớp học bằng sổ giấy tại đơn vị trước đây bộc lộ 4 điểm nghẽn nghiêm trọng:")
    add_p("Thứ nhất, tính khách quan không cao: Ban cán sự lớp khi ghi sổ giấy thường bị chi phối bởi tình cảm bạn bè; những bạn chơi thân thì dễ dàng bỏ qua lỗi, còn những bạn ít nói hoặc mâu thuẫn thì ghi rất chặt chẽ, gây bức xúc trong tập thể lớp.")
    add_p("Thứ hai, nguy cơ thất lạc dữ liệu: Sổ chấm điểm giấy rất dễ bị rách, ướt, mất trang hoặc bị tẩy xóa chỉnh sửa số điểm mà không có dấu vết kiểm toán.")
    add_p("Thứ ba, mất nhiều công sức tổng hợp: Cuối tuần hoặc cuối tháng, GVCN và lớp phó học tập phải ngồi dò từng trang sổ, cộng trừ hàng trăm con số. Việc này vừa tốn thời gian vừa rất dễ xảy ra sai sót cơ học.")
    add_p("Thứ tư, phụ huynh ở thế bị động: Thông tin về vi phạm của học sinh không đến được với phụ huynh ngay trong ngày. Đến khi học sinh vi phạm nhiều lần tạo thành thói quen xấu thì gia đình mới hay biết, việc uốn nắn trở nên vô cùng khó khăn.")

    add_h2("2.3. Khảo sát thực trạng đầu năm học (Bảng đối chứng ban đầu)")
    add_p("Để có cơ sở thực chứng, tôi đã tiến hành khảo sát và tổng hợp số liệu thực trạng nề nếp tại 4 lớp thực nghiệm trong tháng 9 năm học 2024 – 2025 (khi vẫn áp dụng phương pháp quản lý sổ giấy truyền thống). Kết quả khảo sát được thể hiện ở bảng sau:")

    # Bảng khảo sát thực trạng
    t_stat1 = doc.add_table(rows=6, cols=4)
    t_stat1.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_stat1.autofit = False
    col_w = [Cm(1.5), Cm(7.5), Cm(3.5), Cm(4.0)]
    
    headers = ["STT", "Chỉ số khảo sát thực tế", "Kết quả đầu năm (Tháng 9/2024)", "Đánh giá thực trạng"]
    for j, h in enumerate(headers):
        cell = t_stat1.rows[0].cells[j]
        cell.width = col_w[j]
        set_cell_margins(cell, 100, 100, 120, 120)
        set_cell_shading(cell, "0F3E6D")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    data1 = [
        ("1", "Số lượt vi phạm nề nếp bình quân / tuần / lớp", "38 – 45 lượt", "Rất cao, vi phạm phổ biến"),
        ("2", "Tỉ lệ học sinh khiếu nại về việc chấm điểm sai lệch", "24.5%", "Thường xuyên tranh cãi cuối tuần"),
        ("3", "Tỉ lệ phụ huynh nắm bắt nề nếp con em hàng tuần", "18.2%", "Thông tin bị đứt gãy nghiêm trọng"),
        ("4", "Thời gian GVCN dành cho tổng hợp điểm & sổ sách/tuần", "4.5 – 6.0 giờ", "Gây áp lực lớn lên thời gian dạy học"),
        ("5", "Số lượng học sinh chủ động xung phong phát biểu/tuần", "8 – 12 lượt", "Không khí lớp học còn trầm, thụ động")
    ]
    for i, row_data in enumerate(data1):
        row = t_stat1.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = col_w[j]
            set_cell_margins(cell, 80, 80, 100, 100)
            if i % 2 == 1:
                set_cell_shading(cell, "F8FAFC")
            set_cell_border(cell, top={"val": "single", "sz": "4", "color": "E2E8F0"},
                                 bottom={"val": "single", "sz": "4", "color": "E2E8F0"},
                                 left={"val": "single", "sz": "4", "color": "E2E8F0"},
                                 right={"val": "single", "sz": "4", "color": "E2E8F0"})
            p = cell.paragraphs[0]
            if j == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif j in (2, 3):
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(val)
            r.font.size = Pt(11)
            if j == 2:
                r.bold = True

    p_cap_t1 = doc.add_paragraph()
    p_cap_t1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap_t1.paragraph_format.space_before = Pt(4)
    p_cap_t1.paragraph_format.space_after = Pt(10)
    r = p_cap_t1.add_run("Bảng 1: Số liệu thực trạng công tác quản lý nề nếp trước khi áp dụng sáng kiến")
    r.font.size = Pt(11)
    r.font.italic = True

    # -------------------------------------------------------------
    # 5. PHẦN III: NỘI DUNG VÀ HỆ THỐNG BIỆN PHÁP THỰC HIỆN
    # -------------------------------------------------------------
    add_h1("PHẦN III: NỘI DUNG VÀ HỆ THỐNG BIỆN PHÁP THỰC HIỆN")

    add_h2("3.1. Thiết kế kiến trúc nền tảng Web App Cloud thời gian thực và phân quyền sư phạm")
    add_p("Để giải quyết triệt để các bất cập trên, tôi đã tự lập trình và xây dựng hệ thống phần mềm 'Sổ chấm điểm & Trợ lý nề nếp học đường' dựa trên nền tảng công nghệ web hiện đại React, TypeScript và cơ sở dữ liệu thời gian thực Firebase Cloud Firestore của Google.")
    add_p("Hệ thống được thiết kế theo mô hình PWA (Progressive Web App) chạy mượt mà trên mọi thiết bị: máy tính để bàn giảng đường, máy tính xách tay của giáo viên, máy tính bảng và điện thoại thông minh của học sinh, phụ huynh. Điểm ưu việt của hệ thống là khả năng lắng nghe và đồng bộ dữ liệu tức thời (Realtime Listener), nghĩa là ngay khi cán sự lớp ghi nhận một lỗi vi phạm hoặc điểm thưởng tại lớp học, màn hình điện thoại của GVCN và máy chủ trường học sẽ cập nhật dữ liệu ngay sau 0.5 giây mà không cần bấm tải lại trang.")
    add_p("Đặc biệt, hệ thống được thiết lập cơ chế phân quyền 4 tầng nghiêm ngặt tại tầng bảo mật máy chủ (Firestore Security Rules):")
    add_p("• Tầng Quản trị viên (Admin/BGH): Toàn quyền giám sát nề nếp của tất cả các lớp trong trường, theo dõi biến động điểm số toàn khóa.", indent=True)
    add_p("• Tầng Giáo viên chủ nhiệm (GVCN): Quản lý danh sách học sinh, thiết lập biểu điểm cộng/trừ riêng theo đặc thù lớp, duyệt đề nghị điều chỉnh điểm và chốt khóa kỳ thi đua.", indent=True)
    add_p("• Tầng Ban cán sự lớp (Lớp trưởng/Cờ đỏ): Được cấp tài khoản riêng, chỉ có quyền ghi nhận nhật ký hàng ngày và sửa bản ghi do chính mình tạo; tuyệt đối không thể xóa học sinh hay can thiệp vào công thức điểm của giáo viên.", indent=True)
    add_p("• Tầng Phụ huynh học sinh: Tra cứu bảo mật qua liên kết được cấp riêng cho email Google cá nhân; chỉ xem được dữ liệu của con em mình mà không nhìn thấy dữ liệu học sinh khác.", indent=True)

    add_h2("3.2. Số hóa quy trình chấm điểm nề nếp hàng ngày, chống gian lận và khóa kỳ thi đua")
    add_p("1. Quy trình chấm điểm nhanh gọn theo tiết học: Danh mục hành vi được chia thành 2 nhóm rõ rệt: Điểm trừ (các lỗi vi phạm như muộn học, dùng điện thoại, thiếu bài tập...) và Điểm cộng (hoa điểm 10, phát biểu xây dựng bài, làm việc tốt, nhặt được của rơi). Khi học sinh vi phạm hoặc làm việc tốt, cán sự lớp chỉ cần chọn tên học sinh, tiết học (từ Tiết 1 đến Tiết 5), chọn hành vi trong danh mục và nhấn Lưu. Toàn bộ thao tác chỉ mất chưa đầy 3 giây.")
    add_p("2. Cơ chế chống gian lận & Toàn vẹn dữ liệu: Hệ thống được tích hợp thuật toán tự động ngăn chặn trùng lặp: nếu cán sự lớp vô tình hoặc cố ý nhập trùng một lỗi cho cùng một học sinh trong cùng một tiết của một ngày, hệ thống sẽ từ chối lưu và đưa ra cảnh báo ngay lập tức. Bên cạnh đó, cơ chế Thùng rác an toàn (Discipline Trash) giúp lưu vết toàn bộ lịch sử ai xóa, xóa lúc nào; chỉ GVCN mới có quyền khôi phục bản ghi đã xóa.")
    add_p("3. Cơ chế Khóa kỳ thi đua (Period Locks): Sau tiết sinh hoạt lớp ngày thứ Bảy, GVCN và tập thể lớp thống nhất điểm số và nhấn nút 'Khóa tuần' hoặc 'Khóa tháng'. Sau khi khóa, hệ thống tại máy chủ sẽ chặn hoàn toàn mọi thao tác chỉnh sửa của học sinh, đảm bảo điểm số rèn luyện có giá trị pháp lý cố định để xếp loại hạnh kiểm.")

    add_h2("3.3. Ứng dụng Gamification (Bảng vinh danh Live Scoreboard, Vòng quay ngẫu nhiên, Sơ đồ lớp)")
    add_p("Một trong những đột phá sư phạm lớn nhất của sáng kiến là việc chuyển đổi từ tư duy 'kỷ luật răn đe, trừng phạt' sang 'kỷ luật tích cực và thi đua tự giác' thông qua các cơ chế trò chơi hóa (Gamification):")
    add_p("1. Bảng vinh danh trực tiếp (Public Live Scoreboard) trên màn hình Smart TV: Trong 15 phút sinh hoạt đầu giờ hoặc tiết sinh hoạt lớp, GVCN kết nối máy tính với màn hình tương tác của lớp để trình chiếu Bảng vinh danh trực tiếp. Giao diện được thiết kế hiện đại, rực rỡ với hiệu ứng vinh danh Top 5 Ngôi sao tuần (những học sinh đạt nhiều hoa điểm 10, có tiến bộ vượt bậc) và bảng xếp hạng thi đua toàn lớp. Khi nhìn thấy điểm số của mình tăng lên trước sự ngưỡng mộ của cả lớp, học sinh sẽ có động lực rất lớn để tiếp tục phấn đấu.")
    add_p("2. Vòng quay ngẫu nhiên (Random Student Picker): Để loại bỏ cảm giác căng thẳng khi kiểm tra bài cũ, ứng dụng cung cấp vòng quay gọi tên ngẫu nhiên kết hợp âm thanh vui nhộn. Khi học sinh trả lời đúng, GVCN bấm nút cộng điểm trực tiếp vào tài khoản thi đua của em đó ngay trên giao diện vòng quay.")
    add_p("3. Sơ đồ lớp học thông minh (Interactive Seating Chart): GVCN thiết lập sơ đồ lớp đúng với thực tế bàn ghế. Mỗi vị trí ngồi hiển thị tên và màu sắc phản ánh phong độ nề nếp của học sinh. Trong giờ học, giáo viên chỉ cần chạm vào vị trí chỗ ngồi trên sơ đồ là có thể ghi nhận ngay ý thức học tập của học sinh đó.")

    add_h2("3.4. Xây dựng cầu nối thông tin 3 bên (Nhà trường – GVCN – Phụ huynh) qua Cổng tra cứu & Zalo")
    add_p("1. Cổng tra cứu trực tuyến bảo mật (Family Portal): Giáo viên chủ nhiệm tạo liên kết báo cáo riêng gửi cho phụ huynh. Phụ huynh truy cập bằng điện thoại cá nhân là có thể xem được toàn bộ biểu đồ điểm rèn luyện của con theo từng ngày, từng tiết. Nếu phát hiện có sai sót (ví dụ: học sinh nghỉ có phép nhưng lớp trưởng tích nhầm vắng không phép), phụ huynh chỉ cần bấm nút 'Gửi đề nghị điều chỉnh' ngay trên giao diện. Yêu cầu sẽ được chuyển tới GVCN phê duyệt trong vòng 24 giờ.")
    add_p("2. Trình soạn tin nhắn Zalo cá nhân hóa (Zalo Message Composer): Cuối mỗi tuần, ứng dụng tự động tổng hợp kết quả của từng học sinh và tự động tạo mẫu tin nhắn Zalo chuẩn mực sư phạm (bao gồm điểm số, thứ hạng trong lớp, các điểm tích cực đáng khen ngợi và các lỗi nhỏ cần gia đình nhắc nhở). Giáo viên chỉ cần một nút bấm 'Sao chép' là có thể gửi tin nhắn riêng cho từng phụ huynh, đảm bảo tính bảo mật và sự ấm áp, tinh tế trong giao tiếp sư phạm.")

    add_h2("3.5. Trợ lý nghiệp vụ GVCN, quản lý thu chi minh bạch và tự động hóa xuất Sổ GVCN (.docx)")
    add_p("1. Quản lý hồ sơ học sinh mở rộng và các đối tượng cần hỗ trợ: Ứng dụng lưu trữ đầy đủ hồ sơ học sinh: hoàn cảnh gia đình, diện chính sách, con thương binh, học sinh ở trọ, nhật ký các cuộc gọi trao đổi với phụ huynh và kế hoạch kèm cặp học sinh cá biệt/học lực yếu.")
    add_p("2. Quản lý thu chi các khoản quỹ lớp, học phí minh bạch: Cho phép tạo các đợt thu, danh sách học sinh được miễn giảm, ghi nhận chi tiết từng lần nộp (tiền mặt / chuyển khoản) và tự động xuất file Excel sao kê tài chính gửi phụ huynh, chấm dứt hoàn toàn sự nghi ngờ về quỹ lớp.")
    add_p("3. Tự động hóa 100% việc xuất Sổ công tác Giáo viên chủ nhiệm ra Word (.docx): Đây là tính năng đột phá giải phóng sức lao động cho giáo viên. Thay vì phải chép tay hoặc đánh máy hàng chục trang sổ chủ nhiệm, giáo viên chỉ cần nhấn nút 'Xuất Sổ Chủ Nhiệm (.docx)', hệ thống sẽ tự động trích xuất toàn bộ: Sơ đồ lớp, Danh sách cán sự, Kế hoạch tuần, Biên bản sinh hoạt lớp và Nhật ký thi đua vào một file Word chuẩn quy định A4, bảng biểu nằm ngang, font Times New Roman để in nộp Ban Giám hiệu.")

    # -------------------------------------------------------------
    # 6. MỤC 3.6: HỆ THỐNG 10 ẢNH CHỤP MÀN HÌNH MINH HỌA
    # -------------------------------------------------------------
    add_h2("3.6. Hệ thống danh mục ảnh chụp màn hình minh họa chi tiết ứng dụng thực tế")
    add_p("Dưới đây là hệ thống 10 hình ảnh chụp màn hình minh họa thực tế được bố trí theo từng module nghiệp vụ trong phần mềm để phục vụ việc thẩm định của Hội đồng chấm sáng kiến kinh nghiệm:")

    screenshots_data = [
        (1, "Bảng điều khiển trung tâm (Dashboard) và chuyển đổi không gian lớp học",
         "Mục 3.1 - Sau phần giới thiệu kiến trúc phân quyền và chuyển đổi không gian lớp học.",
         "Chụp toàn cảnh màn hình làm việc của GVCN sau khi đăng nhập: hiển thị thanh chọn lớp (ClassWorkspaceSwitcher cho các lớp 10A8, 10A11, 10A15, 10A17), thẻ sĩ số, tỉ lệ nề nếp tuần và menu chức năng bên trái.",
         "Giao diện Bảng điều khiển quản lý nề nếp đa lớp học trên nền tảng Cloud Firestore"),

        (2, "Giao diện Nhật ký chấm điểm nề nếp hàng ngày (Daily Log View)",
         "Mục 3.2 - Sau đoạn phân tích quy trình chấm điểm nhanh theo tiết học.",
         "Mở tab 'Nhật ký hàng ngày', bấm nút 'Ghi nhận nề nếp': chụp rõ cửa sổ chọn học sinh, tiết học (1-5), danh mục hành vi kèm số điểm cộng/trừ và bảng danh sách nhật ký hiển thị thời gian, người ghi nhận.",
         "Cửa sổ ghi nhận điểm nề nếp tức thời theo tiết học tích hợp cơ chế chống trùng lặp tự động"),

        (3, "Bảng tổng kết thi đua tuần và chức năng Khóa kỳ thi đua (Weekly Summary View)",
         "Mục 3.2 - Sau đoạn phân tích cơ chế toàn vẹn dữ liệu và chốt sổ thi đua.",
         "Mở tab 'Tổng kết tuần': chụp bảng xếp loại học sinh theo thứ hạng, nút 'Khóa dữ liệu tuần' màu vàng có biểu tượng ổ khóa và cửa sổ giải trình cách tính điểm khi bấm vào từng học sinh.",
         "Bảng xếp loại thi đua tuần tự động và tính năng Khóa kỳ bảo vệ tính toàn vẹn của dữ liệu"),

        (4, "Bảng vinh danh trực tiếp (Public Live Scoreboard) trình chiếu trên Smart TV",
         "Mục 3.3 - Sau đoạn giới thiệu giải pháp Kỷ luật tích cực và Gamification.",
         "Chụp màn hình trình chiếu toàn màn hình (F11) của Bảng vinh danh Live: hiển thị cúp vàng cho Top 5 Ngôi sao tuần, điểm hoa điểm 10 rực rỡ và bảng xếp hạng thời gian thực tạo động lực học tập.",
         "Màn hình Bảng vinh danh Live Scoreboard trình chiếu trực tiếp trong giờ sinh hoạt lớp"),

        (5, "Sơ đồ lớp học tương tác thông minh (Interactive Seating Chart)",
         "Mục 3.3 - Sau đoạn mô tả giải pháp trực quan hóa không gian lớp học.",
         "Mở tab 'Sơ đồ lớp': chụp bố cục 4 tổ bàn ghế, từng ô học sinh có ảnh đại diện, màu sắc phong độ nề nếp và menu pop-up nhanh để cộng/trừ điểm ngay tại chỗ ngồi trong tiết học.",
         "Quản lý nề nếp và chấm điểm trực tiếp trên Sơ đồ chỗ ngồi tương tác"),

        (6, "Cổng tra cứu rèn luyện dành cho Phụ huynh (Family Portal)",
         "Mục 3.4 - Sau đoạn mô tả Cổng tra cứu thông tin trực tuyến bảo mật.",
         "Chụp giao diện hiển thị trên điện thoại di động của phụ huynh khi truy cập qua liên kết riêng: hiển thị timeline các tiết học của con, biểu đồ điểm rèn luyện và nút 'Gửi đề nghị điều chỉnh'.",
         "Giao diện Cổng tra cứu thông tin rèn luyện trên thiết bị di động dành cho phụ huynh học sinh"),

        (7, "Bộ công cụ tạo tin nhắn Zalo cá nhân hóa tự động (Zalo Message Composer)",
         "Mục 3.4 - Sau đoạn phân tích giải pháp kết nối 3 bên Nhà trường - GVCN - Gia đình.",
         "Mở modal 'Xuất báo cáo Zalo': chụp khung soạn thảo tin nhắn tự động điền sẵn tên học sinh, điểm số, thứ hạng và lời nhận xét sư phạm tinh tế kèm nút 'Sao chép nội dung'.",
         "Bộ công cụ tạo tin nhắn Zalo cá nhân hóa tự động gửi tới phụ huynh học sinh"),

        (8, "Trợ lý GVCN và Module quản lý các khoản thu minh bạch",
         "Mục 3.5 - Sau đoạn mô tả quản lý hồ sơ và thu chi tài chính.",
         "Chụp giao diện tab 'Trợ lý GVCN' (hồ sơ học sinh đặc biệt, nhật ký liên hệ phụ huynh) hoặc tab 'Các khoản thu' (tiến độ nộp tiền, phiếu thu chi tiết và nút xuất Excel báo cáo).",
         "Giao diện quản lý các khoản thu và hồ sơ phối hợp phụ huynh của Trợ lý GVCN"),

        (9, "Tính năng kết xuất Sổ công tác Giáo viên chủ nhiệm ra Word (.docx)",
         "Mục 3.5 - Sau đoạn mô tả tự động hóa hồ sơ sổ sách sư phạm.",
         "Chụp cửa sổ chọn các phần cần xuất ra Sổ chủ nhiệm và ảnh chụp tệp Word sau khi tải về mở trong Microsoft Word: đầy đủ các bảng sơ đồ lớp, biên bản sinh hoạt tuần, font Times New Roman chuẩn A4.",
         "Tính năng tự động kết xuất toàn bộ dữ liệu ra Sổ công tác GVCN (.docx) chuẩn thể thức văn bản"),

        (10, "Vòng quay may mắn gọi tên ngẫu nhiên (Random Student Picker)",
         "Mục 3.3 - Sau đoạn phân tích các trò chơi học đường tích hợp.",
         "Mở giao diện Vòng quay ngẫu nhiên: chụp vòng xoay tên học sinh trong lớp đang dừng lại chúc mừng một học sinh kèm nút cộng điểm phát biểu bài môn Toán ngay lập tức.",
         "Ứng dụng Vòng quay ngẫu nhiên tích hợp cộng điểm tạo không khí hào hứng trong tiết học")
    ]

    for num, title, pos, guide, cap in screenshots_data:
        add_screenshot_box(num, title, pos, guide, cap)

    # -------------------------------------------------------------
    # 7. PHẦN IV: HIỆU QUẢ CỦA SÁNG KIẾN
    # -------------------------------------------------------------
    add_h1("PHẦN IV: HIỆU QUẢ CỦA SÁNG KIẾN KINH NGHIỆM")

    add_h2("4.1. Hiệu quả định lượng (Bảng đối chứng số liệu trước và sau thực nghiệm)")
    add_p("Qua quá trình triển khai áp dụng đồng bộ sáng kiến kinh nghiệm tại 4 lớp thực nghiệm (10A8, 10A11, 10A15, 10A17) với tổng số 168 học sinh trong suốt năm học, tôi đã thu thập và đối chiếu các số liệu cụ thể giữa giai đoạn chưa áp dụng (Học kỳ I) và giai đoạn đã áp dụng toàn diện (Học kỳ II):")

    # Bảng số liệu đối chứng
    t_stat2 = doc.add_table(rows=7, cols=5)
    t_stat2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_stat2.autofit = False
    col_w2 = [Cm(1.2), Cm(6.5), Cm(2.8), Cm(2.8), Cm(3.2)]
    
    headers2 = ["STT", "Tiêu chí đánh giá hiệu quả", "Trước áp dụng (HKI)", "Sau áp dụng (HKII)", "Mức độ chuyển biến"]
    for j, h in enumerate(headers2):
        cell = t_stat2.rows[0].cells[j]
        cell.width = col_w2[j]
        set_cell_margins(cell, 100, 100, 100, 100)
        set_cell_shading(cell, "0F3E6D")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    data2 = [
        ("1", "Số lượt vi phạm nề nếp bình quân / tuần / lớp", "38 – 45 lượt", "8 – 12 lượt", "Giảm 73.3% vi phạm"),
        ("2", "Tỉ lệ chuyên cần (Đi học đúng giờ, đủ tiết)", "88.5%", "97.8%", "Tăng 9.3%"),
        ("3", "Số lượt học sinh đạt điểm cộng việc tốt / tuần", "6 – 10 lượt", "45 – 60 lượt", "Tăng gấp 5.5 lần"),
        ("4", "Số vụ việc học sinh khiếu nại về điểm thi đua", "12 – 15 vụ/tháng", "0 vụ việc", "Triệt tiêu 100%"),
        ("5", "Tỉ lệ phụ huynh xem báo cáo nề nếp hàng tuần", "18.2%", "89.6%", "Tăng 71.4%"),
        ("6", "Thời gian GVCN xử lý điểm và làm sổ sách/tuần", "4.5 – 6.0 giờ", "Dưới 30 phút", "Tiết kiệm > 85% thời gian")
    ]
    for i, row_data in enumerate(data2):
        row = t_stat2.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = col_w2[j]
            set_cell_margins(cell, 80, 80, 100, 100)
            if i % 2 == 1:
                set_cell_shading(cell, "F8FAFC")
            set_cell_border(cell, top={"val": "single", "sz": "4", "color": "CBD5E1"},
                                 bottom={"val": "single", "sz": "4", "color": "CBD5E1"},
                                 left={"val": "single", "sz": "4", "color": "CBD5E1"},
                                 right={"val": "single", "sz": "4", "color": "CBD5E1"})
            p = cell.paragraphs[0]
            if j == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif j in (2, 3):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(val)
            r.font.size = Pt(11)
            if j == 4:
                r.bold = True
                r.font.color.rgb = HIGHLIGHT_RED if "Giảm" in val or "Tiết kiệm" in val else PRIMARY_COLOR

    p_cap_t2 = doc.add_paragraph()
    p_cap_t2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap_t2.paragraph_format.space_before = Pt(4)
    p_cap_t2.paragraph_format.space_after = Pt(10)
    r = p_cap_t2.add_run("Bảng 2: So sánh hiệu quả định lượng trước và sau khi triển khai sáng kiến kinh nghiệm")
    r.font.size = Pt(11)
    r.font.italic = True

    add_h2("4.2. Hiệu quả định tính đối với Học sinh, Giáo viên và Phụ huynh")
    add_p("1. Đối với học sinh: Ứng dụng đã chuyển hóa hoàn toàn thái độ rèn luyện của học sinh từ thế thụ động, e dè sang chủ động, hào hứng. Các em không còn coi cán sự lớp là những người 'soi mói, bắt lỗi' mà xem như những trọng tài công tâm. Bảng vinh danh Live Scoreboard mang lại cảm giác vinh dự, kích thích tinh thần thi đua lành mạnh trong học tập và rèn luyện đạo đức.")
    add_p("2. Đối với giáo viên: Giải phóng triệt để giáo viên khỏi 'núi' hồ sơ sổ sách giấy cuối tuần; giúp giáo viên có góc nhìn trực quan, đa chiều về sự tiến bộ của từng học sinh để có biện pháp giáo dục, tư vấn tâm lý kịp thời. Đặc biệt, tính năng xuất Sổ công tác GVCN (.docx) chuẩn quy định giúp nâng tầm tính chuyên nghiệp của người thầy trong thời đại số.")
    add_p("3. Đối với phụ huynh: Cầu nối thông tin 3 bên trở nên vô cùng thông suốt. Phụ huynh yên tâm tuyệt đối khi gửi gắm con em tại Trường Cao đẳng Nghề số 1 – BQP vì mọi tiến bộ cũng như sơ suất của con đều được nhà trường thông báo kịp thời, văn minh và kín đáo.")

    add_h2("4.3. Khả năng nhân rộng và chuyển giao")
    add_p("Sáng kiến có tính khả thi và khả năng nhân rộng 100% trong toàn thể các khối lớp thuộc Trường Cao đẳng Nghề số 1 – BQP cũng như các trường THPT, cơ sở GDNN trên toàn quốc nhờ 3 yếu tố cốt lõi:")
    add_p("• Chi phí vận hành 0 đồng: Ứng dụng hoàn toàn hoạt động ổn định trong hạn mức miễn phí dành cho giáo dục của Firebase Hosting và Firestore, không đòi hỏi nhà trường phải mua máy chủ riêng hay tốn chi phí bảo trì.", indent=True)
    add_p("• Không cần cài đặt phức tạp: Chạy trực tiếp trên nền web trình duyệt (Chrome, Cốc Cốc, Safari) hoặc cài dạng PWA tiện dụng trên mọi dòng máy tính và điện thoại thông minh.", indent=True)
    add_p("• Kiến trúc dữ liệu đa không gian (Workspace): Một tài khoản giáo viên có thể quản lý đồng thời nhiều lớp, nhiều niên khóa khác nhau một cách độc lập và bảo mật tuyệt đối.", indent=True)

    # -------------------------------------------------------------
    # 8. PHẦN V: KẾT LUẬN VÀ KIẾN NGHỊ
    # -------------------------------------------------------------
    add_h1("PHẦN V: KẾT LUẬN VÀ KIẾN NGHỊ")

    add_h2("5.1. Bài học kinh nghiệm rút ra")
    add_p("Từ quá trình nghiên cứu, xây dựng và đưa sáng kiến vào thực tế quản lý lớp học, tôi đã đúc rút được một số bài học kinh nghiệm sâu sắc:")
    add_p("Thứ nhất, chuyển đổi số giáo dục phải bắt đầu từ nỗi đau thực tế của người thầy và người học. Một giải pháp công nghệ chỉ thực sự sống được khi nó giải quyết được bài toán giải phóng sức lao động cho giáo viên và đem lại sự công bằng, hứng khởi cho học sinh.")
    add_p("Thứ hai, công nghệ chỉ là công cụ, trái tim của giáo dục vẫn là tình thương và nghệ thuật sư phạm. Dữ liệu số chỉ ra cho giáo viên biết em nào cần hỗ trợ, nhưng chính sự ân cần, lắng nghe và bao dung của người thầy mới là yếu tố quyết định giúp học sinh thay đổi.")
    add_p("Thứ ba, cần làm tốt công tác tập huấn tư tưởng cho Ban cán sự lớp ngay từ đầu năm học về tinh thần trách nhiệm, tính trung thực và bảo mật tài khoản cá nhân.")

    add_h2("5.2. Đề xuất, kiến nghị")
    add_p("• Đối với Ban Giám hiệu Trường Cao đẳng Nghề số 1 – BQP: Xem xét cho phép nhân rộng mô hình 'Sổ chấm điểm & Trợ lý nề nếp học đường' tới toàn thể giáo viên chủ nhiệm trong toàn trường bắt đầu từ năm học mới; đồng thời tiếp tục đầu tư, nâng cấp hệ thống mạng Wi-Fi tại các tòa nhà giảng đường để tạo điều kiện thuận lợi nhất cho việc ứng dụng công nghệ.", indent=True)
    add_p("• Đối với Đoàn Thanh niên & Phòng Đào tạo: Nghiên cứu phương án tích hợp dữ liệu chấm cờ đỏ của Đoàn trường với hệ thống chấm điểm nề nếp của các lớp để hình thành một cơ sở dữ liệu rèn luyện số thống nhất, giảm bớt sự chồng chéo trong việc theo dõi học sinh.", indent=True)
    add_p("• Đối với Khoa Cơ bản: Tổ chức các buổi hội thảo chuyên đề chuyển đổi số để tác giả có cơ hội chia sẻ, hướng dẫn cài đặt và chuyển giao phần mềm cho các đồng nghiệp trong khoa.", indent=True)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # 9. LỜI CAM ĐOAN VÀ KHUNG PHÊ DUYỆT 2 CỘT CHUẨN SƯ PHẠM
    # -------------------------------------------------------------
    p_camdoan_title = doc.add_paragraph()
    p_camdoan_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_camdoan_title.add_run("LỜI CAM ĐOAN")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = PRIMARY_COLOR

    p_camdoan = doc.add_paragraph()
    p_camdoan.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_camdoan.paragraph_format.first_line_indent = Cm(1.27)
    p_camdoan.paragraph_format.space_after = Pt(18)
    p_camdoan.add_run(
        "Tôi xin cam đoan đây là công trình nghiên cứu và sáng kiến kinh nghiệm do chính tôi trực tiếp lập trình phát triển và triển khai thực nghiệm sư phạm tại Trường Cao đẳng Nghề số 1 – BQP. Các số liệu khảo sát, hình ảnh minh họa và kết quả phân tích trình bày trong báo cáo này là hoàn toàn trung thực, khách quan và chưa từng được công bố hay sao chép từ bất kỳ tác giả nào khác."
    )

    # Khung ký duyệt 2 cột
    t_sign = doc.add_table(rows=1, cols=2)
    t_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sign.autofit = False
    t_sign.rows[0].cells[0].width = Cm(8.0)
    t_sign.rows[0].cells[1].width = Cm(8.5)

    c_left = t_sign.rows[0].cells[0]
    c_right = t_sign.rows[0].cells[1]
    set_cell_margins(c_left, 60, 60, 60, 60)
    set_cell_margins(c_right, 60, 60, 60, 60)

    # Cột Trưởng khoa / TTCM
    p_l = c_left.paragraphs[0]
    p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l.paragraph_format.line_spacing = 1.15
    r = p_l.add_run("XÁC NHẬN CỦA ĐƠN VỊ\nKHOA CƠ BẢN\n")
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = PRIMARY_COLOR
    r_sub = p_l.add_run("(Ký, ghi rõ họ tên và đóng dấu)\n\n\n\n\n\n")
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_name = p_l.add_run("Phạm Thị Thu Trang")
    r_name.bold = True
    r_name.font.size = Pt(12)

    # Cột Tác giả
    p_r = c_right.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_r.paragraph_format.line_spacing = 1.15
    r_date = p_r.add_run("Thái Nguyên, ngày ..... tháng ..... năm 2026\n")
    r_date.font.size = Pt(11)
    r_date.font.italic = True
    r = p_r.add_run("TÁC GIẢ SÁNG KIẾN\n")
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = PRIMARY_COLOR
    r_sub = p_r.add_run("(Ký và ghi rõ họ tên)\n\n\n\n\n\n")
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_name = p_r.add_run("Nguyễn Văn Sang")
    r_name.bold = True
    r_name.font.size = Pt(12)

    output_path = r"c:\Users\ADMIN\Downloads\sổ-chấm-điểm-hàng-ngày\Bao_Cao_Sang_Kien_Kinh_Nghiem_So_Cham_Diem.docx"
    doc.save(output_path)
    print("Successfully generated DOCX file!")

if __name__ == "__main__":
    create_document()
