---
lang: ko
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ko/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# 맥에 설치하기 <a id="install-mac"></a>

Node.js와 Ghost를 맥에 설치하려면 터미널 윈도우가 필요합니다. 스포트라이트를 열어 "Terminal"을 입력해 터미널을 열 수 있습니다.

### Node 설치

*   [http://nodejs.org](http://nodejs.org)에서 INSTALL 버튼을 눌러 '.pkg' 파일을 다운로드합니다.
*   다운로드한 파일을 클릭해 인스톨러를 실행하면 Node와 Npm이 설치됩니다.
*   인스톨러 화면을 따라가다 마지막에 패스워드를 입력하고 'install software'를 클릭합니다.
*   설치가 끝나면 터미널 윈도우로 돌아가 `echo $PATH`를 입력해 '/usr/local/bin'이 `$PATH` 환경변수에 포함되어 있는지 확인합니다.

<p class="note"><strong>주의:</strong> $PATH에 '/usr/local/bin'이 포함되어 있지 않으면 <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">문제해결 팁</a>을 참조해 추가하기 바랍니다.

잘 안되나요? [전체 설치 과정](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "맥에 Node 설치하기")을 볼 수 있습니다.

### Ghost 설치 및 실행
*   [downloads page](https://ghost.org/download/)에서 다운로드 버튼을 눌러 최신 zip 파일을 다운로드 합니다.
*   다운로드한 Zip 파일을 파인더에서 찾아 더블클릭해 압축을 해제합니다.
*   그 다음 압축 해제된 'ghost-#.#.#' 폴더를 드래그해 터미널 윈도우의 탭바에 드랍합니다. 이렇게 하면 끌어다 놓은 폴더 위치에서 새 터미널 탭이 열립니다.
*   새로 연 터미널 탭에서 `npm install --production`을 입력합니다. <span class="note">대시가 두 개인 것에 주의하세요.</span>
*   Npm이 설치를 끝내면 `npm start`를 입력해 개발 모드로 Ghost를 시작합니다.
*   브라우저 주소창에 <code class="path">127.0.0.1:2368</code>를 입력해 방금 설치한 Ghost 블로그를 확인합니다.
*   주소창에서 URL을 <code class="path">127.0.0.1:2368/ghost</code>로 변경해 관리자 계정을 생성하고 Ghost 관리자로 로그인합니다.
*   다음 단계 설명을 확인하려면 [사용법 문서](/usage)을 보시기 바랍니다.
![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)
