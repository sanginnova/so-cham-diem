# Lớp và niên khóa độc lập

Sau đăng nhập, thanh **Lớp / Niên khóa đang làm việc** cho phép chọn sổ cần dùng. Giáo viên nhấn **+ Lớp / Niên khóa mới**, nhập tên lớp, niên khóa (ví dụ 2026-2027) và ngày bắt đầu tuần 1.

- Lớp mới có danh sách học sinh và nhật ký trống. Biểu điểm đang dùng được sao chép thành bộ riêng, chỉnh ở lớp mới không đổi lớp cũ.
- Niên khóa được gắn với một cấu hình lớp riêng và không sửa thành năm khác trong Cài đặt. Chuyển năm bằng cách tạo lớp/niên khóa mới.
- Có thể tải danh sách học sinh Excel của lớp cũ rồi nhập vào lớp mới. Không tự sao chép nhật ký để tránh mang điểm năm cũ sang năm mới.
- Bản sao lưu được nhập vào lớp đang chọn; định danh trong lớp mới được tách riêng, không ghi đè học sinh lớp khác. Lịch tuần và nội dung sao lưu cần được kiểm tra nếu nhập nhật ký lịch sử vào một niên khóa khác.
- Quản trị có thể tạo và giao lớp cho giáo viên trong màn hình quản trị. Lớp trưởng được gắn với đúng cấu hình lớp khi cấp/cập nhật tài khoản.
- Đổi lớp làm mới các biểu mẫu đang mở; dữ liệu cập nhật muộn từ lớp trước bị lọc khỏi màn hình hiện tại.

## Tương thích dữ liệu cũ

Không xóa, đổi ID hay tự ghi đè dữ liệu cũ. Lớp cũ giữ cách khóa kỳ cũ. Các lớp mới có `scopeVersion: 2`, danh mục và khóa kỳ riêng theo classConfig ID. Tài khoản lớp trưởng cũ tiếp tục xem lớp cũ; cần cấp/cập nhật phân công trước khi dùng với lớp mới.

Mỗi cấu hình lớp là một sổ của một giáo viên trong một niên khóa. Chưa bổ sung nhiều trường hoặc nhiều giáo viên đồng quản lý cùng sổ. Tra cứu phụ huynh qua backend là hạng mục tiếp theo; lần nâng cấp này không mở quyền đọc công khai Firestore.

## Kiểm chứng

13 kiểm thử nghiệp vụ và 9 kiểm thử Firestore giả lập; TypeScript và build production. Có kiểm thử tách hai lớp cùng giáo viên, sao lưu giữa hai niên khóa, lớp trưởng truy cập đúng lớp, khóa tuần của một lớp và giữ nguyên niên khóa. Chưa kiểm thử toàn bộ thao tác bằng tài khoản thật trên thiết bị di động.
