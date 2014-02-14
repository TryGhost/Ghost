---
lang: ko
layout: mail
meta_title: Ghost Mail Configuration - Ghost Docs
meta_description: How to configure your email server and send emails with the Ghost blogging platform. Everything you need to know.
heading: Setting up Email
chapter: mail
---


## 메일 설정 <a id="email-config"></a>
다음은 Ghost에서 메일을 설정하는 방법을 설명합니다.
Ghost는 [Nodemailer](https://github.com/andris9/Nodemailer)를 사용하는데, Nodemailer 문서에는 더 많은 예제가 있습니다.

### 잠깐, 뭐라고요?

PHP에서는 아마 메일이 호스트 플랫폼에서 알아서 잘 됐을 겁니다. Node는 조금 다릅니다. Node는 새롭고 반짝반짝 빛나지만 일부 가장자리는 거친 부분이 있습니다.

그렇지만 겁내지는 마세요. 메일을 설정하는 것은 한 번만 하면 되고 여기서 자세히 설명할 테니까요.


### 그렇지만 왜?

Ghost가 이메일을 사용하는 경우는 여러분이 패스워드를 잊어버려 새 패스워드를 이메일로 보낼 때 뿐입니다. 이런 경우는 많지 않겠지만, 이 기능을 과소평가 하지는 말기 바랍니다. 이게 정말 필요할 때도 있을테니까요.

Ghost는 추후 블로그에 대한 이메일 기반 구독도 지원할 예정입니다.
또한 Ghost는 추후 이메일 기반 블로그 구독 설정을 지원할 예정입니다. 이메일을 보낼 수 있어야 새로운 사용자에게 계정 정보를 이메일로 보내는 등의 기능을 사용할 수 있습니다.


## 자, 이제 어떻게 하죠? <a id="how-to"></a>

먼저 메일 서비스 계정이 필요합니다. 우리는 Mailgun을 추천합니다. Mailgun은 대부분의 이메일 구독 기반 블로그가 관리할 수 있는 것보다도 많은 메일을 보낼 수 있는 무료 시작 계정을 제공합니다. 물론 Gmail이나 아마존 SES를 사용할 수도 있습니다.

어떤 메일 서비스를 사용할지 결정했다면, Ghost 설정 파일을 편집할 차례입니다. Ghost를 설치했을때는 언제나 루트 디렉터리에서 <code class="path">config.js</code>와 <code class="path">index.js</code> 파일을 찾아야 합니다. 아직 <code class="path">config.js</code> 파일이 없다면 <code class="path">config.example.js</code>를 복사한 다음 이름을 바꾸면 됩니다.

### Mailgun <a id="mailgun"></a>

[mailgun.com](http://www.mailgun.com/)에 가서 계정을 만듭니다. 한 달에 10,000통까지 공짜로 메일을 보낼 수 있습니다. Mailgun 계정을 만들고 메일 주소를 인증한 다음 [로그인](https://www.mailgun.com/cp)합니다. Mailgun에서는 자신의 도메인 이름으로 메일을 보낼 수 있지만, 도메인이 없다면 간단히 Mailgun이 제공하는 서브도메인(또는 샌드박스 도메인)을 사용할 수도 있습니다. 설정을 나중에 바꿀 수 있으므로, 지금은 자동 생성된 서브도메인을 사용합니다.

Mailgun에서 생성한 메일 서비스의 사용자 이름과 패스워드가 필요한 경우 오른쪽에 있는 샌드박스 도메인을 클릭합니다. 세부사항을 이해하는데 도움이 되는 최신 스크린캐스트를 참고하기 바랍니다.

<img src="http://imgur.com/6uCVuZJ.gif" alt="Mailgun details" width="100%" />

이제 필요한 것을 모두 준비했으니, 설정 파일을 열 차례입니다. 에디터로 <code class="path">config.js</code> 파일을 열어 메일 설정 부분을 찾은 다음, 다음과 같이 메일 설정을 변경합니다.

```
mail: {
transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: '',
            pass: ''
        }
    }
}
```

Mailgun에서 'Login' 항목의 값을 복사해 'user' 항목 뒤에 있는 따옴표 안에 붙여넣고 Mailgun의 'Password' 항목 값을 복사해 'pass' 항목 뒤에 있는 따옴표 안에 붙여 넣습니다. 아마 다음과 같은 형식이 될 것입니다.

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: 'postmaster@tryghosttest.mailgun.org',
            pass: '25ip4bzyjwo1'
        }
    }
}
```

콜론과 따옴표, 중괄호 등을 빠뜨리지 않도록 주의하기 바랍니다. 하나라도 잘못 입력하면 이상한 에러가 발생할 것입니다.

개발 환경과 실 환경을 모두 갖고 있다면, 이 설정을 두 환경 모두에서 사용하는 것도 가능합니다.

### 아마존 SES <a id="ses"></a>

<http://aws.amazon.com/ses/>에서 아마존 Simple Email Service 계정을 만들 수 있습니다. 계정을 만들면 Access Key와 Secret이 주어질 것입니다.

에디터로 <code class="path">config.js</code> 파일을 열어 메일 설정 부분을 찾은 다음, 아래와 같이 아마존 Credential을 추가합니다.

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

### Gmail <a id="gmail"></a>

Ghost에서 메일을 보내는 데 Gmail을 사용하는 것도 가능합니다. Gmail을 이용하려면 개인 이메일 계정 대신 [새로운 계정을 생성](https://accounts.google.com/SignUp)해 사용하길 권고합니다.

새 계정을 생성했다면, <code class="path">config.js</code>에 설정을 추가할 수 있습니다. 에디터로 파일을 열어 메일 설정 부분을 찾은 다음 다음과 같이 수정하면 됩니다.

```
mail: {
    transport: 'SMTP',
    options: {
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### 보낸 사람 주소 <a id="from"></a>

Ghost가 보내는 메일의 보낸 사람 주소('from' address)는 일반 설정 페이지에서 지정한 이메일 주소가 사용될 것입니다. 이 설정을 다른 것으로 덮어쓰고 싶다면 <code class="path">config.js</code> 파일에서 설정할 수 있습니다.


```
mail: {
    fromaddress: 'myemail@address.com',
}
```
