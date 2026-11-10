# sportVid

Repository: https://github.com/danglnh7519-commits/sportVid

Tên hiển thị trong video mặc định là BODYFORGE; có thể đổi `brand` và `tagline` trong config.json.

Giao diện quản lý, backend bảo vệ khóa, lịch dựng video GitHub Actions và upload Drive đã được bổ sung. Xem **DEPLOY.md** để cấu hình triển khai tại **sportvid.beartalk.site**. Chạy giao diện trên máy: `npm ci`, `npm run web:build`, `npm run web:dev`. Các khóa chỉ đặt trong GitHub Secrets/Cloudflare Worker Secrets; không nhập token vào giao diện.

Minh họa xem trước trên web dùng ảnh 02 của Bryl Lim, CC BY-SA 4.0; thông tin nguồn tại web/public/IMAGE-CREDITS.txt.

Dự án video tập luyện độc lập với BotTeleNewsVid. Không Telegram, không Gemini, không chatbot. Kịch bản tiếng Việt lấy từ danh mục đã soạn và lộ trình JSON của người dùng; React/Remotion dựng animation web thành MP4.

## Có gì trong bản này

- MP4 dọc 1080 × 1920, 30fps, H.264 + AAC, 60–150 giây; kiểm tra đầu ra trước khi đánh dấu hoàn tất.
- 7 chủ đề xoay vòng: giảm mỡ, tăng cân, tăng cơ, nền tảng toàn thân và kỹ thuật. Danh mục đầu tiên có squat, curl, bird dog, plank, row. Có thể thêm động tác bằng dữ liệu, không cần đổi renderer.
- Tải ảnh từ các thư mục động tác trên Drive đã chia sẻ; giữ NOTICE và sources.json. Bản đầu chọn tối đa 3 ảnh đầu cùng tác giả và giấy phép, không ghép các phong cách khác nhau thành tư thế giả. Hiển thị minh họa từng tư thế kết hợp animation chữ, vòng tiến trình và hiệu ứng web; chưa có hoạt hình 3D cơ thể liên tục.
- Giọng nam Việt Nam `vi-VN-NamMinhNeural`, tốc độ chậm nhẹ và pitch thấp hơn. Mặc định `auto`: dùng Azure nếu đã cấu hình key, nếu chưa thì dùng Edge Read Aloud qua thư viện `node-edge-tts`. Edge không yêu cầu key trong bản này nhưng là tích hợp cộng đồng, có thể thay đổi khả dụng; Azure là lựa chọn API chính thức và có thể phát sinh phí. Có thể dùng WAV thu thật thay thế. Không gán phong cách cảm xúc chưa được giọng hỗ trợ.
- Mỗi bài có lời giải thích tác động/nhóm cơ, chuẩn bị, hiệu lệnh động tác và nhịp thở, lời động viên và kết thúc. Chế độ kỹ thuật có đếm chuẩn bị 3–2–1 và hai nhịp minh họa. Hiệu lệnh được giữ trên màn hình và dành ít nhất holdSeconds để người xem thực hiện, tự kéo dài nếu giọng đọc cần thêm thời gian. Đây là nhịp minh họa ngắn, không phải một hiệp đầy đủ của giáo án.
- Phụ đề theo từng câu, canh bằng thời lượng WAV thực tế. Nhạc tổng hợp nguyên bản từ mã nguồn, giảm âm lượng khi có lời và fade đầu/cuối. Không dùng nhạc tải lại; không hứa tuyệt đối không bị Content ID nhận nhầm.
- Lịch Windows mẫu **12:00 mỗi ngày, giờ Việt Nam**; chống chạy trùng, chạy lại không xuất trùng ngày đã hoàn tất. Không tự đăng lên Facebook.

## Chạy nhanh (Node.js 22+)

```powershell
npm ci
npm run sync-drive
npm run demo
npm run studio
```

`demo` dựng bản mẫu có **giọng nam, hiệu lệnh, giải thích lợi ích**, nhạc, phụ đề và hình thật từ Drive. Thời lượng mục tiêu 90 giây, tự nới nếu lời đọc cần thêm thời gian, tối đa 150 giây. Kết quả ở `renders/demo/`: video.mp4, cover.png, caption.txt, CREDITS.txt, exercise-benefits.txt, plan.json, voice-script.json và complete.json. Studio đọc `public/preview.json` của lần dựng gần nhất. Muốn xem bản không lời: `node scripts/cli.mjs demo --silent --force`.

Chỉ tải squat để thử nhanh: `node scripts/cli.mjs sync-drive --only squat`. Đồng bộ đầy đủ trước khi chạy chu kỳ nhiều động tác. Danh mục là hướng dẫn tập luyện chung, không có cam kết giảm bao nhiêu kg hoặc tăng bao nhiêu cơ. Đối chiếu nội dung, hình minh họa và lời đọc trước khi đăng công khai.

## Giọng nam và tạo video

1. Có thể chạy ngay bằng Edge: `node scripts/cli.mjs daily --voice edge`. Muốn dùng Azure, sao chép `.env.example` thành `.env`, điền `AZURE_SPEECH_KEY` và region của Speech resource. Không gửi key qua chat, không commit `.env`. Có thể đặt VOICE_PROVIDER=azure hoặc edge để chọn cố định; lỗi nhà cung cấp được báo rõ, không âm thầm thay giọng.
2. Xem bộ hình và giấy phép trong `public/media/`; ghi công đã tự động đưa vào đầu ra.
3. Chạy `node scripts/cli.mjs plan --date 2026-11-05` để xem trước kịch bản.
4. Chạy `npm run daily`. Nếu dịch vụ giọng đọc lỗi hoặc thiếu hình thì dừng với lỗi rõ, không tạo bản im lặng giả thành video hoàn chỉnh. Edge thử lại tối đa 3 lần cho câu bị ngắt, bỏ tệp chưa hoàn chỉnh và giữ cache WAV đã tạo thành công.

Muốn dùng bản thu: chạy `plan`, thu từng câu WAV PCM theo `voice-script.json`, giữ đúng tên scene-1-1.wav… trong thư mục recordings, rồi chạy:

```powershell
node scripts/cli.mjs daily --voice-dir recordings
```

Lời dẫn dài sẽ tự nới cảnh để tránh bị cắt. Nếu tổng dài quá 150 giây, tác vụ dừng; rút ngắn kịch bản hoặc giảm số động tác. Thời gian trong JSON là mục tiêu, có thể dài hơn khi giọng đọc cần thêm thời gian. Không tự tăng tốc giọng đến khó nghe.

## Lộ trình của bạn

Sao chép `content/custom-plan.example.json`, chỉnh ngày bắt đầu, danh sách topics, mục tiêu (`giam-can`, `tang-can`, `tang-co`, `build-body`), tiêu đề, mở đầu, exerciseIds và seconds 60–150. `mode: technique` dùng đúng 1 động tác và chia thành 3 phần: lợi ích, chuẩn bị, cùng tập theo hiệu lệnh. Bỏ mode để hướng dẫn nhiều động tác với lời dẫn rút gọn. Đây là thứ tự chủ đề video, không tự coi mọi ngày đều là ngày tập nặng; lịch nghỉ và khối lượng cần được thiết kế theo người tập.

```powershell
node scripts/cli.mjs plan --plan content/custom-plan.example.json --date 2026-11-06
node scripts/cli.mjs daily --plan content/custom-plan.example.json
```

Muốn lịch chạy tự động đọc lộ trình đó, đổi `defaultPlan` trong config.json. Chọn chủ đề bằng số ngày từ startDate, xoay vòng khi hết danh sách. Các ngày bỏ lỡ không tự dựng bù. `--date YYYY-MM-DD` dựng bù có chủ đích; `--force` dựng lại ngày hoàn tất. Thêm bài trong content/exercises.json cùng folderId của Drive; thêm lời dẫn trong content/coaching.json gồm benefitTitle, benefit, prepare, actions (text, label, holdSeconds), finish và sources, rồi đồng bộ lại. Chỉnh holdSeconds để thay khoảng dành cho động tác; thời gian thực tế luôn ít nhất bằng độ dài giọng đọc. Các nhịp đếm/hành động hiển thị đồng bộ theo timeline WAV.

## Lịch tự động 12:00

Sau khi đã xuất thử thành công với voice thật:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-schedule.ps1
```

Máy phải ở UTC+07 không DST, có điện, người dùng đăng nhập và có mạng khi dùng TTS. Task Scheduler sẽ đánh thức máy nếu hệ thống hỗ trợ, chạy khi bỏ lỡ giờ và thử lại tối đa 2 lần khi lỗi. Script chưa được tự cài trên máy trong quá trình bàn giao. Thay giờ trong config.json rồi chạy script lại để cập nhật trigger. Gỡ lịch: thêm `-Remove`.

Máy chủ Linux có thể dùng cron `0 5 * * *` ở múi giờ UTC, đặt working directory dự án rồi gọi `/usr/bin/node scripts/cli.mjs daily`. Không thể bảo đảm chạy mỗi ngày nếu tắt máy. Không dùng Cloudflare Worker để render trình duyệt dài.

Mỗi ngày có thư mục renders/YYYY-MM-DD. Khóa toàn cục renders/render.lock chứa PID và thư mục tác vụ; chặn các renderer chạy đồng thời để bảo vệ cache chung. Nếu máy bị tắt cưỡng bức, kiểm tra không còn renderer đang chạy rồi xóa lock còn sót để thử lại.

## Drive, bản quyền và xuất bản

Folder ID gốc: `1K7QWBeciNuaF8GCub8OkhbhRy7czzcYr`. Dùng folderId trực tiếp từng động tác nên không phụ thuộc việc trang gốc chỉ hiện 50 thư mục. Bộ nạp HTML công khai có thể thay đổi theo Google; GOOGLE_DRIVE_API_KEY tùy chọn bật Drive API phân trang khi cần. Lỗi đăng nhập/HTML thay vì ảnh được phát hiện. Không tải tệp thực thi.

Các ảnh được chọn thuộc Bryl Lim/Everkinetic (CC BY-SA 4.0) hoặc Free Exercise DB / yuhonas, nguồn gốc Ollie Jennings (Unlicense theo repository nguồn). Giữ ghi công, URL nguồn và giấy phép; bản video được bàn giao theo CC BY-SA 4.0 để tương thích với các bộ có điều kiện chia sẻ tương tự. CREDITS.txt liệt kê chính xác ảnh dùng và giữ nguyên toàn bộ NOTICE, có thể kèm cả ảnh không dùng. Ghi công được chèn trên khung hình và caption Facebook. Nếu đổi bộ ảnh, phải cập nhật giấy phép/credit theo nguồn tương ứng; bộ nạp sẽ dừng khi không có bộ giấy phép đang hỗ trợ.

Chưa có kết nối Facebook Page, upload hoặc lịch đăng. Đầu ra sẵn để kiểm tra và tải lên Reels thủ công. Không có cam kết tăng tương tác; lời mở đầu, phụ đề, CTA lưu/chia sẻ là điểm khởi đầu để bạn đo và điều chỉnh.

## Kiểm tra

`npm test`: ngày Việt Nam/luân phiên, lịch khung hình liên tục, giới hạn 60–150 giây, đầu vào sai, thời lượng WAV, parse Drive, đầy đủ lợi ích/hiệu lệnh và khoảng giữ hiệu lệnh không chồng lời. CLI render còn đọc lại metadata MP4, kiểm tra dọc full HD, có audio và thời lượng. Azure với key thật, Task Scheduler sau đăng nhập và Facebook cần kiểm tra trong môi trường sử dụng.

Lời giải thích được soạn từ [ACE — Squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/), [NASM — Bird Dog](https://www.nasm.org/resource-center/exercise-library/bird-dog), [NASM — Plank](https://www.nasm.org/resource-center/exercise-library/plank) và các nguồn cơ chế gập khuỷu/kéo ngang ghi cụ thể trong coaching.json. Nguồn dùng để diễn giải nhóm cơ và tác động tập luyện, không bảo đảm kết quả cá nhân hoặc điều trị bệnh. Tích hợp Edge: [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts).

Tài liệu: [Remotion renderer](https://www.remotion.dev/docs/renderer/render-media), [Azure Speech REST](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [WHO vận động thể chất](https://www.who.int/publications/i/item/9789240015128).
