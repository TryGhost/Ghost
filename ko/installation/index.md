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

## 개요 <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Ghost 문서는 작업중인 부분이 많으며 지속적으로 개선되고 있습니다. 안내대로 진행이 안 되거나 개선할 부분이 있으면 알려주시기 바랍니다.

Ghost는 [Node.js](http://nodejs.org)를 이용해 만들었으며, Node.js의 `0.10.*`(최신 안정 버전)이 필요합니다.

Ghost를 로컬 컴퓨터에서 실행하는 것은 쉽긴 하지만, 먼저 Node.js를 설치해야 합니다.

### Node.js란?

[Node.js](http://nodejs.org)는 효율적이고 확장성 있는 웹 애플리케이션을 빠르게 만들 수 있도록 해주는 현대적 플랫폼입니다.
    지난 20여 년 동안 웹은 정적 페이지의 모음에서 쥐메일, 페이스북 같은 복잡한 웹 애플리케이션을 제공할 수 있는 플랫폼으로 발전했습니다.
    자바스크립트는 이런 발전을 가능하게 한 프로그래밍 언어입니다.

[Node.js](http://nodejs.org)를 이용하면 서버에서 자바스크립트 프로그램을 작성할 수 있게 됩니다. 과거에는 자바스크립트가 브라우저에서만 실행되었고, 서버쪽에서는 PHP와 같은 다른 언어로 프로그램을 작성해야 했습니다. 한 가지 프로그래밍 언어로 웹 애플리케이션을 작성하는 것은 큰 장점이 될 수 있으며, Node.js로 인해 전통적으로 클라이언트 쪽에서만 머물었을 개발자들이 서버쪽에도 접근할 수 있게 되었습니다.

[Node.js](http://nodejs.org)에서 사용한 방식은, 구글 크롬 브라우저의 자바스크립트 엔진을 감싸 어느 곳에든 설치할 수 있게 한 것입니다. 즉, 자신의 컴퓨터에 Ghost를 설치해 쉽고 빠르게 사용해볼 수 있습니다.
다음 절에서는 [맥]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/) 또는 [윈도우]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/), [리눅스]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/)에 설치하는 방법을 설명합니다. Ghost를 [서버 또는 호스팅]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy)에 배포하는 데에도 도움이 될 것입니다.

### 시작하기

안내에 따라 Node.js와 Ghost를 직접 설치하고 싶지 않은 사용자를 위해 [BitNami](http://bitnami.com/)에 있는 훌륭한 분들이 모든 주요 플랫폼에 대한 [Ghost 인스톨러](http://bitnami.com/stack/ghost)를 만들었습니다.

Ghost를 설치할 운영체제를 선택하세요.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

이미 Ghost를 자신의 서버나 호스팅 계정에 배포하기로 결심했나요? 훌륭합니다! 다음 문서에서 수작업 설치부터 원클릭 인스톨러까지 다양한 Ghost 배포 옵션을 설명합니다.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Ghost 실행하기</a>
</div>

Ghost는 완전 새로운 것이고 개발팀도 아주 열심히 일하고 있습니다. Ghost를 최신 버전으로 업그레이드 해야 할 경우는 [업그레이드 문서](/installation/upgrading/)를 참고하시기 바랍니다.
제대로 진행되지 않으면 [문제해결 가이드]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)를 확인하고, 그래도 해결되지 않는 경우에는 [Ghost 포럼](http://ghost.org/forum)을 참고하기 바랍니다. Ghost 개발팀과 커뮤니티가 여러분의 문제를 해결할 수 있도록 도와줄 것입니다.
