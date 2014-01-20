---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 한국어 가이드
meta_description: 블로깅 플래폼 Ghost를 여러분의 로컬 및 원격에서 설정하는 방법입니다.
heading: Ghost 설치 시작하기
subheading: 여러분의 새로운 블로그를 설정하기 위한 첫 번째 단계입니다.
chapter: installation
next_section: mac
---

## 일러두기 <a id="overview"></a>

Ghost 설명서는 현재 계속 작성되는 중인 관계로, 정기적으로 업데이트 되어 개선되고 있습니다. 어려움이 있거나 제안 사항이 있으시면 알려주세요.

Ghost는 [Node.js](http://nodejs.org) 기반이며, `0.10.*`버전(최신 안정화 버전)이 필요합니다.

Ghost를 여러분의 컴퓨터에 로컬로 설치하는 것은 무척 간단하지만, 일단 Node.js를 먼저 설치해주셔야 합니다. 

### Node.js가 무엇입니까?

[Node.js](http://nodejs.org)는 보다 빠르고, 유연하며, 효율적인 웹 애플리케이션을 제작하기 위한 최신 플래폼입니다. 

지난 20년간, 웹은 정적인 페이지의 집합에서 벗어나 Gmail이나 Facebook처럼 복잡한 웹 애플리케이션을 지원할 수 있는 플래폼으로 변화했습니다. 

JavaScript는 이런 발전을 가능하게 해준 프로그래밍 언어였죠.

[Node.js](http://nodejs.org)를 사용하면 이제 서버 상에서 JavaScript를 사용할 수 있게 됩니다. 과거에는 JavaScript는 단지 브라우저 안에 내장된 것이었고, 서버 측에는 PHP와 같은 별도의 프로그래밍 언어가 필요했었죠. 그런데 어떤 하나의 웹 애플리케이션이 단일한 프로그래밍 언어로만 구성되면 매우 유리하다는 이유로, 이전 같으면 클라이언트(브라우저) 쪽에 머물러 있었을 개발자들이 Node.js를 건드려보게 되었습니다.

[Node.js](http://nodejs.org)가 이 작업에 적절했던 것은, 구글의 크롬 브라우저에 있는 JavaScript 엔진을 통째로 포장해서 다른 곳에 심어 설치할 수 있도록 해주기 때문입니다. 다시 말하면 여러분은 매우 빠르고 간편하게 Ghost를 여러분의 컴퓨터에 설치하고 시험해볼 수 있다는 것이죠.

아래 섹션에서는 Ghost를 로컬에 있는 [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/), [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) 에 설치하거나 아니면 [서버/호스팅]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) 계정에 Ghost를 올려 구동하는 방법을 다룰 것입니다.

### 시작하기

만약 아래 안내에 따라 Node.js와 Ghost를 수동으로 설치하는 방법이 내키지 않으시면, [BitNami](http://bitnami.com/)의 친절한 이용자들이 만들어 배포한 [Ghost installers](http://bitnami.com/stack/ghost)를 사용해보세요. 모든 주요 플래폼을 지원합니다. 

여러분이 Ghost를 설치하기 원하는 곳은?:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

혹시 Ghost를 여러분의 서버나 호스팅 계정으로 올리기로 이미 마음 먹으셨나요? 좋습니다! 아래 설명을 따라오시면 수동 설치과정에서부터 원클릭 설치프로그램에 이르기까지 상세히 배울 수 있습니다. 


<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Ghost 설치/시동하기</a>
</div>

Ghost는 이제 막 새로나온 도구이고, 개발팀은 구슬땀을 흘리며 계속 새로운 기능을 구현하기 위해 노력하고 있다는 점을 알아주시기 바랍니다. Ghost를 최신 버전으로 업그레이드하려면 [upgrading documentation](/installation/upgrading/)을 참고하세요.

  문제가 발생한 경우에,  [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)를 참고하십시오. 해당 문서에서 도움을 받지 못한 경우에는  [Ghost forum](http://ghost.org/forum)에 직접 질문을 올려주세요. 포럼에 있는 Ghost 직원을 포함해서 사용자들이 여러분을 도울 것입니다. 
