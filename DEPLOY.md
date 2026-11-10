# Triển khai sportVid tại sportvid.beartalk.site

Mã nguồn và cấu hình vận hành: **danglnh7519-commits/sportVid**. Giao diện + API nhẹ chạy trên Cloudflare Worker; việc dựng MP4 chạy trong GitHub Actions. Lộ trình và cài đặt được lưu bằng commit vào chính repo; không cần database. Máy tính có thể tắt khi dùng lịch đám mây.

## 1. Đưa mã nguồn lên đúng repo

Đăng nhập Git bằng tài khoản có quyền ghi `danglnh7519-commits/sportVid`, rồi push nhánh `main`. Các workflow sẵn có:

- **Tests**: kiểm tra mã và build giao diện.
- **Deploy Studio**: build, triển khai giao diện và đồng bộ bí mật vào Worker.
- **Render workout video**: chạy bằng nút trong Studio hoặc Actions → Run workflow; tự chạy mỗi ngày lúc 12:00 giờ Việt Nam nếu không tắt lịch.

Repo có thể công khai. `.env`, `.dev.vars`, token, cache, thư viện đã cài và video đầu ra đã được loại khỏi Git. Không dán giá trị bí mật vào issue, mã nguồn hoặc chat.

## 2. Thiết lập GitHub Secrets

Trong repo: **Settings → Secrets and variables → Actions → Secrets**.

| Secret | Dùng cho |
|---|---|
| `CF_API_TOKEN` | Triển khai vào đúng tài khoản Cloudflare của bạn; cấp quyền Worker Scripts và quyền cấu hình route/domain cho zone beartalk.site |
| `CF_ACCOUNT_ID` | Account ID Cloudflare chứa Worker/zone |
| `STUDIO_GITHUB_TOKEN` | Fine-grained GitHub token, chỉ chọn repo sportVid, quyền **Contents: read/write**, **Actions: read/write**, **Variables: read/write** |
| `STUDIO_ADMIN_PASSWORD` | Mật khẩu riêng để đăng nhập giao diện Studio; nên dùng chuỗi dài và duy nhất |
| `STUDIO_SESSION_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 ký tự, dùng ký phiên đăng nhập; không dùng lại mật khẩu quản lý |

Không dùng token Git cá nhân toàn tài khoản làm khóa frontend. `STUDIO_GITHUB_TOKEN` chỉ đi từ GitHub Secrets qua stdin đến Cloudflare Worker Secrets. Worker gọi GitHub thay cho trình duyệt. Khi thay token/mật khẩu, cập nhật Secret và chạy lại Deploy Studio.

Secrets tùy chọn:

| Secret | Khi nào cần |
|---|---|
| `AZURE_SPEECH_KEY` | Khi chọn Azure cho giọng nam; để trống vẫn dùng Edge Read Aloud |
| `GOOGLE_DRIVE_API_KEY` | Khi cần Drive API để liệt kê ảnh thay cho trang Drive công khai |
| `DRIVE_CLIENT_ID`, `DRIVE_CLIENT_SECRET`, `DRIVE_REFRESH_TOKEN` | Chỉ cần khi tự động upload đầu ra vào Drive cá nhân |

Trong **Variables**, có thể đặt:

- `DAILY_RENDER_ENABLED`: `true` hoặc `false`; nút lịch trong Studio chỉnh biến này. Mặc định chạy lịch.
- `AZURE_SPEECH_REGION`: region tài nguyên Azure, mặc định `southeastasia`.
- `DRIVE_FOLDER_ID`: folder đầu ra mà tài khoản OAuth có quyền ghi.
- `DRIVE_UPLOAD_ENABLED=true`: hiển thị trạng thái đã cấu hình Drive trong Studio, đặt sau khi đã upload thử thành công.

Các giá trị trên không cần đưa vào bundle web. Thư mục ảnh gốc đã share chỉ dùng để **đọc**, không tự cấp quyền upload.

## 3. Đưa giao diện lên sportvid.beartalk.site

`wrangler.jsonc` đã khai báo Custom Domain **sportvid.beartalk.site**. Domain `beartalk.site` phải thuộc tài khoản Cloudflare dùng triển khai và là zone đang hoạt động trên Cloudflare. Việc chỉ đăng ký tên miền ở một nhà cung cấp chưa đồng nghĩa DNS đã dùng Cloudflare.

Sau khi đã đặt Secrets, mở **Actions → Deploy Studio → Run workflow**. Workflow build app, deploy Worker, rồi gửi các bí mật qua stdin bằng `wrangler secret bulk`. Lần deploy đầu có thể hiển thị trang yêu cầu hoàn tất thiết lập trong thời gian ngắn; API thao tác vẫn bị khóa cho đến khi bí mật đã được thiết lập.

Cloudflare Custom Domain sẽ tạo cấu hình DNS/chứng chỉ phù hợp. Không sửa bản ghi tên miền gốc hoặc dịch vụ khác. Nếu `sportvid.beartalk.site` đã có bản ghi/dịch vụ cũ, kiểm tra trước khi thay thế. Sau khi workflow thành công và DNS/chứng chỉ sẵn sàng, truy cập **https://sportvid.beartalk.site** rồi nhập `STUDIO_ADMIN_PASSWORD`.

Nếu chỉ có OAuth Wrangler cũ thiếu quyền zone/route, cần đăng nhập lại hoặc tạo token Cloudflare có các quyền cần thiết. Không thể xác nhận tên miền đã hoạt động chỉ bằng một lần build hoặc dry-run.

## 4. Lưu video vào Drive cá nhân

Có thể test ngay mà chưa kết nối Drive: chọn **Chỉ bản tải về** hoặc **Drive nếu đã kết nối + bản tải về**. Kết quả MP4, ảnh bìa, caption, ghi công nằm trong GitHub Artifact, giữ **3 ngày**. Studio cho xem và tải MP4 trực tiếp từ Artifact qua API đã đăng nhập; trình duyệt không nhận token GitHub.

Để lưu lâu dài vào My Drive:

1. Bật Google Drive API cho Google Cloud project của bạn, tạo OAuth client và cấp quyền bằng tài khoản Drive của bạn. Lấy refresh token bằng luồng OAuth có offline access.
2. Ưu tiên scope `drive.file` và một folder đầu ra do ứng dụng tạo hoặc được người dùng chọn/cấp quyền cho ứng dụng. Chỉ có folder ID không đủ để mở rộng scope của token. Không dùng scope toàn bộ Drive nếu không cần.
3. Đặt Client ID, Client Secret và Refresh Token vào ba Secrets đã liệt kê; đặt `DRIVE_FOLDER_ID` vào Variables. OAuth consent ở chế độ Testing có thể làm refresh token hết hạn sau 7 ngày khi dùng scope Drive; thiết lập phát hành/phạm vi người dùng phù hợp cho tác vụ chạy dài hạn.
4. Tạo thử một video và kiểm tra folder Drive. Sau khi thành công, đặt `DRIVE_UPLOAD_ENABLED=true`, chạy lại Deploy Studio để cập nhật trạng thái kết nối.

Không dùng service account để sở hữu file trên My Drive cá nhân: service account không có quota lưu trữ riêng. Dùng OAuth của người dùng hoặc Shared Drive Workspace đúng quyền.

Chế độ `Bắt buộc lưu Google Drive` báo lỗi nếu thiếu kết nối hoặc upload thất bại; bản Artifact vẫn được giữ nếu MP4 đã tạo thành công. Chế độ tự động bỏ qua upload nếu chưa có đủ cấu hình. Lỗi upload một phần không xóa file đã upload hay bản tải về.

## 5. Chạy trên máy để xem trước

```powershell
npm ci
npm run web:build
npm run web:dev
```

Mở **http://127.0.0.1:4173**. Dev server chỉ lắng nghe loopback và tạo phiên xem trên máy bằng cookie HttpOnly; không đưa khóa vào JavaScript. Khi chưa có kết nối GitHub phía server, các nút ghi dữ liệu/tạo video bị vô hiệu hóa; vẫn có thể xem bố cục, chỉnh bản nháp và xuất lộ trình JSON. Đây không phải xác nhận đã triển khai cloud.

Để thử API Worker bằng Wrangler, tạo `.dev.vars` từ `.dev.vars.example` và điền giá trị trên máy. Không commit tệp đó. Không chia sẻ preview server chứa token trên mạng nội bộ.

## 6. Kiểm chứng và giới hạn

`npm test` chạy kiểm tra pipeline video cùng đăng nhập, cookie, hết hạn phiên, chặn nguồn lạ, kiểm tra input, xung đột lưu và proxy Artifact không chuyển tiếp Authorization sang host tải tạm. `npm run web:build` tạo `dist/client` và `dist/server/index.js`; `wrangler deploy --dry-run` xác nhận gói Worker.

- Giao diện chưa tự đăng Facebook. Bạn xem lại, tải MP4/caption rồi đăng Reels.
- Lịch GitHub có thể trễ hoặc bị bỏ qua khi tải cao; nút tạo thủ công vẫn dùng được.
- Giọng Edge là tích hợp cộng đồng, có thể gặp hạn mức; có cache và thử lại. Azure là API chính thức tùy chọn.
- Giới hạn đăng nhập bằng bộ đếm trong isolate là lớp hạn chế cơ bản, không phải bộ đếm toàn cầu. Có thể thêm Cloudflare WAF/Access nếu cần bảo vệ bổ sung.
- Các kiểm thử dùng API GitHub giả lập không thay thế một lần dispatch/upload thật sau khi cấp đủ quyền.

Nguồn: [GitHub workflow dispatch](https://docs.github.com/en/rest/actions/workflows), [GitHub Variables](https://docs.github.com/en/rest/actions/variables), [Cloudflare Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google Drive quota](https://developers.google.com/workspace/drive/api/guides/handle-errors).
