---
lang: ko
layout: usage
meta_title: Ghost 사용 방법 - Ghost 가이드
meta_description: Ghost 사용 방법을 설명합니다. Ghost는 설치했는데, 어떻게 사용해야 할지 모르시겠나요? 여기를 참조해보세요.
heading: Ghost 사용 방법
subheading: Ghost를 자신에 맞게 설정하고 이용하는 방법에 대해 소개합니다.
chapter: usage
section: settings
permalink: /ko/usage/settings/
prev_section: configuration
next_section: managing
---

##  Ghost 일반 설정 <a id="settings"></a>

<code class="path">&lt;블로그 URL&gt;/ghost/settings/</code>으로 이동하세요.

설정을 변경하신 후 저장하시려면 "저장(Save)" 버튼을 **반드시** 누르셔야 합니다.

블로그 URL에 접속함으로써 변경 사항을 확인하실 수 있습니다.

### 블로그 설정 (<code class="path">/general/</code>)

아래는 블로그와 관련된 설정입니다.

*   **Blog Title**: 블로그 제목입니다. 테마에서 `@blog.title`로 접근할 수 있습니다.
*   **Blog Description**: 블로그에 대한 설명입니다. 테마에서 `@blog.description`로 접근할 수 있습니다.
*   **Blog Logo**: '.png', '.jpg', '.gif' 파일로 블로그 로고를 업로드할 수 있습니다. 테마에서 `@blog.logo`로 접근할 수 있습니다.
*   **Blog Cover**: '.png', '.jpg' or '.gif' 파일로 블로그 커버 사진을 업로드할 수 있습니다. 테마에서 `@blog.cover`로 접근할 수 있습니다.
*   **Email Address**: 블로그 관리와 관련된 알림이 보내지는 이메일 주소입니다. **반드시** 유효한 이메일 주소를 사용하셔야 합니다.
*   **Posts per page**: 한 페이지에 표시되는 글의 수입니다. 숫자를 입력하셔야 합니다.
*   **Theme**: <code class="path">content/themes</code> 디렉토리에 위치한 모든 테마를 표시합니다. 사용하고 싶으신 테마를 하나 선택하세요.

### 사용자 설정 (<code class="path">/user/</code>)

아래는 사용자 및 저자의 프로필과 관련된 설정입니다.

*   **Your Name**: 블로그의 글이 발행될 때 저자로 표시되는 이름입니다. 테마에서 (post) `author.name`로 접근할 수 있습니다.
*   **Cover Image**: '.png', '.jpg' or '.gif' 파일로 여러분의 커버 사진을 업로드할 수 있습니다. 테마에서 (post) `author.cover`로 접근할 수 있습니다.
*   **Display Picture**: '.png', '.jpg' or '.gif' 파일로 여러분의 프로필 사진을 업로드할 수 있습니다. 테마에서 (post) `author.image`로 접근할 수 있습니다.
*   **Email Address**: 사람들에게 공개되는 이메일 주소입니다. 테마에서 (post) `author.email`로 접근할 수 있습니다.
*   **Location**: 여러분이 살고 있는 곳을 입력하세요. 테마에서 (post) `author.location`로 접근할 수 있습니다.
*   **Website**: 개인 웹 사이트 URL 혹은 소셜 네트워크 URL을 입력하세요. 테마에서 (post) `author.website`로 접근할 수 있습니다.
*   **Bio**: 200자 내외의 자기 소개를 입력하세요. 테마에서 (post) `author.bio`로 접근할 수 있습니다.

#### 비밀번호 변경

1.  텍스트 상자에 기존 비밀번호와 새 비밀번호를 입력하세요.
2.  **Change Password**를 클릭하세요.
<p class="note">
    <strong>노트:</strong> 비밀번호를 바꾸기 위해서 반드시 "Change Password" 버튼을 눌러야 합니다. "Save" 버튼은 비밀번호를 변경하지 않습니다.
</p>

