---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---

# Mac에 Ghost 설치하기 <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Node.js와 Ghost를 여러분의 Mac에 설치하시기 위해서는 터미널 창을 여셔야 합니다. Spotlight 검색으로 "터미널"을 검색하시면 쉽게 실행하실 수 있습니다.

### Node.js 설치

*   [http://nodejs.org](http://nodejs.org)에서 Install(설치) 버튼을 누르시면 '.pkg' 파일이 다운로드됩니다.
*   다운로드된 설치 프로그램을 실행하시면 node와 npm 모두를 설치할 수 있습니다.
*   설치 과정을 진행하세요. 여러분의 Mac 계정 암호를 입력하시고 '소프트웨어 설치' 버튼을 클릭하세요.
*   설치 과정이 끝나면, 터미널 창에 `echo $PATH`를 입력하셔서 그 결과에 '/usr/local/bin'이라는 문자열이 포함되어 있는지 확인해 보세요.

<p class="note"><strong>노트:</strong> '/usr/local/bin'이 여러분의 $PATH에 나타나지 않는다면, <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">문제 해결 팁</a>을 확인하셔서 어떻게 추가하는지 확인해 보세요</p>

중간에 어떻게 해야할 지 잘 모르시겠다면 [설치 과정 동영상](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Mac에 Node.js 설치")을 보고 따라해 보세요.

### Ghost 설치 및 실행

*   [http://ghost.org](http://ghost.org)에 로그인하시고, 파란색 'Ghost 소스 코드 다운로드' 버튼을 클릭하세요.
*   다운로드 페이지에서 버튼을 누르셔서 최신 압축 파일을 다운로드하세요.
*   다운로드된 파일 옆에 위치한 화살표를 클릭하시고 'Finder에서 열기'를 선택하세요.
*   Finder 창에서 압축 파일을 이중 클릭하셔서 압축을 해제하세요.
*   다음으로, 압축 해제로 생성된 `ghost-#.#.#` 폴더를 끌어서 터미널 창에 떨구세요(드래그 앤 드롭). 이제 해당 폴더에서 터미널 작업을 할 수 있습니다.
*   방금 전 폴더를 떨궜던 터미널 창에 `npm install --production`을 입력하세요. <span class="note">대시(-)가 2개인 것에 유의하세요.</span>
*   npm 설치가 끝나셨다면, Ghost를 개발 모드로 실행하기 위해 `npm start`를 입력하세요.
*   웹 브라우저로 <code class="path">127.0.0.1:2368</code>에 접속하시면 새롭게 설치된 Ghost 블로그를 확인하실 수 있습니다.
*   <code class="path">127.0.0.1:2368/ghost</code>에 접속하셔서 앞으로 사용하실 관리자 계정을 만드세요.

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
