---
lang: ar
layout: usage
meta_title: How to Use Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: استخدام Ghost
subheading: إيجاد الطرق المناسبة وضبط الإعدادات المتوافقة معك
chapter: usage
section: configuration
permalink: /ar/usage/configuration/
prev_section: usage
next_section: settings
---

## إعداد تكوين Ghost <a id="configuration"></a>

بعد قيامك بتشغيل Ghost للمرة الاولى، ستجد ملف اسمه `config.js` في المجلد الأساسي لـ Ghost، بجانب ملف `index.js`. هذا الملف يسمح لك بضبط تكوين البيئة التي تعمل عليها كا رابط الموقع، قاعدة البيانات واعدادات البريد الالكتروني.

اذا لم تقم بتشغيل Ghost للمره الاولى، فلن تجد هذا الملف. وبإمكانك انشاء الملف  من خلال نسخ ملف `config.example.js` وهو مايقوم به Ghost عن التشغيل.

لضبط اعدادات تكوين الروابط، والبريد الالكتروني و قاعدة البيانات، افتح ملف `config.js` وابداء بتغيير الاعدادات المناسبة لك. واذا لم تطلع على معلومات بيئة التطوير يمكنك الاطلاع على [documentation](#environments).

## خيارات اعداد ملف التكوين

لـ Ghost عدة خيارات في اعداد ملف التكوين واللذي يمكنك من اضافة تعديلات على طريقة عمل Ghost

### البريد الإلكتروني

من الممكن ان يكون الاكثر اهمية هو ضبط ملف تكوين البريد الالكتروني، واللذي يتيح لـ Ghost من اعادة ضبط كلمة المرور في حالة فقدانها. اطلع على الشرح من هنا [email documentation]({% if page.lang %}/{{ page.lang }}{% endif %}/mail) للمزيد من المعلومات.

### قاعدة البيانات

بشكل اساسي Ghost يستخدم قاعدة بيانات SQLite، والتي الاتحتاج لأي اعدادات من قبلك.

في حالة كنت ترغب بتغير نوعية قاعدة البيانات مثل MySQL، بإمكانك التعديل على ملف التكوين حيث يوجد اعدادات قاعدة البيانات. لابد من إنشاء قاعدة بيانات و اسم مستخدم اولاً، ومن ثم يمكنك تعديل تكوين sqlite3 الى شئ مشابهة للتالي:

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

ويمكن ايضاً التعديل على عدد مرات الاتصال بقاعدة البيانات - `pool`.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### السيرفر

سيرفر الاستضافة و المنفذ - port - هو عنوان الاي بي ورقم المنفذ اللذي يستمع له Ghost عند الطلب.

من الممكن ايضا التعديل على ملف التكوين لكي يستمع Ghost على unix socket وذلك من خلال:

```
server: {
    socket: 'path/to/socket.sock'
}
```

### التحديث

منذ الاصدار الرابع لـ Ghost تم تقديم خدمة التحديث الأوتوماتيكي لكي تستطيع معرفة متى ماتم اصدار تحديث جديد! Ghost يقوم بجمع بيانات مجهولة الهوية من خلال طلبات التحقق من التحديث. للاطلاع على معلومات اكثر، اطلع على ملف [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js).

من الممكن تعطيل خاصية التحديث الاوتوماتيكي وجمع البيانات مجهولة الهوية من التعديل علي الخيار التالي:

`updateCheck: false`

الرجاء الاشتراك بالقائمة البريدية للـ Ghost لكي تكون على علم في حالة صدور تحديث جديد. [Ghost blog](http://blog.ghost.org)

### حفظ الملفات

بعض المنصات مثل Heroku لا يوجد لديها نظام حفظ الملفات الثابتة. ونتيجة لذلك، اي صور يتم تحميلها من الممكن فقدها
ومن الممكن تعطيل ميزات تخزين الملفات في Ghost من:

`fileStorage: false`

عندما يتم تعطيل تخزين الملفات، أدوات تحميل الصور في Ghost تطلب منك إدخال رابط الصور، و يمنعك من تحميل الملفات مباشرة.


## About Environments <a id="environments"></a>

Node.js, and therefore Ghost, has the concept of environments built in. Environments allow you to create different configurations for different modes in which you might want to run Ghost. By default Ghost has two built-in modes: **development** and **production**.

There are a few, very subtle differences between the two modes or environments. Essentially **development** is geared towards developing and particularly debugging Ghost. Meanwhile "production" is intended to be used when you're running Ghost publicly. The differences include things like what logging & error messaging is output, and also how much static assets are concatenated and minified. In **production**, you'll get just one JavaScript file containing all the code for the admin, in **development** you'll get several.

As Ghost progresses, these differences will grow and become more apparent, and therefore it will become more and more important that any public blog runs in the **production** environment. This perhaps begs the question, why **development** mode by default, if most people are going to want to run it in **production** mode? Ghost has **development** as the default because this is the environment that is best for debugging problems, which you're most likely to need when getting set up for the first time.

##  Using Environments <a id="using-env"></a>

In order to set Ghost to run under a different environment, you need to use an environment variable. For example if you normally start Ghost with `node index.js` you would use:

`NODE_ENV=production node index.js`

Or if you normally use forever:

`NODE_ENV=production forever start index.js`

Or if you're used to using `npm start` you could use the slightly easier to remember:

`npm start --production`

### Why use `npm install --production`?

We have been asked a few times why, if Ghost starts in development mode by default, does the installation documentation say to run `npm install --production`? This is a good question! If you don't include `--production` when installing Ghost, nothing bad will happen, but it will install a tonne of extra packages which are only useful for people who want to develop Ghost core itself. This also requires that you have one particular package, `grunt-cli` installed globally, which has to be done with `npm install -g grunt-cli`, it's an extra step and it's not needed if you just want to run Ghost as a blog.

