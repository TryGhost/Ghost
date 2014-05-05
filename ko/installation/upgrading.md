---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 한국어 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 한국어 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# Ghost 업그레이드 <a id="upgrade"></a>
# Upgrading Ghost <a id="upgrade"></a>

Ghost를 업그레이드하는 방법은 굉장히 간단합니다.

Ghost를 업그레이드하는 방법에는 여러 가지가 있습니다. 아래에서는 [그래픽 사용자 인터페이스(GUI)](#how-to) 또는 [커맨드 라인 인터페이스(CLI)](#cli)에서 어떻게 Ghost를 업그레이드하는지 설명합니다.

<p class="note"><strong>백업하세요!</strong> 업그레이드 전 반드시 백업을 해 두셔야 합니다. 백업하시는 방법을 잘 모르신다면 <a href="#backing-up">백업 가이드</a>를 참조하세요.</p>

## 개관

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost는 왼쪽에 표시되는 것과 유사한 폴더 구조를 가지고 있습니다. <code class="path">content</code>와 <code class="path">core</code>의 두 주요 디렉토리가 있고, 루트 디렉토리에 몇몇 파일이 위치합니다.

Ghost를 업그레이드하는 것은 오래된 파일을 새 파일로 교체하고, <code class="path">node_modules</code> 폴더를 업데이트하기 위해 `npm install`를 다시 실행하고, Ghost를 다시 시작하는 과정입니다.

Ghost는 기본적으로 여러분의 모든 정보를 <code class="path">content</code> 디렉토리에 저장하므로, 반드시 이 폴더는 수정하지 말아야 합니다. <code class="path">core</code>와 루트 디렉토리에 위치해 있는 파일만 수정해야 한다는 점을 기억하세요.

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

동영상에서 보여지는 과정은 다음과 같습니다.

*   <code class="path">cd ~/Downloads</code> - 최신 Ghost 파일이 다운로드된 Downloads 디렉토리로 터미널 창의 디렉토리를 변경
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - <code class="path">ghost-0.4.0</code> 폴더로 Ghost를 압축 해제
*   <code class="path">cd ghost-0.4.0</code> - <code class="path">ghost-0.4.0</code> 디렉토리로 터미널 창의 디렉토리를 변경
*   `ls` - 이 디렉토리의 모든 파일 및 폴더를 표시
*   `cp *.js *.json *.md LICENSE ~/ghost` - 모든 .md .js .txt .json 파일을 <code class="path">~/ghost</code>로 복사
*   `rm -rf ~/ghost/core` - 오래된 <code class="path">core</code> 디렉토리를 삭제
*   `cp -R core ~/ghost` - 새 <code class="path">core</code> 디렉토리 및 그 내용을 <code class="path">~/ghost</code>에 복사
*   `cp -R content/themes/casper ~/ghost/content/themes` - 새 <code class="path">casper</code> 디렉토리 및 그 내용을 <code class="path">~/ghost/content/themes</code>에 복사
*   `cd ~/ghost` - <code class="path">~/ghost</code> 디렉토리로 터미널 창의 디렉토리를 변경
*   `npm install --production` - Ghost 설치
*   `npm start` - Ghost 실행

### Linux 서버의 CUI 환경에서 업그레이드 <a id="cli-server"></a>

*   우선 최신 Ghost 버전이 위치한 URL을 알아야 합니다. 이는 `http://ghost.org/zip/ghost-latest.zip`와 같은 형식을 가지고 있습니다.
*   압축 파일을 `wget http://ghost.org/zip/ghost-latest.zip` 명령어로 다운로드하세요. (URL은 최신 Ghost 버전이 위치한 URL이면 됩니다)
*   Ghost를 설치한 디렉토리에서 오래된 core 디렉토리를 삭제하세요.
*   `unzip -uo ghost-0.4.*.zip -d 여러분이-Ghost를-설치한-디렉토리` 명령어로 아카이브를 압축 해제하세요.
*   `npm install --production`을 입력하셔서 의존 프로그램을 설치하세요.
*   마지막으로 Ghost를 재시작하시면 업그레이드가 완료됩니다.

**더하여**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/)에서는 Linux 서버에서 Ghost를 업그레이드할 수 있는 강좌를 제공합니다.

### DigitalOcean Droplet에서 업그레이드 <a id="digitalocean"></a>

<p class="note"><strong>백업하세요!</strong> 업그레이드 전 반드시 백업을 해 두셔야 합니다. 백업하시는 방법을 잘 모르신다면 <a href="#backing-up">백업 가이드</a>를 참조하세요.</p>

*   우선 최신 Ghost 버전이 위치한 URL을 알아야 합니다. 이는 `http://ghost.org/zip/ghost-latest.zip`와 같은 형식을 가지고 있습니다.
*   최신 Ghost 버전의 URL을 아셨다면 Droplet 콘솔 창에 `cd /var/www/`를 입력하셔서 Ghost가 설치된 디렉토리로 이동하세요.
*   다음으로, 압축 파일을 `wget http://ghost.org/zip/ghost-latest.zip` 명령어로 다운로드하세요. (URL은 최신 Ghost 버전이 위치한 URL이면 됩니다)
*   `rm -rf ghost/core`를 입력하셔서 오래된 core 디렉토리를 삭제하세요.
*   `unzip -uo ghost-latest.zip -d ghost`를 입력하셔서 압축 파일을 압축 해제하세요.
*   `chown -R ghost:ghost ghost/*`를 입력하셔서 모든 파일에 알맞은 권한 설정이 되어 있는지 확인하세요.
*   `cd ghost`를 입력하셔서 <code class="path">ghost</code> 디렉토리로 이동하세요.
*   `npm install --production`을 입력하셔서 의존 프로그램을 설치하세요.
*   마지막으로 `service ghost restart`를 입력하셔서 Ghost를 재시작하시면 업그레이드가 완료됩니다. (이는 조금의 시간이 걸릴 수 있습니다)

## Node.js를 최신 버전으로 업그레이드하는 방법 <a id="upgrading-node"></a>

[Node.js](nodejs.org) 웹 사이트로부터 Node.js를 설치하셨다면, 최신 설치 프로그램을 다운로드하시고 실행하시는 것으로 Node.js를 업그레이드할 수 있습니다.

Ubuntu, 혹은 apt-get을 사용하는 다른 Linux 배포판을 사용하고 계신다면 Node.js를 업그레이드하기 위한 명령어는 설치할 때와 같습니다: `sudo apt-get install nodejs`.

서버나 Ghost를 재시작하실 필요는 **없습니다**.