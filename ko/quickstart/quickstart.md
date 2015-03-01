---
lang: ko
layout: quickstart
meta_title: Ghost 빠른 시작
heading: Ghost 빠른 시작
subheading: Ghost를 빠르게 설치하고 실행하는 방법
chapter: quickstart
section: quickstart
---

# 개요 <a id="overview"></a>

Ghost 실행 퀵스타트 가이드는 이미 [Node](http://nodejs.org) 또는 루비 온 레일즈 같은 것에 익숙한 분을 위한 것입니다. 이런 것들을 잘 모른다면 좀더 차근차근한 설명이 들어있는 [설치 가이드](/installation.html)를 읽기 바랍니다.

## 로컬에서 Ghost 실행하기 <a id="ghost-local"></a>

Ghost를 실행하려면 node `0.10.*` (the latest stable version)이 필요합니다.

아직 없다면 <http://nodejs.org>에 방문해 Node.js 최신 버전을 다운로드하기 바랍니다. 설치파일은 Node뿐 아니라 Node 패키지 관리자인 npm도 함께 설치할 것입니다.

리눅스 사용자는 .tar.gz 아카이브 보다는 [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)로 설치하기를 원할 것입니다.

[Ghost.org/download/](https://ghost.org/download/)에서 Ghost 최신 버전을 다운로드해, Ghost를 실행할 폴더(아무 폴더나 상관 없습니다!)에 압축을 해제합니다.

터미널(맥/리눅스) 또는 도스창(윈도우)을 열어 Ghost 압축을 해제한 디렉터리(package.json 파일이 있는)로 갑니다.

`npm install --production`를 실행해 Ghost를 설치합니다.

<!--<h2 id="customise">Customise & Configure Ghost</h2>

<h2 id="ghost-deploy">Deploy Ghost</h2>

<ol>
    <li>In the Terminal / Command Prompt, type <code>npm start</code></li>
    <li><p>This will have launched your Ghost blog, visit one  <a href="http://localhost:2368/">http://localhost:2368/</a> to see</p></li>
</ol>
-->
