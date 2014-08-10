---
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---

# Linux에 Ghost 설치 <a id="install-linux"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Node.js 설치

*   [http://nodejs.org](http://nodejs.org)에서 `.tar.gz` 아카이브를 다운로드하시거나 [패키지 관리자로 Node.js를 설치](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)하는 방법을 따라하세요.
*   터미널 창에 `node -v`와 `npm -v`를 입력하셔서 Node.js와 npm이 모두 설치되어 있는지 확인하세요.

### Ghost 설치 및 실행


**Linux를 여러분의 데스크탑에서 사용하고 계신다면 다음을 따라하세요**

*   [http://ghost.org](http://ghost.org)에 로그인하시고, 파란색 'Ghost 소스 코드 다운로드' 버튼을 클릭하세요.
*   다운로드 페이지에서, 버튼을 클릭하셔서 최신 압축 파일을 내려받으시고 원하시는 디렉토리에 압축을 해제하세요.


** Linux를 게스트 OS로 사용하고 계시거나 SSH로 접속하고 계셔서 터미널 창만 이용하실 수 있다면 다음을 따라하세요**

*   다음 명령어를 터미널 창에 입력하셔서 Ghost 최신 판을 다운로드하세요.

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Ghost를 압축 해제하고 압축 해제된 디렉토리로 이동하기 위해 다음 명령어를 터미널 창에 입력하세요.

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Ghost의 압축 해제를 완료하셨다면 터미널 창을 여시고 다음을 따라하세요.**

*   다음 명령어를 터미널 창에 입력하셔서 Ghost가 압축 해제된 디렉토리로 이동하세요.

    ```
    $ cd /path/to/ghost
    ```

*   Ghost를 설치하기 위해 다음 명령어를 입력하세요.

    ```
    npm install --production
    ```
    <span class="note">대시(-)가 2개인 것에 유의하세요</span>

*   npm 설치가 끝나면 개발 모드로 Ghost를 실행하기 위해 다음 명령어를 입력하세요.

    ```
    $ npm start
    ```

*   Ghost는 이제 **127.0.0.1:2368**에서 작동하고 있을 것입니다.<br />
    <span class="note">IP 주소와 포트를 **config.js**에서 수정할 수 있습니다</span>

*   웹 브라우저로 <code class="path">127.0.0.1:2368</code>에 접속하시면 새롭게 설치된 Ghost 블로그를 확인하실 수 있습니다.
*   <code class="path">127.0.0.1:2368/ghost</code>에 접속하셔서 앞으로 사용하실 관리자 계정을 만드세요.
