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

Node.js와 Ghost를 여러분의 Mac에 설치하시기 위해서는 터미널 창을 여셔야 합니다. Spotlight 검색으로 "터미널"을 검색하시면 쉽게 실행하실 수 있습니다.

### Node.js 설치

*   [http://nodejs.org](http://nodejs.org)에서 Install(설치) 버튼을 누르시면 '.pkg' 파일이 다운로드됩니다.
*   다운로드된 설치 프로그램을 실행하시면 node와 npm 모두를 설치할 수 있습니다.
*   설치 과정을 진행하세요. 여러분의 Mac 계정 암호를 입력하시고 '소프트웨어 설치' 버튼을 클릭하세요.
*   설치 과정이 끝나면, 터미널 창에 `echo $PATH`를 입력하셔서 그 결과에 '/usr/local/bin'이라는 문자열이 포함되어 있는지 확인해 보세요.

<p class="note"><strong>노트:</strong> '/usr/local/bin'이 여러분의 $PATH에 나타나지 않는다면, <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">문제 해결 팁</a>을 확인하셔서 어떻게 추가하는지 확인해 보세요</p>

중간에 어떻게 해야할 지 잘 모르시겠다면 [설치 과정 동영상](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Mac에 Node.js 설치")을 보고 따라해 보세요.

### Ghost 설치 및 실행

*   [http://ghost.org](http://ghost.org)에 로그인한 다음, 파란색 'Download Ghost Source Code' 버튼을 클릭하세요.
*   다운로드 페이지에서 다운로드 버튼을 클릭해 최신 Zip 파일을 내려받습니다.
*   다운로드한 Zip 파일을 파인더에서 찾아 더블클릭해 압축을 해제합니다.
*   그 다음 압축 해제된 `ghost-#.#.#` 폴더를 드래그해 터미널 윈도우의 탭바에 드랍합니다. 이렇게 하면 끌어다 놓은 폴더 위치에서 새 터미널 탭이 열립니다.
*   새로 연 터미널 탭에서 `npm install --production`을 입력합니다. <span class="note">대시가 두 개인 것에 주의하세요.</span>
*   Npm이 설치를 끝내면 `npm start`를 입력해 개발 모드로 Ghost를 시작합니다.
*   브라우저 주소창에 <code class="path">127.0.0.1:2368</code>를 입력해 방금 설치한 Ghost 블로그를 확인합니다.
*   주소창에서 URL을 <code class="path">127.0.0.1:2368/ghost</code>로 변경해 관리자 계정을 생성하고 Ghost 관리자로 로그인합니다.
*   다음 단계 설명을 확인하려면 [사용법 문서](/usage)을 보시기 바랍니다.
![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)
