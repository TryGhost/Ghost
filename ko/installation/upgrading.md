---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
canonical: http://support.ghost.org/how-to-upgrade/
redirectToCanonical: true
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

*   데이터베이스에서 모든 데이터를 백업하기 위해서 여러분의 Ghost 블로그에 접속하시고 <code class="path">/ghost/debug/</code>으로 이동하세요. export 버튼을 누르시면 여러분의 모든 정보가 담긴 .json 파일을 다운로드할 수 있습니다.
*   여러분의 Ghost 테마 및 이미지를 백업하기 위해서는 <code class="path">content/themes</code>와 <code class="path">content/images</code> 폴더에 위치한 파일들을 복사하셔야 합니다.

<p class="note"><strong>노트:</strong> 여러분은 <code class="path">content/data</code>에 위치한 데이터베이스의 사본을 만들어둘 수 있지만 <strong>반드시</strong> Ghost를 종료하신 후 과정을 진행하세요.</p>


## 그래픽 사용자 인터페이스(GUI)에서 업그레이드

로컬 장치의 Ghost를 업그레이드하는 방법

<p class="warn"><strong>경고:</strong> 기존의 Ghost 폴더에 새 Ghost 폴더 전체를 복사 및 붙여넣기하여 덮어씌우지 <strong>마십시오</strong>. Transmit과 같은 다른 FTP 소프트웨어를 사용할 때 <kbd>대치</kbd>를 선택하시지 마시고 <strong>병합</strong>을 선택하십시오.</p>

*   [Ghost.org](http://ghost.org/download/)으로부터 최신 버전의 Ghost를 다운로드하세요.
*   임시 폴더에 Ghost를 압축 해제하세요.
*   루트 디렉토리에 위치해 있는 모든 파일을 복사하세요. 이는 index.js, package.json, Gruntfile.js, config.example.js, 라이센스(license) 및 readme 파일을 포함합니다.
*   다음으로, 기존의 <code class="path">core</code> 디렉토리를 완전히 삭제하시고 새 <code class="path">core</code> 디렉토리로 대체하세요.
*   Casper(Ghost 기본 테마)의 업데이트를 포함하는 버전의 경우 오래된 <code class="path">content/themes/casper</code> 디렉토리를 삭제하시고 새 파일로 대체하세요.
*   `npm install --production`을 실행하세요.
*   마지막으로 Ghost를 재시작하시면 업그레이드가 완료됩니다.

## 커맨드 라인 인터페이스(CUI)에서 업그레이드

<p class="note"><strong>백업하세요!</strong> 업그레이드 전 반드시 백업을 해 두셔야 합니다. 백업하시는 방법을 잘 모르신다면 <a href="#backing-up">백업 가이드</a>를 참조하세요.</p>

### Mac의 CUI 환경에서 업그레이드 <a id="cli-mac"></a>

아래의 동영상은 Ghost가 <code class="path">~/ghost</code>에 설치되어 있고 새 Ghost 파일이 <code class="path">~/Downloads</code>에 다운로드된 상황에서 Ghost를 업그레이드하는 방법을 설명합니다. <span class="note">**노트:** `~`는 Mac 및 Linux에서 사용자의 홈 디렉토리를 의미합니다</span>

![Ghost 업그레이드](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

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
