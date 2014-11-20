---
lang: ar
layout: usage
meta_title: How to Use Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: استخدام Ghost
subheading: إيجاد الطرق المناسبة وضبط الإعدادات المتوافقة معك
chapter: usage
section: settings
permalink: /ar/usage/settings/
prev_section: configuration
next_section: managing
---

##  إعدادات Ghost <a id="settings"></a>

اذهب لـ <code class="path">&lt;your URL&gt;/ghost/settings/</code>.

بعد الإنتهاء من التعديل على الإعدادات لابد من الضغط على ايقونة "Save" لكي يتم حفظ الإعدادات

وبالإمكان مشاهدة التغييرات التي قمت بحفظها من خلال زيارة رابط المدونة

### اعدادات المدونة (<code class="path">/general/</code>)

وهذه هي الإعدادات المتوفرة.

*	**Blog Title**: لتغيير عنوان مدونتك او اسم المدونة. والمرجع في الثيم هو `@blog.title`.
*	**Blog Description**: لتغيير وصف لمدونتك. والمرجع في الثيم هو `@blog.description`.
*	**Blog Logo**: رفع او تحميل لوقو للمدونة بإحدى الصيغ التالية '.png', '.jpg', '.gif'. والمرجع في الثيم هو `@blog.logo`.
*	**Blog Cover**: رفع صورة كخلفية للمدونة بإحدى الصيغ التالية '.png', '.jpg', '.gif'. والمرجع في الثيم هو `@blog.cover`.
*	**Email Address**: هذا هو البريد الإلكتروني للادمن وجميع التنبيهات ترسل إليه. لابد ان يكون البريد فعال.
*	**Posts per page**: وهذ الخيار لتحديد عدد المواضيع التي تظهر في الصفحة الواحدة. لابد ان يكون الإدخال عبارة عن رقم.
*	**Theme**: هنا ستجد عرض لكل الثيم الموجودة في مجلد <code class="path">content/themes</code>. اختيارك لواحدها منها سيتم تغيير شكل الثيم المستخدم.

### إعدادات المستخدم (<code class="path">/user/</code>)

وهذه الإعدادات للتحكم في بروفايل المستخدم او الكاتب.

*   **Your Name**: هنا اسمك اللذي سيظهر كمرجع لكاتب الموضوع عند نشره. والمرجع في الثيم هو (post) `author.name`.
*   **Cover Image**: صوره تظهر كخلفية في بروفايل الكاتب، بإحدى الصيغ التالية '.png', '.jpg', '.gif'. والمرجع في الثيم هو (post) `author.cover`.
*   **Display Picture**: وهنا يمكن وضع صورتك الشخصية كعرض بالمدونة، بإحدى الصيغ التالية '.png', '.jpg', '.gif'. والمرجع في الثيم هو (post) `author.image`.
*   **Email Address**: هنا بريدك الالكتروني المعروض بالمدونة وايضا تستلم التنبيهات عليه. والمرجع في الثيم هو (post) `author.email`.
*   **Location**: وهنا يجب ان يكون موقعك الحالي. والمرجع في الثيم هو (post) `author.location`.
*   **Website**: وهنا يكون موقعك الشخصي او رابط لإحدى حساباتك في مواقع التواصل الإلكتروني. والمرجع في الثيم هو (post) `author.website`.
*   **Bio**: وهنا نبذه عنك بحيث يكون عدد الاحرف لاتتعدى 200 حرف. والمرجع في الثيم هو (post) `author.bio`.

#### تغيير كلمة المرور

1.  Fill out the input boxes with the appropriate password (current / new password).
1.  قم بتعبئة الحقول بـ كلمة مرور مناسبة (current / new password).
2.  الآن انقر على **Change Password**.
<p class="note">
    <strong>تنبية:</strong> لحفظ تغيير كلمة المرور لابد ان تضغط على "Change Password", ايقونة "Save" لاتقوم بحفظ كلمة المرور الجديدة.
</p>

