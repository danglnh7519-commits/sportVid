# Kiểm chứng sportVid Studio — 12/11/2026

Đã bổ sung giao diện React gồm tổng quan, tạo video, xem kết quả, chỉnh thứ tự/thêm/sửa/xóa chủ đề trong bản nháp, nhập/xuất lộ trình và cài đặt thương hiệu/giọng/lịch. Mã Worker cung cấp đăng nhập và các thao tác GitHub ở phía máy chủ.

- 17/17 kiểm thử đạt: 8 kiểm tra video hiện có, 8 kiểm tra API Studio/phiên đăng nhập/quyền truy cập/bảo vệ khóa và 1 kiểm tra workflow YAML, kiểu dữ liệu lựa chọn và lưu Artifact khi upload lỗi.
- Build frontend + Worker thành công; Wrangler dry-run đọc đủ assets và xác nhận cấu hình Worker hợp lệ.
- Workflow dựng video đám mây, lưu Artifact 3 ngày, upload Drive tùy chọn và deploy Studio đã được thêm vào mã nguồn.
- Cấu hình Custom Domain đã đặt là `sportvid.beartalk.site`.
- Mã nguồn đã lên `main` bằng tài khoản `danglnh7519-commits`. [CI trên GitHub](https://github.com/danglnh7519-commits/sportVid/actions/runs/42739152240) đã chạy thành công.
- Lượt tạo thủ công và hai lượt chạy theo lịch đều thành công. GitHub đã tạo [bản tải về ngày 11/11](https://github.com/danglnh7519-commits/sportVid/actions/runs/43018773873/artifacts/13854560859).
- DNS của `beartalk.site` dùng Cloudflare. `sportvid.beartalk.site` chờ triển khai Worker. Workflow đã build thành công và bỏ qua bước triển khai vì repo chưa có GitHub Secrets.
- Việc lưu vào Drive cá nhân cần cấu hình OAuth và thư mục đích theo mục 4 của [hướng dẫn triển khai](DEPLOY.md).
- Chưa xác nhận trực quan giao diện trên trình duyệt: in-app browser không truy cập được localhost; điều khiển Chrome native hết thời gian chờ cấp quyền. Không ghi nhận screenshot hoặc kiểm thử click thành công khi chưa quan sát được.

Không có khóa API, token hay mật khẩu thật trong source frontend hoặc các tệp mẫu. Không đưa `.env`, `.dev.vars`, cache và output vào Git.
