# Kiểm chứng sportVid Studio — 10/11/2026

Đã bổ sung giao diện React gồm tổng quan, tạo video, xem kết quả, chỉnh thứ tự/thêm/sửa/xóa chủ đề trong bản nháp, nhập/xuất lộ trình và cài đặt thương hiệu/giọng/lịch. Mã Worker cung cấp đăng nhập và các thao tác GitHub ở phía máy chủ.

- 17/17 kiểm thử đạt: 8 kiểm tra video hiện có, 8 kiểm tra API Studio/phiên đăng nhập/quyền truy cập/bảo vệ khóa và 1 kiểm tra workflow YAML, kiểu dữ liệu lựa chọn và lưu Artifact khi upload lỗi.
- Build frontend + Worker thành công; Wrangler dry-run đọc đủ assets và xác nhận cấu hình Worker hợp lệ.
- Workflow dựng video đám mây, lưu Artifact 3 ngày, upload Drive tùy chọn và deploy Studio đã được thêm vào mã nguồn.
- Cấu hình Custom Domain đã đặt là `sportvid.beartalk.site`.
- Chưa chạy thử thao tác ghi/dispatch thật trên repo mới: Git trên máy ban đầu là HoaiDangit, chưa có quyền ghi repo sportVid. Đăng nhập tài khoản danglnh7519-commits đang chờ người dùng hoàn tất trong trình duyệt.
- Chưa triển khai domain: cần GitHub Secrets và quyền Cloudflare cho zone/custom domain. Wrangler hiện có OAuth cũ cho Worker, thiếu một số quyền zone/route.
- Chưa upload Drive thật: cần người dùng cấp OAuth ghi file và thiết lập folder đầu ra.
- Chưa xác nhận trực quan giao diện trên trình duyệt: in-app browser không truy cập được localhost; điều khiển Chrome native hết thời gian chờ cấp quyền. Không ghi nhận screenshot hoặc kiểm thử click thành công khi chưa quan sát được.

Không có khóa API, token hay mật khẩu thật trong source frontend hoặc các tệp mẫu. Không đưa `.env`, `.dev.vars`, cache và output vào Git.
