---
lang: vi
layout: installation
meta_title: Làm sao để cài đặt Ghost lên server của bạn - Tài liệu về Ghost
meta_description: Tất cả mọi thứ bạn cần làm để sử dụng nền tảng blog Ghost trên môi trường thử nghiệm hoặc thực tế.
heading: Cài đặt Ghost &amp; Cùng bắt đầu
subheading: Những bước cơ bản để cài đặt blog mới của bạn lần đầu tiên.
chapter: installation
next_section: mac
---

## Tổng quan <a id="overview"></a>

<p class="note"><strong>Lưu ý</strong> Ghost yêu cầu Node.js <strong>0.10.x</strong> (phiên bản ổn định mới nhất). Chúng tôi khuyến khích sử dụng Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Tài liệu về Ghost đang được xây dựng nên sẽ được cập nhật và cải tiến thường xuyên. Nếu bạn có vướng mắt hay bất cứ đề nghị cải tiến nào, hãy báo cho chúng tôi biết.

Ghost được xây dựng trên [Node.js](http://nodejs.org), và yêu cầu phiên bản `0.10.*` (phiên bản ổn định mới nhất).

Chạy Ghost trên máy tính của bạn không có gì khó khăn nhưng bạn cần phải cài đặt Node.js trước.

### Node.js là gì?

[Node.js](http://nodejs.org) là một nền tảng hiện đại dùng để xây dựng những ứng dụng web với tốc độ nhanh, có khả năng mở rộng và hiệu quả.
    Hơn 20 năm qua, web phát triển từ một tập hợp những trang tĩnh trở thành một nền tảng hỗ trợ những ứng dụng web phức tạp như Gmail hay Facebook.
    JavaScript là một ngôn ngữ lập trình được sử dụng trong quá trình này.

[Node.js](http://nodejs.org) cung cấp cho chúng ta khả năng viết JavaScript trên phía server. Trước đây JavaScript chỉ tồn tại trên trình duyệt, và một ngôn ngữ lập trình thứ hai, như PHP, được sử dụng để lập trình phía server. Có một ứng dụng web chỉ sử dụng một ngôn ngữ lập trình là một lợi ích to lớn, và điều này cũng làm cho Node.js dễ dàng tiếp cận đối với những lập trình viên chỉ sử dụng ngôn ngữ lập trình phía client truyền thống.

Cách mà [Node.js](http://nodejs.org) làm điều này trở thành hiện thực là sử dụng JavaScript engine từ trình duyệt Chrome của Google và làm cho nó có thể cài đặt ở tất cả mọi nền tảng. Điều này có nghĩa là bạn có thể cài đặt Ghost trên máy tính và trải nghiệm nó một cách nhanh chóng và dễ dàng.
    Những phần sau sẽ hướng dẫn chi tíêt cách cài đặt Ghost trên [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/), [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) và [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) cũng như giúp bạn triển khai Ghost trên [server hay tài khoản hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Cùng bắt đầu

Nếu bạn không có hứng thú với hướng dẫn cài đặt Node.js và Ghost thủ công, những lập trình viên của dịch vụ [BitNami](http://bitnami.com/) đã tạo ra [bộ cài đặt Ghost](http://bitnami.com/stack/ghost) cho tất cả những nền tảng phổ biến.

Tôi muốn cài đặt Ghost trên:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Nếu bạn đã sẵn sàng sử dụng Ghost trên server hay tài khoản hosting của bạn, điều đó thật tuyệt! Tài liệu sau đây sẽ cung cấp cho bạn nhiều lựa chọn để triển khai Ghost, từ cài đặt thủ công đến bộ cài đặt nhanh.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Sử dụng Ghost ngay</a>
</div>

Hãy nhớ rằng Ghost là một ứng dụng mới và đội ngũ phát triển đang làm việc cật lực để cho ra đời nhiều tính năng nhanh nhất có thể. Nếu bạn muốn nâng cấp Ghost lên phiên bản mới nhất, hãy đọc [tài liệu nâng cấp](/installation/upgrading/).
    Nếu bạn gặp khó khăn, hãy đọc [hướng dẫn xử lý sự cố]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), nếu nó không có giúp bạn khắc phục được vướng mắc, vui lòng truy cập [diễn đàn Ghost](http://ghost.org/forum) nơi mà đội ngũ và cộng đồng Ghost sẵn lòng giúp đỡ bất cứ vấn đề nào của bạn.
