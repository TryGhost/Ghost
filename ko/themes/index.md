---
layout: themes
meta_title: Ghost 테마 제작 방법 - Ghost 가이드
meta_description: Ghost에서 사용되는 테마를 제작하는 방법에 대해 설명합니다.
heading: Ghost 테마 제작 방법
subheading: 여러분의 Ghost 테마를 만들어 보세요.
chapter: themes
---

{% raw %}

## 테마 바꾸기 <a id="switching-theme"></a>

Ghost 테마는 <code class="path">content/themes/</code>에 있습니다.

디폴트 테마인 Casper 대신 다른 테마를 사용하고 싶다면 [marketplace gallery](http://marketplace.ghost.org/)에서 커스텀 테마를 확인하기 바랍니다. 선택한 테마 패키지를 다운로드한 다음, Casper와 나란히 있도록 <code class="path">content/themes</code>에 압축을 해제합니다.

자신의 테마를 만들고 싶다면 casper 디렉터리를 복사한 다음 이름을 바꾼 다음, 원하는 대로 보이고 동작하도록 템플릿을 편집합니다.

새로 추가한 테마로 변경하려면:

1. Ghost를 재시작합니다. Ghost는 <code class="path">content/themes</code>에 새로운 폴더가 추가되었는지 알지 못하기 때문에 재시작이 필요합니다.
2. Ghost 관리 페이지로 로그인해 <code class="path">/ghost/settings/general/</code>로 이동합니다.
3. 'Theme' 옵션 드랍다운에서 테마를 선택합니다.
4. 'Save'를 클릭합니다.
5. 블로그 시작 페이지를 방문해 새로운 테마를 감상합니다.

<p class="note">**노트:** 저희 Ghost 호스팅 서비스를 이용하시고 계시다면, 여러분은 위 방법이 아니라 <a href="https://ghost.org/blogs/">블로그 관리 화면</a>에 접속하신 후 블로그 이름 옆에 위치한 "편집" 버튼을 눌러 테마를 변경하셔야 합니다.</p>

##  핸들바가 뭔가요? <a id="what-is-handlebars"></a>

[핸들바(Handlebars)](http://handlebarsjs.com/)는 Ghost가 사용하는 템플릿 언어입니다.

> 핸들바를 이용하면 힘들이지 않고 효과적으로 시맨틱 템플릿을 만들 수 있습니다.

자신의 테마를 직접 작성하고 싶다면, 먼저 핸들바 문법에 익숙해져야 할 것입니다. [핸들바 문서](http://handlebarsjs.com/expressions.html)나, [트리하우스 튜토리얼](http://blog.teamtreehouse.com/getting-started-with-handlebars-js)을 읽어보기 바랍니다. - 설치 및 사용법에 대한 처음 섹션은 우리가 이미 설명한 내용이므로 넘어가도 되고, ‘Basic Expressions’부터 시작하면 좋습니다..

## Ghost 테마에 대해 <a id="about"></a>

Ghost 테마는 쉽게 만들고 유지할 수 있도록 고안되었습니다. Ghost 테마에서는 템플릿(HTML)과 비즈니스 로직(JavaScritp)이 완전히 분리되는 것이 좋습니다. Handlebars는 로직이 (거의) 없고 템플릿과 로직의 분리를 강제하며, 내용을 표시하는 비즈니스 로직이 분리되어 독립적으로 존재하도록 하는 메커니즘을 제공합니다. 따라서 템플릿을 만들 때 디자이너와 개발자가 협업하기 쉬워집니다.

핸들바 템플릿은 계층적이며(다른 템플릿을 확장하는 템플릿 가능) 부분 템플릿도 지원합니다. Ghost는 이런 기능을 활용해 코드 중복을 최소화하고 각 템플릿이 하나의 작업에 집중하도록 합니다. 구조가 잘 정의된 테마는 유지보수가 쉽고 컴포넌트가 분리되어있어 다른 테마에서 재사용하기 쉽습니다.

테마 만드는 이런 방법이 마음에 들기를 바랍니다.

## Ghost 테마의 파일 구조 <a id="file-structure"></a>

권장 파일 구조:

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [required]
└── post.hbs [required]
└── package.json [will be required from 0.6]
```


당분간은 default.hbs나 다른 폴더가 없어도 됩니다. <code class="path">index.hbs</code>와 <code class="path">post.hbs</code>는 필요합니다. 이 두 템플릿이 없으면 Ghost는 동작하지 않을 것입니다. <code class="path">partials</code>는 특별한 디렉터리입니다. 이 디렉터리에는 블로그 전반에 걸쳐 하용하고 싶은 템플릿 부분이 포함됩니다. 예를 들어 <code class="path">list-post.hbs</code>는 목록에서 게시글 하나를 출력하는 템플릿을 포함할 수 있으며, 이는 나중에 아카이브나 태그 페이지에 사용될 수 있습니다. <code class="path">partials</code>는 또한 페이징 처리와 같이 특정 헬퍼가 사용하는 내장 템플릿을 오버라이드하는 템플릿을 저장하는 위치기도 합니다. <code class="path">partials</code> 안에 <code class="path">pagination.hbs</code>를 포함시키면 페이징 처리를 위한 자신의 HTML을 지정할 수 있습니다.

### default.hbs <a id="default-layout"></a>

가장 기본이 되는 템플릿입니다. `<html>`과 `<head>`, `<body>` 태그와 `{{ghost_head}}`, `{{ghost_foot}}` 헬터, 블로그 머리글(header)과 바닥글(footer)을 만드는 HTML 등 모든 페이지에 나타나는 HTML의 가장 지루한 부분을 담고 있습니다.

디폴트 템플릿은 템플릿의 내용이 들어갈 위치를 표시하기 위해 Handlebar 표현식 `{{{body}}}`를 사용합니다.

페이지 템플릿 첫 행에는 디폴트 템플릿을 확장하다는 것을 지정하기 위해 `{{!< default}}`이 있고, 그 내용은 default.hbs에 `{{{body}}}`가 정의된 곳에 들어가게 됩니다.

### index.hbs

홈페이지를 위한 템플릿으로 <code class="path">default.hbs</code>를 확장합니다. 홈페이지에는 표시해야 할 목록이 전달되며, <code class="path">index.hbs</code>에서 목록을 어떻게 표시할지 정의합니다.

Casper(현재의 디폴트 테마)에서는 블로그 로고, 제목, 설명을 표시하기 위해 `@blog` 전역 설정을 사용하는 헤더가 있습니다. 그 뒤에 최근 글 목록을 표시하기 위해 `{{#foreach}}` 헬퍼가 나옵니다.

### post.hbs

글 하나를 위한 템플릿으로 <code class="path">default.hbs</code>를 확장합니다.

Casper(현재의 디폴트 테마)에서는 자신의 헬퍼를 가지고 있으며 `@blog` 전역 설정 또한 사용하고 있으며 글의 상세 내용을 표시하기 위해 `{{#post}}` 데이터 접근자도 사용하고 있습니다.

### page.hbs

You can optionally provide a page template for static pages. If your theme doesn't have a <code class="path">page.hbs</code> template, Ghost will use the standard <code class="path">post.hbs</code> template for pages.

Pages have exactly the same data available as a post, they simply don't appear in the list of posts.

If you want to have a custom template for a specific page you can do so by creating a template with the name <code class="path">page-{{slug}}.hbs</code>. For example if you have a page called 'About' that lives at <code class="path">/about/</code> then you can add a template called <code class="path">page-about.hbs</code> and this template will be used to render only the about page.

### tag.hbs

You can optionally provide a tag template for the tag listing pages. If your theme doesn't have a <code class="path">tag.hbs</code> template, Ghost will use the standard <code class="path">index.hbs</code> template for tag pages.

Tag pages have access to both a tag object, a list of posts and pagination properties.

### error.hbs

You can optionally provide an error template for any 404 or 500 errors. If your theme doesn't provide an <code class="path">error.hbs</code> Ghost will use its default.

To see how to access the data about an error, take a look at Ghost's default error template which is located in <code class="path">/core/server/views/user-error.hbs</code>

### package.json

Package.json is a format borrowed from [npm](https://www.npmjs.org/doc/json.html). Ghost currently looks for a `name` and `version` field.
We highly recommend adding an `author` and `description` field. The fields that Ghost requires will change as Ghost evolves, but for now the following is enough to make Ghost happy:

```
{
  "name": "mytheme",
  "version": "0.1.0"
}
```

### 포스트 스타일링과 미리보기

Ghost 테마를 만들 때 메인 스타일링과 글 스타일링간의 충돌을 방지하기 위해 클래스와 (특히) 아이디 범위에 신경쓰기 바랍니다. 헤딩에 대한 ID는 자동 생성되므로 글 안에서 사용될 아이디와 클래스를 알 방법은 없습니다. 따라서 페이지의 특정 부분에 대해 항상 범위를 지정하는 것이 최선입니다. 예를 들어, #my-id는 예상치 못한 것과 대응될 수 있지만 #themename-my-id는 좀더 안전할 것입니다.

Ghost는 에디터의 분리된 창에 작성중인 글의 실질적인 미리보기를 제공하려 하고 있지만, 이를 위해서는 글에 대한 테마의 커스텀 스타일링을 로드해야 합니다. 이 기능은 아직 구현되지 않았지만, 글 스타일을 테마의 다른 스타일(style.css)과는 별도의 파일(post.css)에 보관하기 바랍니다. 그래야 나중에 이 기능을 재빨리 적용할 수 있습니다.

## 자신의 테마 만들기 <a id="create-your-own"></a>

자신의 Ghost 테마를 만들 때는 Casper를 복사하거나 <code class="path">content/themes</code> 디렉터리에 자신의 테마 이름으로 새 폴더, 예를 들어 my-theme(폴더 이름은 소문자와 숫자, 하이픈만 가능)를 추가하면 됩니다. 그 다음 테마 폴더에 두 개의 빈 파일 index.hbs와 post.hbs를 추가하면 됩니다. 이렇게 하면 아무 것도 표시되지 않겠지만 실제로 유효한 테마가 됩니다.

### 글 목록

<code class="path">index.hbs</code>는 `posts`라 불리는 객체를 전달 받는데, 다음과 같은 식으로 foreach 헬퍼를 사용해 각각의 글을 표시할 수 있습니다.

```
{{#foreach posts}}
// here we are in the context of a single post
// whatever you put here gets run for each post in posts
{{/foreach}}
```

좀더 자세한 사항은 [`{{#foreach}}`](#foreach-helper) 헬퍼 섹션을 참조하기 바랍니다.

#### 페이지 처리

[`{{pagination}}`](#pagination-helper) 헬퍼 섹션을 참조하기 바랍니다.

### 개별 글 출력하기

`foreach`로 글 목록에 대한 루프를 돌 때나 또는 <code class="path">post.hbs</code> 안에 있을 때나, 글 하나에 대한 컨텍스트 안에서는 글에 대한 다음 속성에 접근할 수 있습니다.

현재는 그 속성이 다음과 같습니다.

*   id – **글 아이디**
*   title – **글 제목**
*   url – **글에 대한 상대 URL**
*   content – **글에 대한 HTML**
*   published_at – **글 공개 날짜**
*   author – **글 작성자에 대한 상세 사항** (상세 내용은 아래 참조)

각 속성은 `{{title}}`과 같은 표준 핸들바 표현식으로 출력할 수 있습니다.

<div class="note">
  <p>
    <strong>노트:</strong> <ul>
      <li>
         content 속성은 HTML 출력을 안전하고 올바르게 출력하도록 보장하는 <code>{{content}}</code> 헬퍼로 덮어쓸 수 있습니다. 상세한 내용은 <a href="#content-helper"><code>{{content}}</code> helper</a> 섹션을 참고하기 바랍니다.
      </li>
      <li>
        the url property provided by the <code>{{url}}</code> helper. See the section on the <a href="#url-helper"><code>{{url}}</code> helper</a> for more info.
        url 속성은 <code>{{url}}</code> 헬퍼가 제공합니다. 자세한 내용은 <a href="#url-helper"><code>{{url}}</code> helper</a> 섹션을 참고하기 바랍니다.
      </li>
    </ul>
  </p>
</div>

#### 작성자 정보

하나의 글에서 다음과 같은 작성자 정보를 사용할 수 있습니다.

*   `{{author.name}}` – 작성자 이름
*   `{{author.email}}` – 작성자 이메일 주소
*   `{{author.bio}}` – 작성자 약력
*   `{{author.website}}` – 작성자 웹사이트
*   `{{author.image}}` – 작성자 프로파일 이미지
*   `{{author.cover}}` – 작성자 커버 이미지

그냥 `{{author}}`를 사용해 작성자 이름만 표시할 수도 있습니다.

다음과 같이 블록 표현식을 사용할 수도 있습니다.

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### 태그

하나의 글에서 다음과 같은 태그 정보를 사용할 수 있습니다.

*   `{{tag.name}}` – 태그 이름

`{{tags}}`를 사용해 쉼표로 분리된 태그 목록을 표시하거나, `{{tags separator=""}}`를 사용해 태그 사이 구분자를 지정할 수도 있습니다.

다음과 같이 블록 표현식을 사용할 수도 있습니다.

```
<ul>
    {{#foreach tags}}
        <li>{{name}}</li>
    {{/foreach}}
</ul>
```

### 전역 설정

Ghost 테마에서는 `@blog` 전역 데이터 접근자를 통해 전역 설정에 접근할 수 있습니다.

*   `{{@blog.url}}` – <code class="path">config.js</code>에 설정된 URL
*   `{{@blog.title}}` – 설정 페이지에서 지정한 블로그 제목
*   `{{@blog.description}}` – 설정 페이지에서 지정한 블로그 설명
*   `{{@blog.logo}}` – 설정 페이지에서 지정한 블로그 로고

## 내장 헬퍼 <a id="helpers"></a>

Ghost는 테마를 만들 때 도움을 주는 내장 헬퍼를 제공합니다. 헬퍼는 블록 헬퍼와 출력 헬퍼 두 종류로 분류됩니다.

**[블록 헬퍼](http://handlebarsjs.com/block_helpers.html)** 는 `{{#foreach}}{{/foreach}}`와 같이 시작 태그와 종료 태그가 있습니다. 태그 안에서는 맥락이 변하며 이런 헬퍼는 `@` 기호로 접근할 수 있는 부가적 속성을 제공하기도 합니다.

**출력 헬퍼**는 `{{content}}`와 같이 데이터를 출력할 때 사용하는 표현식과 닮았습니다. 데이터를 출력하기 전에 유용한 연산을 수행하며, 데이터 출력 양식을 선택할 수 있게 하기도 합니다. 일부 출력 헬퍼는 데이터 양식을 지정하기 위해 HTML과 함께 템플릿을 사용하기도 합니다. 출력 헬퍼는 또한 블록 헬퍼이기도 하며, 기능에 있어 변형을 제공하기도 합니다.

----

### <code>foreach</code> <a id="foreach-helper"></a>

*   헬퍼 타입: 블록
*   옵션: `columns` (number)

`{{#foreach}}`는 포스트 목록 처리를 위해 만들어진 특별한 루프 헬퍼입니다. 핸들바에서 각 헬퍼는 기본적으로 배열에 대해 `@index` 속성을 가지며 객체에 대해서는 `@key` 속성을 가지는데, 루프 안에서 사용될 수 있습니다.

`foreach`는 이를 확장해  배열과 객체 모두에 `@first`와 `@last`, `@even`, `@odd`, `@rowStart`, `@rowEnd` 속성을 추가합니다. 이를 이용해 포스트 목록과 다른 컨텐트에 대해 좀더 복잡한 레이아웃을 만들 수 있습니다. 예를 들어, 다음을 보기 바랍니다.

#### `@first` &amp; `@last`

다음 예제는 배열이나 객체(예: `posts`)를 확인하고 첫 요소인기 확인합니다.

```
{{#foreach posts}}
    {{#if @first}}
        <div>First post</div>
    {{/if}}
{{/foreach}}
```

여러 속성을 확인하기 위해 중첩 `if`를 사용할 수도 있습니다. 이 예제에서는 첫 포스트와 마지막 포스트를 다른 포스트와 구분해 표시하고 있습니다.

```
{{#foreach posts}}
    {{#if @first}}
    <div>First post</div>
    {{else}}
        {{#if @last}}
            <div>Last post</div>
        {{else}}
            <div>All other posts</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` &amp; `@odd`

다음 예에서는 짝수 또는 홀수 클래스를 추가해 컨텐트 색을 줄무늬로 표시할 수 있게 합니다.

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` &amp; `@rowEnd`

다음 예는 컬럼 인자를 넘겨 행의 첫 번째와 마지막 요소의 속성을 설정하는 방법을 보입니다. 이렇게 해서 컨텐트를 그리드 레이아웃으로 출력할 수 있습니다.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

----

### <code>has</code> <a id="has-helper"></a>

*   Helper type: block
*   Options: `tag` (comma separated list)

`{{has}}` intends to allow theme developers to ask questions about the current context and provide more flexibility for creating different post layouts in Ghost.

Currently, the `{{has}}` helper only allows you to determine whether a tag is present on a post:

```
{{#post}}
    {{#has tag="photo"}}
        ...do something if this post has a tag of photo...
    {{else}}
        ...do something if this posts doesn't have a tag of photo...
    {{/has}}
{{/post}}
```

You can also supply a comma-separated list of tags, which is the equivalent of an 'or' query, asking if a post has any one of the given tags:

```
{{#has tag="photo, video, audio"}}
    ...do something if this post has a tag of photo or video or audio...
{{else}}
    ...do something with other posts...
{{/has}}
```

If you're interested in negating the query, i.e. determining if a post does **not** have a particular tag, this is also possible.
Handlebars has a feature which is available with all block helpers that allows you to do the inverse of the helper by using `^` instead of `#` to start the helper:

```
{{^has tag="photo"}}
    ...do something if this post does **not** have a tag of photo...
{{else}}
    ...do something if this posts does have a tag of photo...
{{/has}}
```


----

### <code>content</code> <a id="content-helper"></a>

*   헬퍼 타입: 출력
*   옵션: `words` (number), `characters` (number) [디폴트는 모두 보이기]

`{{content}}`는 포스트 컨텐트를 출력하는 데 사용하는 아주 간단한 헬퍼입니다. 이 헬퍼는 HTML이 올바르게 출력되도록 합니다.

다음 옵션을 지정해 HTML 컨텐트를 얼마나 표시할 지 제한할 수 있습니다.

`{{content words="100"}}`은 태그가 올바르게 매칭되는 상태에서 HTML 내용을 100 단어만 출력하도록 합니다.

----

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   헬퍼 타입: 출력
*   옵션: `words` (number), `characters` (number) [디폴트는 50 단어]

`{{excerpt}}`는 컨텐트에서 HTML 태그를 제외하고 출력합니다. 포스트 내용을 발취하는데 유용하게 사용할 수 있습니다.

옵션을 설정해 출력되는 테스트 분량을 제한할 수 있습니다.

`{{excerpt characters="140"}}`는 140개의 문자만 출력할 것입니다.

----

### <code>tags</code> <a id="tags-helper"></a>

*   Helper type: output
*   Options: `separator` (string, default ", "), `suffix` (string), `prefix` (string)

`{{tags}}` is a formatting helper for outputting a linked list of tags for a particular post. It defaults to a comma-separated list:

```
// outputs something like 'my-tag, my-other-tag, more-tagging' where each tag is linked to its own tag page
{{tags}}
```

 but you can customise the separator between tags:

```
// outputs something like 'my-tag | my-other-tag | more tagging'
{{tags separator=" | "}}
```

as well as passing an optional prefix or suffix.

```
// outputs something like 'Tagged in: my-tag | my-other-tag | more tagging'
{{tags separator=" | " prefix="Tagged in:"}}
```

You can use HTML in the separator, prefix and suffix arguments:

```
// outputs something like 'my-tag • my-other-tag • more tagging'
{{tags separator=" &bullet; "}}
```

If you don't want your list of tags to be automatically linked to their tag pages, you can turn this off:

```
// outputs tags without an <a> wrapped around them
{{tags autolink="false"}}
```

----

### <code>date</code> <a id="date-helper"></a>

*   헬퍼 타입: 출력
*   옵션: `format` (날짜 형식. 디폴트는 “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}`는 다양한 형식으로 날짜를 출력할 수 있게 해주는 포매팅 헬퍼입니다. 날짜와 날짜 형식 문자열을 넘겨 원하는 형식으로 날짜를 출력할 수 있습니다.

```

// 'July 11, 2013' 형식으로 날짜 출력
{{date published_at format="MMMM DD, YYYY"}}
```

또는 날짜와 `timeago` 블래그를 남길 수도 있습니다.

```
// '5 mins ago' 형식으로 출력
{{date published_at timeago="true"}}
```
날짜 형식을 지정하지 않고 `{{date}}`를 호출하면 디폴트 형식인 "MMM Do, YYYY"가 사용됩니다.

포스트 컨텍스트에서 어떤 날짜를 표시할지 지정하지 않고 `{{date}}`를 호출하면 디폴트로 `published_at`이 사용됩니다.

포스트 컨텍스트 밖에서 표시할 날짜를 지정하지 않고 `{{date}}`를 호출하면 디폴트로 현재 날짜를 사용합니다.

`date` uses [moment.js](http://momentjs.com/) for formatting dates. See their [documentation](http://momentjs.com/docs/#/parsing/string-format/) for a full explanation of all the different format strings that can be used.
`date`는 날짜를 포매팅하는 데 [moment.js](http://momentjs.com/)를 사용합니다. 어떤 포맷 문자열이 사용될 수 있는지 자세한 설명을 보고 싶다면 [moment.js 문서](http://momentjs.com/docs/#/parsing/string-format/)를 참조하기 바랍니다.


----

### <code>encode</code> <a id="encode-helper"></a>

*   Helper type: output
*   Options: none

`{{encode}}` is a simple output helper which will encode a given string so that it can be used in a URL.

The most obvious example of where this is useful is shown in Casper's <code class="path">post.hbs</code>, for outputting a twitter share link:

```
<a class="icon-twitter" href="http://twitter.com/share?text={{encode title}}&url={{url absolute="true"}}"
    onclick="window.open(this.href, 'twitter-share', 'width=550,height=235');return false;">
    <span class="hidden">Twitter</span>
</a>
```

Without using the `{{encode}}` helper on the post's title, the spaces and other punctuation in the title would not be handled correctly.

----

### <code>url</code> <a id="url-helper"></a>

*   헬퍼 타입: 출력
*   옵션: `absolute`

`{{url}}`은 포스트 컨텍스트 안에서 포스트에 대한 상대 URL을 출력합니다. 포스트 컨텍스트 밖에서는 아무 것도 출력하지 않습니다.

`{{url absolute="true"}}`과 같이 `absolute` 옵션을 통해 절대 URL을 출력하도록 지정할 수 있습니다.

----

### <code>asset</code> <a id="asset-helper"></a>

* Helper type: output
* Options: none

The `{{asset}}` helper exists to take the pain out of asset management. Firstly, it ensures that the relative path to an asset is always correct, regardless of how Ghost is installed. So if Ghost is installed in a subdirectory, the paths to the files are still correct, without having to use absolute URLs.

Secondly, it allows assets to be cached. All assets are served with a `?v=#######` query string which currently changes when Ghost is restarted and ensures that assets can be cache busted when necessary.

Thirdly, it provides stability for theme developers so that as Ghost's asset handling and management evolves and matures, theme developers should not need to make further adjustments to their themes as long as they are using the asset helper.

Finally, it imposes a little bit of structure on themes by requiring an <code class="path">assets</code> folder, meaning that Ghost knows where the assets are, and theme installing, switching live reloading will be easier in future.

#### Usage

To use the `{{asset}}` helper to output the path for an asset, simply provide it with the path for the asset you want to load, relative to the <code class="path">assets</code> folder.

```
// will output something like: <link rel="stylesheet" type="text/css" href="/path/to/blog/assets/css/style.css?v=1234567" />
<link rel="stylesheet" type="text/css" href="{{asset "css/style.css"}}" />
```

```
// will output something like: <script type="text/javascript" src="/path/to/blog/assets/js/index.js?v=1234567"></script>
<script type="text/javascript" src="{{asset "js/index.js"}}"></script>
```

#### Favicons

Favicons are a slight exception to the rule on how to use the asset helper, because the browser always requests one regardless of whether it is defined in the theme, and Ghost aims to serve this request as fast as possible.

By default `{{asset "favicon.ico"}}` works exactly the same as the browser's default request, serving Ghost's default favicon from the shared folder.
This means it doesn't have to look up what theme the blog is using or where that theme lives before serving the request.

If you would like to use a custom favicon, you can do so by putting a <code class="path">favicon.ico</code> in your theme's <code class="path">assets</code> folder and using the asset helper with a leading slash:

`{{asset "/favicon.ico"}}`

This trailing slash tells Ghost not to serve the default favicon, but to serve it from the themes <code class="path">assets</code> folder.

----

###  <code>pagination</code> <a href="pagination-helper"></a>

*   헬퍼 타입: 출력, template-driven
*   옵션: 없음 (곧 지원 예정)

`{{pagination}}` is a template driven helper which outputs HTML for 'newer posts' and 'older posts' links if they are available and also says which page you are on.

You can override the HTML output by the pagination helper by placing a file called <code class="path">pagination.hbs</code> inside of <code class="path">content/themes/your-theme/partials</code>.

----

###  <code>log</code> <a href="log-helper"></a>
*   Helper type: output
*   Options: none

`{{log}}` is a helper which is part of Handlebars, but until Ghost 0.4.2 this hasn't done anything useful.

When running Ghost in development mode, you can now use the `{{log}}` helper to output debug messages to the server console. In particular you can get handlebars to output the details of objects or the current context

For example, to output  the full 'context' that handlebars currently has access to:

`{{log this}}`

Or to just log each post in the loop:

```
{{#foreach posts}}
   {{log post}}
{{/foreach}}
```

----





### <code>body_class</code> <a id="bodyclass-helper"></a>

*   헬퍼 타입: 출력
*   옵션: none

`{{body_class}}` – outputs classes intended for the `<body>` tag in <code class="path">default.hbs</code>, useful for targeting specific pages with styles.

----

### <code>post_class</code> <a id="postclass-helper"></a>

*   헬퍼 타입: 출력
*   옵션: none

`{{post_class}}` – outputs classes intended your post container, useful for targeting posts with styles.

----

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   헬퍼 타입: 출력
*   옵션: none

`{{ghost_head}}` – belongs just before the `</head>` tag in <code class="path">default.hbs</code>, used for outputting meta tags, scripts and styles. Will be hookable.

----

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   헬퍼 타입: 출력
*   옵션: none

`{{ghost_foot}}` – belongs just before the `</body>` tag in <code class="path">default.hbs</code>, used for outputting scripts. Outputs jquery by default. Will be hookable.

----

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   헬퍼 타입: 출력
*   옵션: none

`{{meta_title}}` – outputs the post title on posts, or otherwise the blog title. Used for outputting title tags in the `</head>` block. E.g. `<title>{{meta_title}}</title>`. Will be hookable.

----

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   헬퍼 타입: 출력
*   옵션: none

`{{meta_description}}` - outputs nothing (yet) on posts, outputs the blog description on all other pages. Used for outputing the description meta tag. E.g. `<meta name="description" content="{{meta_description}}" />`. Will be hookable.


## Troubleshooting Themes <a id="troubleshooting"></a>

#### 1. I see Error: Failed to lookup view "index" or "post"

Check that your theme folder contains a correctly named index.hbs and post.hbs as these are required

{% endraw %}
