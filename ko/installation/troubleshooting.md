---
lang: ko
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ko/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# 문제 해결 및 FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin'이 $PATH에 없는 경우</dt>
    <dd>다음과 같이 추가할 수 있습니다:
        <ul>
            <li>터미널 윈도우에서 <code>cd ~</code>를 입력해, 홈 디렉터리로 이동합니다.</li>
            <li><code>ls -al</code>를 입력해 숨김 파일을 포함한 모든 파일과 폴더를 표시합니다.</li>
            <li><code class="path">.profile</code> 또는 <code class="path">.bash_profile</code>을 찾습니다. 해당 파일 없다면 <code>touch .bash_profile</code>을 입력해 파일을 생성합니다.</li>
            <li>그 다음, <code>open -a Textedit .bash_profile</code>을 입력해 Textedit으로 파일을 엽니다.</li>
            <li>파일 끝부분에 <code>export PATH=$PATH:/usr/local/bin/</code>을 추가한 다음 저장합니다.</li>
            <li>새로운 터미널을 시작해야 이 설정이 적용될 것입니다. 따라서, 새로운 터미널 탭이나 윈도우를 연 다음 <code>echo $PATH</code>를 입력해 '/usr/local/bin/' 가 있는지 확인하면 됩니다.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 doesn't install</dt>
    <dd>
        <p>SQLite3 패키지는 대부분의 아키텍처에 맞게 빌드된 바이너리가 있습니다. 인기가 많지 않은 리눅스 또는 유닉스를 사용한다면, SQLite3가 플랫폼에 맞는 적절한 바이너리를 찾지 못해 404 에러를 표시할 수 있습니다.</p>
        <p>이 문제는 SQLite3를 강제로 컴파일하도록 설정해 해결할 수 있습니다. 이렇게 하려면 python과 gcc가 필요합니다. <code>npm install sqlite3 --build-from-source</code>을 실행해 보기 바랍니다.</p>
        <p>빌드에 실패한다면 python이나 gcc 관련 모듈이 누락되어 그런 것일 수 있습니다. 리눅스에서는 소스로부터 빌드를 재시도하기 전에 <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code>와 <code>sudo apt-get install python-software-properties python g++ make</code>명령을 실행하기 바랍니다.</p>
        <p>빌드에 대한 자세한 사항은 <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a>를 참조하기 바랍니다.</p>
        <p>자신의 플랫폼에 맞는 바이너리 빌드에 성공했다면 다른 사용자가 동일한 문제를 겪지 않도록 <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">설명</a>을 참조해 node-sqlite 프로젝트에 바이너리를 제출하기 바랍니다.
    </dd>
    <dt id="image-uploads">이미지 업로드가 안 되는 경우</dt>
    <dd>
        <p>DigitalOcean Droplet에서 Ghost 버전 0.3.2를 사용하거나 또는 다른 플랫폼에서 nginx를 사용하는 경우 이미지 업로드가 안 되는 경우가 있습니다.</p>
        <p>실제로는 크기가 1MB 이상인 이미지가 업로드되지 않는 것입니다. (작은 크기의 이미지로 해보면 제대로 작동할 것입니다.) 1MB는 너무 작은 제한입니다.</p>
        <p>이 제한을 늘리려면 nginx 설정 파일을 편집해야 합니다.</p>
        <ul>
            <li>서버에 로그인한 다음, <code>sudo nano /etc/nginx/conf.d/default.conf</code>를 입력해 설정 파일을 엽니다.</li>
            <li><code>server_name</code>행 아래에, 다음 내용을 추가합니다. <code>client_max_body_size 10M;</code></li>
            <li><kbd>ctrl</kbd> + <kbd>x</kbd>를 눌러 Nano 에디터를 종료합니다. Nano 에디터가 저장할 것인지 물어보면 <kbd>y</kbd>를 누른 후, <kbd>enter</kbd>키를 눌러 파일을 저장합니다.</li>
        </ul>
    </dd>
</dl>
