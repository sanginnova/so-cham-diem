import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')
file_path = r'D:\TOAN\CĐN01\12B4\Thông tin học sinh 12B4.xlsx'
wb = openpyxl.load_workbook(file_path)

print('Sheet names:', wb.sheetnames)
ws = wb['Tra cứu SĐT 12B4']
print('Active sheet:', wb.active.title)

print('\n--- Tra cứu Card cells ---')
for r in [4, 6, 7, 8, 9, 10, 11, 12, 13, 14]:
    print(f"B{r}: {ws[f'B{r}'].value:<25} | C{r}: {ws[f'C{r}'].value}")

print('\n--- Table samples (headers + first 3 students) ---')
for r in [4, 5, 6, 7]:
    row_vals = [ws.cell(r, c).value for c in range(6, 16)]
    print(f"Row {r}: {row_vals}")

