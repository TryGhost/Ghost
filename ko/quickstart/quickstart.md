---
lang: ko
layout: quickstart
meta_title: Ghost 빠른 시작
heading: Ghost 빠른 시작
subheading: Ghost를 빠르게 설치하고 실행하는 방법
chapter: quickstart
section: quickstart
---

# 개관 <a id="overview"></a>

빠른 시작 가이드는 [Node](http://nodejs.org)나 Ruby on Rails에 익숙한 개발자들을 위해 작성되었습니다. 이러한 프로그래밍 언어에 익숙하시지 않다면 더 상세히 설명된 [설치 가이드](/installation.html)를 참조하시는 것을 권장합니다.

## 로컬 환경에서 Ghost 실행 <a id="ghost-local"></a>

Ghost는 [Node.js](http://nodejs.org) 위에서 작동하며, `0.10.*`(최신 정식 버전)이 필요합니다.

아직 Node.js를 설치하시지 않으셨다면 <http://nodejs.org>로 이동하셔서 최신 버전의 Node.js를 내려받으세요. 설치 프로그램은 Node.js와 패키지 관리 프로그램 npm 모두를 설치할 것입니다.

Linux의 사용자 분들은 `.tar.gz` 아카이브가 아닌 [패키지 관리자로 Node.js를 설치](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)할 수도 있습니다.

[Ghost.org](http://ghost.org)로부터 최신 버전의 Ghost를 다운로드하세요. 압축 파일을 원하시는 곳에 압축 해제하세요.

Mac이나 Linux 사용자 분들은 터미널을, Windows 사용자 분들은 명령 프롬프트를 열고 Ghost가 압축 해제된 루트 디렉토리로 이동하세요. (package.json이 위치해 있는 디렉토리입니다)

Ghost를 설치하기 위해 `npm install --production`을 입력하세요.

<!--<h2 id="customise">Customise & Configure Ghost</h2>

<h2 id="ghost-deploy">Deploy Ghost</h2>

<ol>
    <li>In the Terminal / Command Prompt, type <code>npm start</code></li>
    <li><p>This will have launched your Ghost blog, visit one  <a href="http://localhost:2368/">http://localhost:2368/</a> to see</p></li>
</ol>
-->