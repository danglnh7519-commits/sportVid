# Kiểm chứng bản cập nhật giọng đọc — 05/11/2026

- Đã đọc README dự án GitHub gốc vào thư mục tham khảo riêng; mã dự án gốc không bị sửa.
- Đã truy cập Drive công khai và tải 5 bộ minh họa: squat, alternating dumbbell curl, bird dog, forearm plank, chest-supported dumbbell row. Giữ NOTICE, sources.json và tên tệp đã chọn trong manifest.
- `npm test`: 8/8 kiểm thử đạt. Bao gồm nội dung lợi ích/hiệu lệnh, giọng WAV thu sẵn, thời lượng câu, thời điểm phụ đề và khoảng dành cho động tác không chồng lời.
- Đã tạo lời đọc thật bằng giọng nam `vi-VN-NamMinhNeural` qua Edge Read Aloud, không yêu cầu khóa Azure. Mẫu squat có 21 đoạn voice trên cả 6 cảnh và 7 hiệu lệnh (3 hiệu lệnh chuẩn bị, 4 hiệu lệnh thực hiện).
- Video mẫu cập nhật khoảng 101 giây ở 1080×1920, 30fps, codec H.264 với âm thanh AAC; có giọng nam, nhạc nền và phụ đề. Metadata chính xác nằm trong `renders/demo/complete.json`.
- Đã kiểm tra trực quan cảnh mở, minh họa squat, hiệu lệnh và cảnh kết. Font tiếng Việt được dùng đồng nhất.
- Đã tạo và tính thời lượng giọng thật cho chủ đề 3 động tác squat/bird dog/plank: 114,5 giây, 11 hiệu lệnh; nằm trong giới hạn 60–150 giây. Chủ đề này đã kiểm tra timeline âm thanh, không render thêm MP4 trong lượt cập nhật.
- Đã thử chạy lại ngày hoàn tất: bỏ qua video đã có. Đã thử gọi tác vụ khi renderer khác hoạt động: khóa chặn chạy đồng thời.
- Lỗi dịch vụ tạo giọng không bị bỏ qua thành video im lặng. Câu voice hoàn chỉnh được lưu cache; câu lỗi bị bỏ. Có giãn cách yêu cầu và thử lại tối đa 3 lần, chờ lâu hơn khi gặp HTTP 429.
- Đã kiểm tra cú pháp PowerShell cài lịch. **Chưa cài/kích hoạt lịch trên máy**, chưa gọi Azure bằng key thật và chưa kết nối/đăng Facebook.
- Edge là tích hợp cộng đồng, có thể thay đổi khả dụng. Có thể cấu hình Azure Speech chính thức hoặc dùng WAV thu thật; Azure bằng khóa thật chưa được kiểm tra trong lượt bàn giao này.
