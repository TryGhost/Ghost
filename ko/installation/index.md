---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
chapter: installation
next_section: mac
---

## 개관 <a id="overview"></a>

Ghost 가이드는 현재 아직 완성되지 않았으며, 수정을 거치며 개선되고 있습니다. 이용 중 문제가 있거나 개선할 점이 보이신다면 알려 주시기 바랍니다.

Ghost는 [Node.js](http://nodejs.org) 위에서 작동하며, `0.10.*`(최신 정식 버전)이 필요합니다.

Ghost를 여러분의 컴퓨터에서 실행하는 것은 간단하지만 Node.js를 먼저 설치하셔야 합니다.

### Node.js란 무엇인가요?

[Node.js](http://nodejs.org)는 빠르고, 가변적이며, 효과적인 웹 애플리케이션을 제작하기 위한 플랫폼입니다.
    지난 20년간, 인터넷은 정적 페이지의 묶음에서 Gmail과 페이스북과 같은 복잡한 웹 애플리케이션을 제작할 수 있는 플랫폼으로 변화해 왔습니다.
    자바스크립트는 이 과정을 가능하게 한 프로그래밍 언어입니다.

과거에 자바스크립트는 오직 브라우저에서만 실행이 가능했고, 서버 사이드 프로그래밍을 위해서는 PHP와 같은 또다른 프로그래밍 언어를 사용해야 했습니다. [Node.js](http://nodejs.org)는 자바스크립트를 서버에서 사용하는 것을 가능하게 합니다. 하나의 언어로만 구성된 웹 애플리케이션을 만들 수 있다는 것은 굉장한 이득이 됩니다. 예를 들어, 기존에 클라이언트 쪽에서 프로그래밍을 해 왔던 프로그래머들은 이제 Node.js를 이용하여 서버에서 개발을 진행할 수 있습니다.

[Node.js](http://nodejs.org)는 Google Chrome 웹 브라우저의 자바스크립트 엔진을 모든 곳에서 설치 및 사용할 수 있도록 함으로써 이를 가능하게 했습니다. 이는 여러분이 매우 쉽고 빠르게 Ghost를 여러분의 컴퓨터에 설치 및 사용할 수 있다는 것을 의미합니다.
    앞으로의 문서에서는 어떻게 Ghost를 [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) 또는 [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/)에 설치할 수 있는지에 대해 설명합니다. 이에 더하여 [외부 서버 혹은 호스팅 서비스]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy)에 Ghost를 설치하는 방법도 다룹니다.

### 시작하기

Node.js 및 Ghost를 직접 수동으로 설치하는 것을 선호하시지 않는다면, [BitNami](http://bitnami.com/)가 만든 [Ghost 설치 프로그램](http://bitnami.com/stack/ghost)을 이용해 보세요. 대부분의 주요 플랫폼에서 이용할 수 있습니다.

Ghost를 설치하시려는 플랫폼은 어디인가요?

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Ghost의 설치를 완료하셨거나 호스팅 서비스를 이용하실 예정이셔서 이제 배포 단계만 남았나요? 아래 문서는 수동 설치부터 설치 프로그램 사용까지 다양한 방법으로 어떻게 Ghost를 배포할 수 있는지 설명합니다.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Ghost 배포</a>
</div>

Ghost는 아직 만들어진 지 얼마 되지 않은 새 블로깅 플랫폼이며, 저희 팀은 여러 기능들을 추가하여 여러분이 더욱 편리하게 Ghost를 사용하실 수 있도록 노력하고 있습니다. Ghost를 최신 버전으로 업그레이드하고싶으신 분은 [업그레이드 가이드](/installation/upgrading/)를 참조해 주세요.
    설치 및 이용 중 갑자기 문제가 발생했나요? 이 경우에는 [문제 해결 가이드]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)를 확인하시거나 Ghost 개발진이 여러분을 도와 주는 [Ghost 포럼](http://ghost.org/forum)을 이용해 보세요.

