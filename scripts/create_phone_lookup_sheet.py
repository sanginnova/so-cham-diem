import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
import os
import sys

# Ensure utf-8 output
sys.stdout.reconfigure(encoding='utf-8')

file_path = r'D:\TOAN\CĐN01\12B4\Thông tin học sinh 12B4.xlsx'
if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    sys.exit(1)

wb = openpyxl.load_workbook(file_path)
ws_ds = wb['DanhSachHocSinh']

# Extract all 41 students of 11B4/12B4
students = []
for r in range(5, ws_ds.max_row + 1):
    c_val = ws_ds.cell(r, 8).value
    if c_val and str(c_val).strip() in ['11B4', '12B4']:
        stt = len(students) + 1
        ma_hs = str(ws_ds.cell(r, 2).value or '').strip()
        hoten = str(ws_ds.cell(r, 3).value or '').strip()
        ten = str(ws_ds.cell(r, 4).value or '').strip()
        dob = str(ws_ds.cell(r, 6).value or '').strip()
        gioitinh = str(ws_ds.cell(r, 7).value or '').strip()
        
        diachi_thon = str(ws_ds.cell(r, 15).value or '').strip()
        diachi_xa = str(ws_ds.cell(r, 14).value or ws_ds.cell(r, 13).value or '').strip()
        diachi_full = str(ws_ds.cell(r, 19).value or ws_ds.cell(r, 20).value or '').strip()
        if not diachi_full:
            diachi_full = f"{diachi_thon}, {diachi_xa}".strip(', ')
            
        sdt_hs = str(ws_ds.cell(r, 31).value or '').strip()
        cha = str(ws_ds.cell(r, 36).value or '').strip()
        sdt_cha = str(ws_ds.cell(r, 39).value or '').strip()
        me = str(ws_ds.cell(r, 42).value or '').strip()
        sdt_me = str(ws_ds.cell(r, 45).value or '').strip()

        def clean_phone(p):
            p = p.replace(' ', '').replace('.', '').replace('-', '')
            if p and p.isdigit() and len(p) == 9 and not p.startswith('0'):
                p = '0' + p
            return p

        sdt_hs = clean_phone(sdt_hs)
        sdt_cha = clean_phone(sdt_cha)
        sdt_me = clean_phone(sdt_me)

        students.append({
            'stt': stt,
            'ma_hs': ma_hs,
            'hoten': hoten,
            'ten': ten,
            'dob': dob,
            'gioitinh': gioitinh,
            'diachi': diachi_full,
            'sdt_hs': sdt_hs,
            'cha': cha,
            'sdt_cha': sdt_cha,
            'me': me,
            'sdt_me': sdt_me
        })

print(f"Loaded {len(students)} students for 12B4.")

sheet_name = 'Tra cứu SĐT 12B4'
if sheet_name in wb.sheetnames:
    del wb[sheet_name]

ws = wb.create_sheet(title=sheet_name, index=0)
wb.active = ws

# Fonts
font_title = Font(name='Times New Roman', size=14, bold=True, color='1E3A8A')
font_subtitle = Font(name='Times New Roman', size=16, bold=True, color='DC2626')
font_note = Font(name='Times New Roman', size=11, italic=True, color='4B5563')

font_card_hdr = Font(name='Times New Roman', size=12, bold=True, color='FFFFFF')
font_card_label = Font(name='Times New Roman', size=11, bold=True, color='1F2937')
font_card_val = Font(name='Times New Roman', size=12, bold=False, color='111827')
font_input = Font(name='Times New Roman', size=13, bold=True, color='1E3A8A')

font_phone_red = Font(name='Times New Roman', size=14, bold=True, color='DC2626')
font_phone_blue = Font(name='Times New Roman', size=14, bold=True, color='1D4ED8')

font_tbl_hdr = Font(name='Times New Roman', size=11, bold=True, color='FFFFFF')
font_tbl_data = Font(name='Times New Roman', size=10, bold=False, color='111827')

# Fills
fill_navy = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
fill_blue_hdr = PatternFill(start_color='2563EB', end_color='2563EB', fill_type='solid')
fill_input = PatternFill(start_color='FEF08A', end_color='FEF08A', fill_type='solid')
fill_card_label = PatternFill(start_color='F3F4F6', end_color='F3F4F6', fill_type='solid')
fill_phone_father = PatternFill(start_color='FEF9C3', end_color='FEF9C3', fill_type='solid')
fill_phone_mother = PatternFill(start_color='EFF6FF', end_color='EFF6FF', fill_type='solid')
fill_zebra = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')
fill_tbl_top = PatternFill(start_color='0D9488', end_color='0D9488', fill_type='solid')

# Borders
thin_line = Side(border_style='thin', color='D1D5DB')
border_cell = Border(left=thin_line, right=thin_line, top=thin_line, bottom=thin_line)
thick_box_side = Side(border_style='medium', color='1E3A8A')
border_input = Border(left=thick_box_side, right=thick_box_side, top=thick_box_side, bottom=thick_box_side)

align_center = Alignment(horizontal='center', vertical='center')
align_left = Alignment(horizontal='left', vertical='center')
align_left_wrap = Alignment(horizontal='left', vertical='center', wrap_text=True)
align_right = Alignment(horizontal='right', vertical='center')

# Title section
ws.merge_cells('B1:D1')
ws['B1'] = 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP • KHOA CƠ BẢN'
ws['B1'].font = font_title
ws['B1'].alignment = align_left

ws.merge_cells('B2:D2')
ws['B2'] = 'TRA CỨU NHANH SĐT HỌC SINH & PHỤ HUYNH LỚP 12B4'
ws['B2'].font = font_subtitle
ws['B2'].alignment = align_left

ws.merge_cells('B3:D3')
ws['B3'] = '👉 Nhập tên (hoặc chọn từ mũi tên xổ xuống tại ô C4) để xem ngay SĐT cha, mẹ và thông tin HS:'
ws['B3'].font = font_note
ws['B3'].alignment = align_left

# Search / Card section
ws['B4'] = '🔍 NHẬP / CHỌN TÊN HS:'
ws['B4'].font = Font(name='Times New Roman', size=11, bold=True, color='FFFFFF')
ws['B4'].fill = fill_navy
ws['B4'].alignment = align_center
ws['B4'].border = border_cell

ws['C4'] = 'Nguyễn Duy Chinh' # Default placeholder so user sees immediate results
ws['C4'].font = font_input
ws['C4'].fill = fill_input
ws['C4'].alignment = align_center
ws['C4'].border = border_input

# Output fields in Card
card_fields = [
    (6, 'Họ và tên học sinh:', '=IF($C$4="","",IFERROR(INDEX($H$5:$H$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),"Không tìm thấy học sinh"))', font_card_val, None),
    (7, 'Mã học sinh:', '=IF($C$4="","",IFERROR(INDEX($G$5:$G$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_card_val, None),
    (8, 'Ngày sinh:', '=IF($C$4="","",IFERROR(INDEX($I$5:$I$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_card_val, None),
    (9, 'SĐT Học sinh:', '=IF($C$4="","",IFERROR(INDEX($J$5:$J$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_card_val, None),
    (10, '👨 Họ tên Cha / Bố:', '=IF($C$4="","",IFERROR(INDEX($K$5:$K$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_card_val, None),
    (11, '📞 SĐT BỐ / CHA:', '=IF($C$4="","",IFERROR(INDEX($L$5:$L$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_phone_red, fill_phone_father),
    (12, '👩 Họ tên Mẹ:', '=IF($C$4="","",IFERROR(INDEX($M$5:$M$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_card_val, None),
    (13, '📞 SĐT MẸ:', '=IF($C$4="","",IFERROR(INDEX($N$5:$N$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_phone_blue, fill_phone_mother),
    (14, '🏠 Địa chỉ thường trú:', '=IF($C$4="","",IFERROR(INDEX($O$5:$O$45,MATCH("*"&$C$4&"*",$H$5:$H$45,0)),""))', font_card_val, None),
]

for row_idx, label, formula, val_font, val_fill in card_fields:
    ws[f'B{row_idx}'] = label
    ws[f'B{row_idx}'].font = font_card_label
    ws[f'B{row_idx}'].fill = fill_card_label
    ws[f'B{row_idx}'].alignment = align_left
    ws[f'B{row_idx}'].border = border_cell

    ws[f'C{row_idx}'] = formula
    ws[f'C{row_idx}'].font = val_font
    if val_fill:
        ws[f'C{row_idx}'].fill = val_fill
    ws[f'C{row_idx}'].alignment = align_left_wrap if row_idx == 14 else align_center
    ws[f'C{row_idx}'].border = border_cell
    ws.row_dimensions[row_idx].height = 28 if row_idx in [11, 13] else 24

ws.row_dimensions[4].height = 30
ws.row_dimensions[14].height = 42

# Right section: Master Database of 12B4
ws.merge_cells('F3:O3')
ws['F3'] = '📋 DANH SÁCH TOÀN BỘ 41 HỌC SINH LỚP 12B4 (CƠ SỞ DỮ LIỆU ĐỂ TRA CỨU)'
ws['F3'].font = Font(name='Times New Roman', size=12, bold=True, color='FFFFFF')
ws['F3'].fill = fill_tbl_top
ws['F3'].alignment = align_center

table_headers = [
    ('F', 'STT'),
    ('G', 'Mã học sinh'),
    ('H', 'Họ và tên học sinh'),
    ('I', 'Ngày sinh'),
    ('J', 'SĐT Học sinh'),
    ('K', 'Họ tên Cha'),
    ('L', 'SĐT Cha'),
    ('M', 'Họ tên Mẹ'),
    ('N', 'SĐT Mẹ'),
    ('O', 'Địa chỉ thường trú')
]

for col_letter, h_name in table_headers:
    cell = ws[f'{col_letter}4']
    cell.value = h_name
    cell.font = font_tbl_hdr
    cell.fill = fill_blue_hdr
    cell.alignment = align_center
    cell.border = border_cell

# Fill data rows 5 to 45
for idx, s in enumerate(students):
    r_idx = 5 + idx
    ws.row_dimensions[r_idx].height = 20
    is_even = (idx % 2 == 1)
    row_fill = fill_zebra if is_even else None

    row_data = [
        ('F', s['stt'], align_center, None),
        ('G', s['ma_hs'], align_center, None),
        ('H', s['hoten'], align_left, Font(name='Times New Roman', size=10, bold=True)),
        ('I', s['dob'], align_center, None),
        ('J', s['sdt_hs'], align_center, None),
        ('K', s['cha'], align_left, None),
        ('L', s['sdt_cha'], align_center, Font(name='Times New Roman', size=10, bold=True, color='DC2626') if s['sdt_cha'] else None),
        ('M', s['me'], align_left, None),
        ('N', s['sdt_me'], align_center, Font(name='Times New Roman', size=10, bold=True, color='1D4ED8') if s['sdt_me'] else None),
        ('O', s['diachi'], align_left_wrap, None)
    ]

    for col_letter, val, align, custom_font in row_data:
        c = ws[f'{col_letter}{r_idx}']
        # Note: Set phone numbers explicitly as text
        if col_letter in ['J', 'L', 'N']:
            c.number_format = '@'
            c.value = str(val) if val else ''
        else:
            c.value = val

        c.font = custom_font or font_tbl_data
        if row_fill:
            c.fill = row_fill
        c.alignment = align
        c.border = border_cell

# Set Column Widths
col_widths = {
    'A': 3,
    'B': 24,
    'C': 42,
    'D': 3,
    'E': 3,
    'F': 6,
    'G': 18,
    'H': 26,
    'I': 13,
    'J': 15,
    'K': 22,
    'L': 16,
    'M': 22,
    'N': 16,
    'O': 48
}

for col_l, w in col_widths.items():
    ws.column_dimensions[col_l].width = w

# Data Validation: Dropdown list for cell C4
# In Excel, a data validation formula like =$H$5:$H$45 creates a native dropdown
dv = DataValidation(type="list", formula1="=$H$5:$H$45", allow_blank=True)
dv.error = 'Vui lòng chọn học sinh từ danh sách hoặc nhập tên học sinh có trong lớp.'
dv.errorTitle = 'Tên học sinh không hợp lệ'
dv.prompt = 'Bấm mũi tên để chọn học sinh hoặc nhập tên cần tra cứu'
dv.promptTitle = 'Chọn học sinh 12B4'

ws.add_data_validation(dv)
dv.add(ws['C4'])

wb.save(file_path)
print("Successfully created sheet 'Tra cứu SĐT 12B4' and saved to:", file_path)

