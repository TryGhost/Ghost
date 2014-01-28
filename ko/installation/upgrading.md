---
lang: ko
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ko/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# Ghost 업그레이드 하기<a id="upgrade"></a>

Ghost를 업그레이드 하는 것은 아주 쉽습니다.

Ghost를 업그레이드할 때 [마우스를 이용한 클릭 방식](#how-to)또는 [명령행 방식](#cli)을 사용할 수 있습니다. 아래 각 방식에 대한 자세한 절차가 나와 있으며, 편한 방법을 선택해 진행하면 됩니다.

<p class="note"><strong>백업하세요!</strong> 업그레이드 전에는 항상 백업을 수행하기 바랍니다. 먼저 <a href="#backing-up">백업 방법</a>을 읽기 바랍니다!</p>

## 개요

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost를 설치하면 왼쪽 그림과 비슷한 폴더 구조가 생깁니다. 루트 디렉터리 아래 중요 디렉터리 <code class="path">content</code>와 <code class="path">core</code>, 그리고 여래 개의 파일이 있습니다.

Ghost를 업그레이드하는 것은, 예전 파일을 새 파일로 변경하고 `npm install`을 재실행해 <code class="path">node_modules</code> 폴더를 업데이트한 다음 모든 변경사항이 반영되도록 Ghost를 재시작하는 것입니다.

Ghost는 기본으로 모든 사용자 데이터, 테마, 이미지 등을 <code class="path">content</code> 디렉터리에 저장하므로 이 디렉터리를 안전하게 보관하는데 신중을 기해야 합니다! <code class="path">core</code> 디렉터리와 루트 디렉터리에 있는 파일만 바꾼다면, 괜찮을 겁니다.

## 백업 <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

* 데이터베이스의 모든 데이터를 백업하려면 Ghost에 로그인해 <code class="path">/ghost/debug/</code>로 갑니다. EXPORT 버튼을 눌러 모든 데이터를 담고 있는 JSON 파일을 다운로드하면 끝입니다.
* 커스텀 테마와 이미지를 백업하려면 <code class="path">content/themes</code>와 <code class="path">content/images</code> 디렉터리 안에 있는 파일을 복사해야 합니다.

<p class="note"><strong>노트:</strong> <code class="path">content/data</code>에서 데이터베이스를 복사할 수도 있지만, Ghost가 실행중일 때 복사하면 안됩니다. 먼저 Ghost를 중지한 다음 복사하기 바랍니다.</p>


## 업그레이드 방법<a id="how-to"></a>

로컬 머신에서 업그레이드 하는 방법

<p class="warn"><strong>경고:</strong> 맥에서 기존 설치 폴더로 Ghost 전체를 복사&붙여넣기 하면 <strong>안 됩니다.</strong> Transmit 또는 기타 FTP 소프트웨어로 업로드하는 경우 <kbd>REPLACE</kbd>를 선택하지 말고, <strong>MERGE</strong>를 선택하기 바랍니다.</p>


* [Ghost.org](http://ghost.org/download/)에서 Chost 최신 버전을 다운로드합니다.
* 임시 디렉터리에 Zip 파일을 풉니다.
* 최신 버전의 루트 폴더에 있는 모든 파일(index.js, package.json, Gruntfile.js, config.example.js, LICENSE.txt, README.md)을 복사합니다.
* 그 다음 기존 <code class="path">core</code> 디렉터리를 새 `core` 디렉터리로 덮어씁니다.
* Casper(디폴트 테마) 업데이트가 포함된 릴리즈의 경우 <code class="path">content/themes/casper</code> 디렉터리를 새 것으로 덮어씁니다.
* `npm install --production`을 실행합니다.
* 마지막으로 Ghost를 재시작해 변경 사항을 반영합니다.

## 커맨드 라인 명령만 사용하기 <a id="cli"></a>

<p class="note"><strong>백업하세요!</strong> 업그레이드 전에는 항상 백업을 수행하기 바랍니다. 먼저 <a href="#backing-up">백업 방법</a>을 읽기 바랍니다!</p>

### 맥 <a id="cli-mac"></a>

아래 스크린캐스트를 보면 Zip 파일이 <code class="path">~/Downloads</code>에 다운로드 되어있고 Ghost가 <code class="path">~/ghost</code>에 설치되어 있는 경우 Ghost를 업그레이드 하는 단계를 알 수 있습니다. <span class="note">**노트:** `~`는 맥과 리눅스에서 사용자 홈 디렉터리를 뜻함</span>

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif)

스트린캐스트에서의 각 단계는 다음과 같습니다.

* <code class="path">cd ~/Downloads</code> - Ghost 최신 버전을 다운로드한 디렉터리로 이동합니다.
* `unzip ghost-0.3.1.zip -d ghost-0.3.3` - Ghost를 <code class="path">ghost-0.3.3</code> 폴더로 압축 해제합니다.
* <code class="path">cd ghost-0.3.3</code> - <code class="path">ghost-0.3.3</code> 디렉터리로 이동합니다.
* `ls` - 현재 디렉터리의 모든 파일과 폴더를 표시합니다.
* `cp *.md *.js *.txt *.json ~/ghost` - 모든 .md .js .txt .json 파일을 현재 위치에서 <code class="path">~/ghost</code>로 복사합니다.
* `cp -R core ~/ghost` - <code class="path">core</code> 디렉터리와 그 내용을 <code class="path">~/ghost</code>로 복사합니다.
* `cp -R content/themes/casper ~/ghost/content/themes` - <code class="path">casper</code> 디렉터리와 그 내용을 <code class="path">~/ghost/content/themes</code>로 복사합니다.
* `cd ~/ghost` - <code class="path">~/ghost</code> 디렉터리로 이동합니다.
* `npm install --production` - Ghost를 설치합니다.
* `npm start` - Ghost를 시작합니다.

### 리눅스 서버에서 커맨트 라인으로 작업하기 <a id="cli-server"></a>

* 먼저 Ghost 최신 버전의 URL을 알아야 합니다. URL은 `http://ghost.org/zip/ghost-latest.zip`과 같은 식입니다.
* `wget http://ghost.org/zip/ghost-latest.zip`(또는 Ghost의 최신 버전 URL)로 Zip 파일을 다운로드합니다.
* `unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install`로 압축을 해제합니다.
* `npm install --production`을 실행해 다른 종속 모듈도 설치합니다.
* 마지막으로, 변경사항이 반영되도록 Ghost를 재시작합니다.

리눅스 서버에서 Ghost를 업그레이드 하는 방법은 [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/)에도 있습니다.

### DigitalOcean Droplet을 업그레이드 하는 방법 <a id="digitalocean"></a>

<p class="note"><strong>백업하세요!</strong> 업그레이드 전에는 항상 백업을 수행하기 바랍니다. 먼저 <a href="#backing-up">백업 방법</a>을 읽기 바랍니다!</p>

* 먼저 Ghost 최신 버전의 URL을 알아야 합니다. URL은 `http://ghost.org/zip/ghost-latest.zip`과 같은 식입니다.
* 최신 버전의 URL을 알았으면 Droplet 콘솔에서 `cd /var/www/`를 입력해 Ghost 코드가 있는 디렉터리로 이동합니다.
* 그 다음 `wget http://ghost.org/zip/ghost-latest.zip`(또는 Ghost의 최신 버전 URL)를 입력합니다.
* `unzip -uo ghost-0.3.*.zip -d ghost`으로 압축을 해제합니다.
* `chown -R ghost:ghost ghost/*`를 실행해 모든 파일이 올바른 권한(permissions)을 갖게 합니다.
* `npm install`을 실행해 다른 종속 모듈도 설치합니다.
* 마지막으로, `service ghost restart`를 실행해 변경사항이 반영되도록 합니다.

## Node.js를 최신 버전으로 업그레이드하는 방법 <a id="upgrading-node"></a>

Node.js를 [Node.js](nodejs.org) 웹사이트에서 다운로드해 설치했다면, 최신 버전을 다운로드해 최신 인스톨러를 실행해 Node.js를 업그레이드할 수 있습니다. 이렇게 하면 현재 버전이 새 버전으로 교체됩니다.

Ubuntu나 `apt-get`을 사용하는 다른 리눅스 배포판을 사용하고 있다면 Node를 업그레이드하는 명령은 설치하는 명령과 동일하게 `sudo apt-get install nodejs` 입니다.

Ghost나 서버를 재시작할 필요는 **없습니다.**
