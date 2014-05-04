---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 한국어 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 한국어 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Windows에 Ghost 설치

### Node.js 설치

*   [http://nodejs.org](http://nodejs.org)에서 Install(설치) 버튼을 누르시면 '.pkg' 파일이 다운로드됩니다.
*   다운로드된 설치 프로그램을 실행하시면 node와 npm 모두를 설치할 수 있습니다.
*   Node.js의 설치가 완료되었다는 창이 나타날 때까지 설치 과정을 진행하세요.

중간에 어떻게 해야할 지 잘 모르시겠다면 [설치 과정 동영상](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Windows에 Node.js 설치")을 보고 따라해 보세요.

### Ghost 다운로드 및 압축 해제

*   [http://ghost.org](http://ghost.org)에 로그인하시고, 파란색 'Ghost 소스 코드 다운로드' 버튼을 클릭하세요.
*   다운로드 페이지에서 버튼을 누르셔서 최신 압축 파일을 다운로드하세요.
*   다운로드된 파일 옆에 위치한 화살표를 클릭하시고 '폴더 열기'를 선택하세요.
*   폴더가 열리면 다운로드된 압축 파일을 오른쪽 클릭하시고 '모두 압축 해제'를 선택하세요.

중간에 어떻게 해야할 지 잘 모르시겠다면 [설치 과정 동영상](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Windows에 Ghost 설치 파트 1")을 보고 따라해 보세요.

### Ghost 설치 및 실행

*   시작 메뉴에서 Node.js를 찾으시고 'Node.js 명령 프롬프트(Node.js Command Prompt)'를 선택하세요.
*   Node.js 명령 프롬프트의 디렉토리를 Ghost가 압축 해제되었던 디렉토리로 바꿔야 합니다. `cd Downloads/ghost-#.#.#`를 입력하세요. (# 문자를 여러분이 다운로드하신 Ghost 버전으로 바꾸세요)
*   다음으로, 명령 프롬프트 창에 `npm install --production`을 입력하세요. <span class="note">대시(-)가 2개인 것에 유의하세요.</span>
*   npm 설치가 끝나셨다면, Ghost를 개발 모드로 실행하기 위해 `npm start`를 입력하세요.
*   웹 브라우저로 <code class="path">127.0.0.1:2368</code>에 접속하시면 새롭게 설치된 Ghost 블로그를 확인하실 수 있습니다.
*   <code class="path">127.0.0.1:2368/ghost</code>에 접속하셔서 앞으로 사용하실 관리자 계정을 만드세요.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Windows에 Ghost 설치 파트 2")