---
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Ghost 시작하기 <a id="deploy"></a>

Ghost 사용을 시작할 준비가 되셨나요? 좋습니다!

가장 먼저 생각해야 할 것은, 여러분이 설치 과정을 직접할 것인가 아니면 자동 설치도구(Installer)의 도움을 받을 것인가를 결정하는 것입니다.

### 자동설치도구(Installers)

간편한 자동설치도구로 아래와 같은 방법이 있습니다.

*   [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost)를 사용하여 클라우드에 Deploy하기
*   [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html)를 사용하여 Ghost 실행
*   [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application) 사용하기

### 수동 설치

Ghost를 사용하기 위해서는 호스팅 서비스가 [Node.js](http://nodejs.org)를 이미 지원하고 있거나 사용자가 원할 때 사용할 수 있도록 허락하는지 확인해야 합니다.

다시 말해서 클라우드 서비스([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), 가상사설서버VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)), 또는 SSH (터미널) 접속이 가능하면서 Node.js 설치가 가능한 서비스에 Ghost를 설치할 수 있습니다. 둘러보면 지원하는 곳이 꽤 많이 있고 사용료도 저렴한 편입니다.

현재 컨트롤패널(cPanel)을 사용하는 공유 호스팅 서비스에는 Ghost 설치가 불가능한데, 보통 이런 서비스들은 PHP만을 지원하기 때문이죠. 이런 호스팅 서비스 중에 가끔 Ruby를 지원하는 경우가 더러 있는데, 어느정도 비슷한 Node.js 를 장래에 혹시 지원해줄 가능성이 있기는 합니다.

<p>아쉽게도, **Nodejitsu**라든가 **Heroku**와 같은 Node 전용 호스팅 서비스는 Ghost와 **호환이 되지 않습니다.** 설치 후에 작동은 될테지만, 이내 파일과 이미지가 모두 삭제되고 데이터베이스가 사라질 것입니다. Heroku는 MySQL를 지원하므로 데이터를 보존할 수 있을지는 몰라도, 업로드한 이미지는 모두 삭제될 겁니다.

아래 링크를 참고하면 각 서비스에서 Ghost를 어떻게 설치하는지 자세히 알아볼 수 있습니다.

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - 출처: [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - 출처: [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - 출처: [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - 출처: [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - 출처: [Gregg Housh](http://0v.org/)
*   ... [설치과정 관련 게시판installation forum](https://en.ghost.org/forum/installation)에도 참고할 정보가 있습니다.

## Ghost 접속상태 유지하기

지금까지 설명한 Ghost 설치 방법은 'npm start'입니다. 이것은 로컬에서 프로그램을 개발하고 테스트해보기에는 좋은 방법이지만, 도스창에서 커맨드라인 입력하는 방식으로 Ghost를 시동하게 되면 여러분이 터미널 창을 종료하거나 SSH 접속을 종료할 때마다 Ghost는 작동을 중단하게 될 겁니다. Ghost가 중단되지 않도록 하기 위해서 여러분은 Ghost를 하나의 서비스로 운영해야 하죠. 방법은 두 가지가 있습니다.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Ghost를 백그라운드 작업으로 실행하기 위해 `forever`를 사용할 수 있습니다. `forever`는 또한 Ghost가 충돌으로 인해 종료되었을 때 다시 실행해 줍니다.

*   `forever`를 설치하시려면 `npm install forever -g`를 입력하세요.
*   `forever`를 이용하여 Ghost를 실행하시려면 Ghost 설치 디렉토리에서 `NODE_ENV=production forever start index.js`를 입력하세요.
*   Ghost를 종료하시려면 `forever stop index.js`를 입력하세요.
*   Ghost가 현재 실행 중인지 확인하시려면 `forever list`를 입력하세요.

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Fedora, Debian, Ubuntu와 같은 많이 사용되는 Linux 배포판에는 Supervisor라는 패키지가 있습니다. Supervisor는 프로세스 관리 시스템으로 init 스크립트의 사용 없이 Ghost를 실행할 수 있도록 해 줍니다. init 스크립트와 달리, Supervisor 스크립트를 작성하는 방법은 Linux 배포판 및 버전에 상관없이 동일합니다.

*   [Supervisor를 설치](http://supervisord.org/installing.html)하세요. 각 Linux 배포판에 따른 설치 방법은 다음과 같습니다.
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   다른 대부분의 Linux 배포판: `easy_install supervisor`
*   `service supervisor start`를 실행하셔서 Supervisor가 실행되어 있는지 확인하세요.
*   Ghost 시작 스크립트를 작성하세요. 대체로 이는 `/etc/supervisor/conf.d/ghost.conf`에 다음과 같이 작성합니다.

    ```
    [program:ghost]
    command = node /path/to/ghost/index.js
    directory = /path/to/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   Supervisor로 Ghost를 실행하시려면 `supervisorctl start ghost`를 입력하세요.
*   Ghost를 종료하시려면 `supervisorctl stop ghost`를 입력하세요.

더 많은 정보를 위해 [Documentation for Supervisor](http://supervisord.org)를 확인할 수 있습니다.

### Init 스크립트 <a id="init-script"></a>

Linux 시스템은 소프트웨어나 서비스를 부팅 시 실행하기 위해 init 스크립트를 사용합니다. 이러한 스크립트는 /etc/init.d에 위치합니다. Ghost를 영구적으로 실행하기 위해서, 또 재부팅 시에도 다시 실행되도록 하기 위해서 init 스크립트를 사용할 수 있습니다. 아래의 예는 Ubuntu에서 작동할 것이며 **Ubuntu 12.04**에서 테스트되었습니다.

*   다음 명령어를 이용하여 /etc/init.d/ghost 파일을 만드세요.

    ```
    $ sudo curl https://raw.github.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   `nano /etc/init.d/ghost`로 파일을 열고 다음을 확인하세요.
*   `GHOST_ROOT` 변수의 값을 Ghost를 설치한 디렉토리로 수정하세요.
*   `DAEMON` 변수의 값이 `which node` 명령어를 실행했을 때의 결과값과 같은지 확인하세요.
*   Ghost를 실행할 사용자와 그룹을 만드세요.

    ```
    $ sudo useradd -r ghost -U
    ```

*   Ghost 계정이 설치 디렉토리에 접근할 수 있도록 하세요.

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   다음 명령어를 입력하여 init 스크립트의 실행 권한을 수정하세요.

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   이제 다음 명령어를 이용하여 Ghost를 관리할 수 있습니다.

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Ghost가 부팅 시 실행되도록 하려면 시작 스크립트에 등록해야 합니다.
    다음 두 명령어를 커맨드 라인에 입력하세요:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   마지막으로 여러분의 사용자가 config.js와 같은 파일을 수정할 수 있도록 ghost 그룹에 여러분의 사용자를 추가하세요.
    ```
    $ sudo adduser USERNAME ghost
    ```

*   서버를 다시 시작하면 Ghost가 이미 실행되어 있을 것입니다.

## 도메인과 Ghost 연결 <a id="nginx-domain"></a>

Ghost가 영구적으로 실행되도록 설정했다면 웹 서버를 프록시로 설정함으로써 도메인과 Ghost를 연결할 수 있습니다.
이 예제에서 저희는 여러분이 OS로 **Ubuntu 12.04**를, 웹 서버로 **nginx**를 사용한다고 가정합니다.
또한 Ghost가 위에 언급된 방법 중 하나로 백그라운드에서 실행되고 있다고 가정합니다.

*   nginx 설치

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">이 명령어는 nginx를 설치하고 기본적인 설정을 끝마칩니다.</span>

*   사이트 설정

    *   새 `/etc/nginx/sites-available/ghost.conf` 파일을 만드세요.
    *   텍스트 편집기로 파일을 열고(e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`) 다음을 복사하여 붙여넣으세요.

        ```
        server {
            listen 80;
            server_name example.com;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```

    *   `server_name`을 사용할 도메인의 이름으로 바꾸세요.
    *   다음 명령어를 입력하여 설정을 `sites-enabled`에 심볼릭 링크하세요.

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   nginx 다시 시작

    ```
    $ sudo service nginx restart
    ```

## SSL을 사용하도록 Ghost 설정 <a id="ssl"></a>

도메인과 Ghost를 연결했다면 관리자 인터페이스, 혹은 블로그 전체를 HTTPS를 이용하여 안전하게 보호하는 것이 좋습니다. 특히 HTTPS 설정 없이는 계정 이름과 비밀번호와 같은 중요한 정보가 암호화되지 않고 평문으로 전송되기 때문에 관리자 인터페이스만큼은 안전하게 보호해야 합니다.

다음 예제는 어떻게 서버에 SSL을 설정하는지 설명합니다. 저희는 여러분이 이 가이드를 계속해서 따라왔고 프록시 서버로서 nginx를 사용하고 있다고 가정합니다. 다른 프록시 서버에서의 설정도 이와 비슷할 것입니다.

가장 먼저 해야 할 것은 신뢰할 수 있는 제공자로부터 SSL 인증서를 받는 것입니다. 여러분이 선택한 제공자는 어떻게 여러분의 개인 키와 CSR(certificate signing request)를 만들 수 있는지 설명해줄 것입니다. 인증서 파일을 받은 후에는 CSR을 발행하면서 생성된 인증서 제공자로부터의 CRT 및 KEY 파일을 서버에 복사하여야 합니다.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

복사가 끝난 후에는 nginx 설정을 업데이트해야 합니다.

*   텍스트 편집기로 nginx 설정 파일을 여세요. (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   +로 표시된 설정을 설정 파일에 추가하세요.

    ```
     server {
         listen 80;
    +    listen 443 ssl;
         server_name example.com;
    +    ssl_certificate        /etc/nginx/ssl/server.crt;
    +    ssl_certificate_key    /etc/nginx/ssl/server.key;
         ...
         location / {
    +       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    +       proxy_set_header Host $http_host;
    +       proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:2368;
            ...
         }
     }
    ```

    *   nginx를 재시작하세요.

    ```
    $ sudo service nginx restart
    ```

이러한 과정이 끝난 후에 여러분은 보안 HTTPS 연결을 통해 관리자 영역에 접근할 수 있을 것입니다. 모든 트래픽이 SSL을 사용하도록 강제하고 싶다면 config.js의 URL 설정을 HTTPS로 바꿔야 합니다(e.g. `url: 'https://my-ghost-blog.com'`). 이는 프론트엔드 및 관리자 영역에서 SSL을 사용하도록 강제할 것입니다. HTTP로 전송된 모든 요청은 HTTPS로 리다이렉트될 것입니다. HTTP 도메인을 사용하는 사이트의 이미지를 블로그 글에 추가했을 때 '안전하지 않은 콘텐츠' 경고가 나타날 것입니다. HTTP 도메인을 사용하는 사이트로부터의 스크립트 및 폰트는 작동을 멈출 것입니다.

대부분의 경우 여러분은 관리자 인터페이스에는 SSL을 강제하고 프론트엔드 서비스는 HTTP를 통해 제공하고 싶을 것입니다. 관리자 영역에 SSL을 강제하기 위해서는 `forceAdminSSL: true`를 사용하세요.

프록시 서버에서 SSL을 어떻게 설정하는지에 관한 더 많은 정보를 얻고 싶으시다면 [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html)와 [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html)의 SSL documentation을 참조하세요.
