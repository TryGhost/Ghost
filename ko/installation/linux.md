---
lang: ko
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ko/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# 리눅스에 설치하기 <a id="install-linux"></a>

### Node 설치

*   [http://nodejs.org](http://nodejs.org)에서 `.tar.gz` 파일을 다운로드하거나, [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)의 설명에 따라 설치합니다.
*   터미널 윈도우에서 `node -v`와 `npm -v`를 입력해 Node와 Npm이 설치되었는지 확인합니다.

### Ghost 설치 및 실행

*   [downloads page](https://ghost.org/download/)에서 다운로드 버튼을 눌러 최신 zip 파일을 다운로드한 다음 Ghost를 실행할 위치에 압축을 풉니다.
*   터미널 윈도우에서 방금 압축 해제한 Ghost의 루트 디렉터리로 이동합니다.
*   터미널에서 `npm install --production`을 입력합니다. <span class="note">대시가 두 개인 것에 주의하세요.</span>
*   Npm이 설치를 끝내면 `npm start`를 입력해 개발 모드로 Ghost를 시작합니다.
*   브라우저 주소창에 <code class="path">127.0.0.1:2368</code>를 입력해 방금 설치한 Ghost 블로그를 확인합니다.
*   주소창에서 URL을 <code class="path">127.0.0.1:2368/ghost</code>로 변경해 관리자 계정을 생성하고 Ghost 관리자로 로그인합니다.

리눅스를 게스트 OS로 사용하거나 또는 SSH로 접근해 터미널만 사용할 수 있는 경우:

*   일반 OS에서 Ghost의 Zip 파일 URL(버전이 바뀔 때마다 변경됨)을 알아낸 다음 이 URL을 저장합니다. (단 '/zip/'을 '/archives/'로 바꿉니다.)
*   터미널에서 `wget url-of-ghost.zip`를 이용해 Ghost를 다운로드합니다.
*   `unzip -uo Ghost-#.#.#.zip -d ghost`으로 파일의 압축을 해제한 다음 `cd ghost`로 디렉터리를 이동합니다.
*   `npm install --production`을 입력해 Ghost를 설치합니다. <span class="note">대시가 두 개인 것에 주의</span>
*   Npm이 설치를 끝내면 `npm start`를 입력해 개발 모드로 Ghost를 시작합니다.
*   이제 Ghost가 127.0.0.1:2368에서 실행됩니다.
