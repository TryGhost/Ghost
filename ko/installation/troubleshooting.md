---
lang: example_translation
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 한국어 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 한국어 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# 문제 해결 및 FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">$PATH에 '/usr/local/bin'가 나타나지 않습니다</dt>
    <dd>다음 과정을 따라하세요.
        <ul>
            <li>터미널 창에 <code>cd ~</code>를 입력하셔서 홈 디렉토리로 이동하세요.</li>
            <li><code>ls -al</code>를 입력하셔서 해당 디렉토리에 위치한 모든 파일(숨겨진 파일 포함)을 표시하세요.</li>
            <li><code class="path">.profile</code> 또는 <code class="path">.bash_profile</code> 파일이 존재하는지 확인하세요. 만약 존재하지 않는다면 <code>touch .bash_profile</code>를 입력하셔서 새 파일을 만드세요.</li>
            <li>다음으로 <code>open -a Textedit .bash_profile</code>를 입력하셔서 텍스트 편집기로 파일을 여세요.</li>
            <li>파일의 끝에 <code>export PATH=$PATH:/usr/local/bin/</code>를 추가하시고 저장하세요.</li>
            <li>변경된 설정을 로드하기 위해 새 터미널 탭 혹은 창을 여세요. <code>echo $PATH</code>를 입력하셔서 '/usr/local/bin/' 문자열이 출력값에 존재하는지 확인하세요.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3가 설치되지 않습니다</dt>
    <dd>
        <p>SQLite3 패키지는 대부분의 자주 사용되는 플랫폼에 대한 바이너리 파일을 가지고 있습니다. 자주 사용되지 않는 Linux 혹은 다른 UNIX 계열 OS를 사용하고 계시다면 SQLite3가 해당되는 바이너리 파일을 가지고 있지 않아 404 에러를 출력할 수 있습니다.</p>
        <p>이 문제는 SQLite3를 강제로 컴파일함으로써 해결할 수 있습니다. 이를 위해서는 Python과 gcc가 필요합니다. <code>npm install sqlite3 --build-from-source</code>를 입력해 보세요.</p>
        <p>SQLite3가 컴파일되지 않는다면 이는 대부분 Python 혹은 gcc의 의존 패키지가 설치되지 않았기 때문입니다. 빌드 전 <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code>, <code>sudo apt-get install python-software-properties python g++ make</code>를 입력하시고 다시 시도해 보세요.</p>
        <p><a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a>에서 바이너리에 대한 더 많은 정보를 확인하실 수 있습니다.</p>
        <p>사용하시고 계신 플랫폼에 대한 바이너리 파일을 성공적으로 컴파일하셨다면 같은 문제가 또다시 발생하지 않도록 <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">이 과정</a>을 참조하셔서 해당 바이너리 파일을 node-sqlite 프로젝트에 보내 주세요.</p>
    </dd>
    <dt id="image-uploads">이미지 업로드가 되지 않습니다</dt>
    <dd>
        <p>Ghost 0.3.2 버전을 사용하시면서 DigitalOcean Droplet 설정을 사용하셨거나, 다른 플랫폼 위에서 nginx를 사용하시고 계셨다면, 이미지가 업로드되지 않는 문제가 발생할 수 있습니다.</p>
        <p>문제의 원인은 1MB 이상의 이미지를 업로드하지 못하도록 한 설정에 있습니다.</p>
        <p>이미지 업로드 제한을 올리시려면 nginx 설정 파일을 수정하셔야 합니다.</p>
        <ul>
            <li>서버에 로그인하시고 <code>sudo nano /etc/nginx/conf.d/default.conf</code>를 입력하셔서 설정 파일을 여세요.</li>
            <li><code>server_name</code> 줄 밑에 <code>client_max_body_size 10M;</code>을 추가하세요.</li>
            <li><kbd>Ctrl</kbd> + <kbd>x</kbd>를 누르셔서 프로그램을 닫으세요. 저장할까요? 라는 물음이 나타난다면 <kbd>y</kbd>를 입력하시고 <kbd>enter</kbd> 키를 누르셔서 수정 사항을 저장하세요.</li>
        </ul>
    </dd>
</dl>

