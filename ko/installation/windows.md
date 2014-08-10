---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# 윈도우에 설치하기 <a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Node 설치

*   [http://nodejs.org](http://nodejs.org)에서 INSTALL 버튼을 눌러 '.msi' 파일을 다운로드합니다.
*   다운로드한 파일을 클릭해 인스톨러를 실행하면 Node와 Npm이 설치됩니다.
*   인스톨러에서 계속 클릭해 Node.js 설치를 완료합니다.

잘 안되나요? [전체 설치 과정](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "윈도우에 Node 설치하기")을 참조하시기 바랍니다.

### Ghost 다운로드 및 압축 해제

*   [downloads page](https://ghost.org/download/)에서 다운로드 버튼을 눌러 최신 zip 파일을 다운로드 합니다.
*   탐색기에서 다운로드한 파일을 찾아 선택한 다음 마우스 오른쪽 버튼을 클릭해 'Extract all'을 선택합니다.

잘 안되는 경우 [설치 과정](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "윈도우에 Ghost 설치하기 1부")을 참조할 수 있습니다.

### Ghost 설치 및 실행

*   시작 메뉴에서 'Node.js' 찾은 다음 'Node.js Command Prompt'를 선택합니다.
*   Node 명령창에서 Ghost를 압축해제한 디렉터리로 이동해야 합니다. `cd Downloads/ghost-#.#.#`(# 부분은 다운로드한 Ghost 버전에 맞게 수정해야 합니다)를 입력합니다.
*   그 다음, 명령창에서 `npm install --production`을 입력합니다. <span class="note">대시가 두 개인 것에 주의하세요.</span>
*   Npm이 설치를 끝내면 `npm start`를 입력해 개발 모드로 Ghost를 시작합니다.
*   브라우저 주소창에 <code class="path">127.0.0.1:2368</code>를 입력해 방금 설치한 Ghost 블로그를 확인합니다.
*   주소창에서 URL을 <code class="path">127.0.0.1:2368/ghost</code>로 변경해 관리자 계정을 생성하고 Ghost 관리자로 로그인합니다.
*   다음 단계 설명을 확인하려면 [사용법 문서](/usage)을 보시기 바랍니다.
![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")
