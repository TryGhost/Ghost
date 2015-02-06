---
lang: vi
layout: installation
meta_title: Làm sao để cài đặt Ghost lên server của bạn - Tài liệu về Ghost
meta_description: Tất cả mọi thứ bạn cần làm để sử dụng nền tảng blog Ghost trên môi trường thử nghiệm hoặc thực tế.
heading: Cài đặt Ghost &amp; Cùng bắt đầu
subheading: Những bước cơ bản để cài đặt blog mới của bạn lần đầu tiên.
permalink: /vi/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Cài đặt trên Linux <a id="install-linux"></a>

<p class="note"><strong>Lưu ý</strong> Ghost yêu cầu Node.js <strong>0.10.x</strong> (phiên bản ổn định mới nhất). Chúng tôi khuyến khích sử dụng Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Cài đặt Node

*   Bạn có thể tải về tập tin `.tar.gz` từ [http://nodejs.org](http://nodejs.org), hoặc bạn có thể xem qua hướng dẫn [cài đặt với trình quản lý gói](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Kiểm tra lại một lần nữa Node và npm đã được cài đặt chưa bằng cách gõ lệnh `node -v` và `npm -v` trên cửa sổ dòng lệnh.

### Cài đặt và chạy Ghost


**Nếu bạn sử dụng Linux trên nền tảng desktop có thể làm theo những bước sau:**

*   Vào trang [http://ghost.org](http://ghost.org), và nhấp vào nút màu xanh dương 'Download Ghost Source Code'.
*   Trên trang tải về, nhấp nút 'Download Ghost' để tải về tập tin zip phiên bản mới nhất và giải nén tập tin đến đường dẫn bạn chạy Ghost.


** Nếu bạn sử dụng Linux như một hệ điều hành phụ hoặc bạn kết nối thông qua giao thức SSH và chỉ có thể sử dụng dòng lệnh:**

*   Sử dụng lệnh sau để tải Ghost phiên bản mới nhất:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Giải nén tập tin trên với lệnh sau:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Sau khi bạn giải nén Ghost mở cửa sổ dòng lệnh và làm những bước tiếp theo:**

*   Thay đổi đường dẫn hiện tại đến thư mục mà bạn vừa giâi nén Ghost với lệnh sau:

    ```
    $ cd /path/to/ghost
    ```

*   Để cài đặt Ghost gõ:

    ```
    npm install --production
    ```
    <span class="note">với hai dấu gạch ngang</span>

*   Sau khi npm kết thúc quá trình cài đặt, gõ lệnh sau để chạy Ghost ở chế độ phát triển:

    ```
    $ npm start
    ```

*   Ghost sẽ chạy ở địa chỉ **127.0.0.1:2368**<br />
    <span class="note">Bạn có thể thay đổi địa chỉ IP và cổng trong tập tin **config.js**</span>

*   Trên trình duyệt, truy cập vào [http://127.0.0.1:2368](http://127.0.0.1:2368) để thấy được blog Ghost vừa mới cài đặt của bạn.
*   Thay đổi địa chỉ đến [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) tạo tài khoản quản trị mới để đăng nhập vào phần quản trị của Ghost.
