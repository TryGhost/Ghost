---
lang: ko
layout: usage
meta_title: Ghost 사용 방법 - Ghost 가이드
meta_description: Ghost 사용 방법을 설명합니다. Ghost는 설치했는데, 어떻게 사용해야 할지 모르시겠나요? 여기를 참조해보세요.
heading: Ghost 사용 방법
subheading: Ghost를 자신에 맞게 설정하고 이용하는 방법에 대해 소개합니다.
chapter: usage
next_section: configuration
---

## 개관 <a id="overview"></a>

이제 드디어 Ghost를 사용해 볼 차례입니다. 아래 내용은 여러분이 Ghost를 어떻게 사용할 수 있는지에 대한 모든 정보를 제공합니다. 

### 첫 실행

처음으로 Ghost를 실행하고 계시다면 여러분은 Ghost의 관리자 계정을 만드셔야 합니다. 웹 브라우저에서 여러분의 새 블로그를 여신 후 <code class="path">&lt;블로그 URL&gt;/ghost/signup/</code>으로 이동하세요. 아래 이미지와 같은 화면이 표시될 것입니다.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/ghost-signup.png)

아래 내용을 참조하여 정보 입력 칸을 채우시고 **Sign Up** 버튼을 누르세요. 블로그에 로그인될 것입니다.

*   **Full Name**: 블로그 글에 저자로 표시될 이름입니다.
*   **Email Address**: 유효한 이메일 주소를 입력하세요.
*   **Password**: 최소 8자가 되어야 합니다.

이제 블로그에 글을 쓸 수 있게 되었습니다.

#### 블로그 관리 메시지

Ghost를 처음 실행했을 때 여러분은 화면 상단에서 아래 이미지와 같이 보이는 파란색 상자를 발견하실 수 있을 것입니다.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/first-run-info.png)

이 대화 상자에는 Ghost의 현재 설정과 환경, 그리고 URL이 표시됩니다. Ghost 설정 방법과 환경에 대한 정보를 얻고 싶으시면 [설정](/usage/configuration/) 섹션을 참고하시기 바랍니다. 이 메시지는 여러분이 처음으로 로그인할 때까지 없어지지 않지만(현재 고치기 위해 작업하고 있는 버그입니다), 처음으로 로그인하신 후에는 X 버튼을 눌러 없앨 수 있습니다.

이메일 설정에 관한 주황색 경고 메시지가 나타날 수도 있습니다.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/email-warning.png)

이메일 설정은 블로그 설정에 있어서 그다지 중요한 것은 아니어서 블로그 글을 작성하는 데에는 문제가 없습니다. 하지만 언젠가 [이메일 설정 가이드](/mail)를 읽고 Ghost가 이메일을 보낼 수 있도록 하는 것이 좋습니다. 현재로서 Ghost가 이메일을 보내는 경우는 여러분이 비밀번호를 잊었을 때 새 비밀번호를 요청하는 경우뿐입니다. 별로 대단한 경우는 아니지만 필요할 때 작동하지 않으면 곤란합니다.
