---
lang: vi
layout: installation
meta_title: Làm sao để cài đặt Ghost lên server của bạn - Tài liệu về Ghost
meta_description: Tất cả mọi thứ bạn cần làm để sử dụng nền tảng blog Ghost trên môi trường thử nghiệm hoặc thực tế.
heading: Cài đặt Ghost &amp; Cùng bắt đầu
subheading: Những bước cơ bản để cài đặt blog mới của bạn lần đầu tiên.
permalink: /vi/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Cài đặt trên Windows <a id="install-windows"></a>

<p class="note"><strong>Lưu ý</strong> Ghost yêu cầu Node.js <strong>0.10.x</strong> (phiên bản ổn định mới nhất). Chúng tôi khuyến khích sử dụng Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Cài đặt Node

*   Trên trang [http://nodejs.org](http://nodejs.org) nhấp install, một tập tin '.msi' sẽ được tải về.
*   Nhấp vào phần download để mở bộ cài đặt, bộ cài đặt sẽ cài cả node và npm.
*   Nhấp theo lựa chọn trên bộ cài đặt đến khi cửa sổ thông báo Node.js đã được cài đặt.

Nếu bạn không hiểu được phần hướng dẫn bạn có thể xem [hướng dẫn từng bước cài đặt](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Cài đặt Node trên Windows").

### Tải về và giải nén Ghost

*   Vào trang [http://ghost.org](http://ghost.org), và nhấp vào nút màu xanh dương 'Download Ghost Source Code'.
*   Trên trang tải về, nhấp nút 'Download Ghost' để tải về tập tin zip phiên bản mới nhất.
*   Nhấp vào mũi tên cạnh tập tin vừa tải về rồi chọn 'Show in Folder'.
*   Sau khi thư mục được mở, nhấp phải vào tập tin zip được tải về và chọn 'Extract all'.

Nếu bạn không hiểu được phần hướng dẫn bạn có thể xem [hướng dẫn từng bước cài đặt](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Cài đặt Ghost trên Windows - Phần 1").

### Cài đặt và chạy Ghost

*   Trên start menu của bạn, tìm 'Node.js' sau đó chọn 'Node.js Command Prompt'.
*   Trên cửa sổ dòng lệnh của Node, bạn cần thay đổi đường dẫn đến thư mục vừa giải nén Ghost. Gõ: `cd Downloads/ghost-#.#.#` (thay thế dấu thăng với phiên bản Ghost bạn vừa tải về).
*   Sau đó trong cửa sổ dòng lệnh, gõ `npm install --production` <span class="note">với hai dấu gạch ngang</span>.
*   Sau khi npm kết thúc quá trình cài đặt, gõ `npm start` để chạy Ghost ở chế độ phát triển.
*   Trên trình duyệt, truy cập vào <code class="path">127.0.0.1:2368</code> để thấy được blog Ghost vừa mới cài đặt của bạn.
*   Thay đổi địa chỉ đến <code class="path">127.0.0.1:2368/ghost</code> tạo tài khoản quản trị mới để đăng nhập vào phần quản trị của Ghost.
*   Xem qua phần [tài liệu sử dụng](/usage) để xem hướng dẫn những bước tiếp theo.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Cài đặt Ghost trên Windows - Phần 2")

