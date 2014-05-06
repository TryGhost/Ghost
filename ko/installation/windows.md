---
lang: ko
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ko/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# 윈도우즈에서 설치하기 <a id="install-windows"></a>

### Node 설치하기

*   [http://nodejs.org](http://nodejs.org)로 가서 install 버튼을 누르면 '.msi' 파일이 다운로드 됩니다.
*   다운로드 받은 파일을 실행하면 Node 와 npm 모두 설치 됩니다.
*   Node.js 설치가 완료 되었다는 화면이 나올때까지 인스톨러 과정을 따라가면 됩니다.

만약 문제가 발생했을 경우 [직접 보기](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "윈도우즈에서 Node.js 설치하기")를 참조하세요.

### 고스트 다운로드 및 압축풀기

*   [http://ghost.org](http://ghost.org)에서 로그인 한 후, 'Download Ghost Source Code'라고 되어있는 파란 버튼을 누르세요.
*   다운로드 화면에서 가장 최신의 zip 파일을 다운로드 하세요.
*   새로 다운로드한 파일 옆에 있는 화살표를 누르고 '폴더에서 보기'를 선택하세요.
*   폴더가 열리면 다운로드한 zip 파일을 마우스 우측 버튼으로 선택하고 '모두 압축풀기'를 누르세요.

만약 문제가 발생했을 경우 [직접 보기](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "윈도우즈에서 고스트 설치하기 1")를 참조하세요.

### 고스트 설치 및 실행하기

*   시작 메뉴에서 'Node.js'를 검색하고 'Node.js 명령어 입력기'를 선택하세요.
*   Node.js 명령어 입력기에 `cd Downloads/ghost-#.#.#` (#.#.#는 다운로드 하신 고스트 버전으로 바꾸세요)를 입력하여 고스트를 압축 풀기한 폴더로 이동 합니다. 
*   명령어 입력기에 `npm install --production`를 입력하면 설치가 시작됩니다. <span class="note">꼭 - 는 두개를 입력 하세요.</span>
*   npm이 설치를 마치면 명령어 입력기에 `npm start`를 입력하여 개발 모드로 고스트를 시작합니다.
*   브라우저를 시작하고 주소창에 <code class="path">127.0.0.1:2368</code>를 입력하고 이동하면 새롭게 설정을 마친 고스트 블로그가 나타납니다.
*   주소창에 <code class="path">127.0.0.1:2368/ghost</code>를 입력하고 이동하여 관리자 계정을 만들고 고스트 관리창으로 로그인 합니다.
*   다음 단계로 [사용 설명서](/usage)를 참조하세요.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "윈도우즈에서 고스트 설치하기 2")

