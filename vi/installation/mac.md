---
lang: vi
layout: installation
meta_title: Làm sao để cài đặt Ghost lên server của bạn - Tài liệu về Ghost
meta_description: Tất cả mọi thứ bạn cần làm để sử dụng nền tảng blog Ghost trên môi trường thử nghiệm hoặc thực tế.
heading: Cài đặt Ghost &amp; Cùng bắt đầu
subheading: Những bước cơ bản để cài đặt blog mới của bạn lần đầu tiên.
permalink: /vi/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Cài đặt trên Mac <a id="install-mac"></a>

<p class="note"><strong>Lưu ý</strong> Ghost yêu cầu Node.js <strong>0.10.x</strong> (phiên bản ổn định mới nhất). Chúng tôi khuyến khích sử dụng Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Để cài đặt Node.js và Ghost trên máy tính Mac của bạn, bạn cần mở cửa sổ Terminal. Bạn có thể mở spotlight và gõ "Terminal" để thực hiện điều này.

### Cài đặt Node

*   Trên trang [http://nodejs.org](http://nodejs.org) nhấp install, một tập tin '.pkg' sẽ được tải về.
*   Nhấp vào phần download để mở bộ cài đặt, bộ cài đặt sẽ cài cả node và npm.
*   Nhấp theo lựa chọn trên bộ cài đặt, cuối cùng nhập vào mật khẩu của bạn và nhấp 'install software'.
*   Sau khi quá trình cài đặt hoàn tất, mở cửa sổ Terminal và gõ `echo $PATH` để kiểm tra giá trị '/usr/local/bin/' có tồn tại trong đường dẫn của bạn không.

<p class="note"><strong>Lưu ý</strong> Nếu đường dẫn '/usr/local/bin' không xuất hiện trong $PATH, xem qua <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">hướng dẫn xử lý sự cố</a> để tìm cách thêm nó vào</p>.

Nếu bạn không hiểu được phần hướng dẫn bạn có thể xem [hướng dẫn từng bước cài đặt](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Cài đặt Node trên Mac").

### Cài đặt và chạy Ghost

*   Vào trang [http://ghost.org](http://ghost.org), và nhấp vào nút màu xanh dương 'Download Ghost Source Code'.
*   Trên trang tải về, nhấp nút 'Download Ghost' để tải về tập tin zip phiên bản mới nhất.
*   Nhấp vào mũi tên cạnh tập tin vừa tải về rồi chọn 'Show in Finder'.
*   Trong finder, nhấp đôi vào tập tin zip được vừa được tải về để giải nén nó.
*   Tiếp theo, kéo và thả thư mục 'ghost-#.#.#' vào thanh tab của cửa sổ Terminal để tạo cửa tab mới ở đường dẫn đúng.
*   Trong tab terminal mới gõ `npm install --production` <span class="note">với hai dấu gạch ngang</span>.
*   Sau khi npm kết thúc quá trình cài đặt, gõ `npm start` để chạy Ghost ở chế độ phát triển.
*   Trên trình duyệt, truy cập vào <code class="path">127.0.0.1:2368</code> để thấy được blog Ghost vừa mới cài đặt của bạn.
*   Thay đổi địa chỉ đến <code class="path">127.0.0.1:2368/ghost</code> tạo tài khoản quản trị mới để đăng nhập vào phần quản trị của Ghost.
*   Xem qua phần [tài liệu sử dụng](/usage) để xem hướng dẫn những bước tiếp theo.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

