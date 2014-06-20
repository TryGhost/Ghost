---
lang: ko
layout: mail
meta_title: Ghost 이메일 설정 - Ghost 가이드
meta_description: 이메일 서버를 구성하고 Ghost 플랫폼이 이메일을 보낼 수 있도록 설정하는 방법을 설명합니다.
heading: Ghost 이메일 설정
chapter: mail
---

## 이메일 설정 <a id="email-config"></a>

아래에서는 Ghost가 이메일을 보낼 수 있도록 설정하는 방법을 설명합니다. Ghost는 [Nodemailer](https://github.com/andris9/Nodemailer)를 사용하며, Nodemailer의 문서는 더 많은 예제를 포함하므로 참고해 보시기 바랍니다.

### 이메일 설정을 해야 하는 이유가 무엇인가요?

PHP를 이용한 개발에 익숙하신 분들은 이메일 설정이 필요한 이유를 잘 모르실 수 있습니다. Node.js는 PHP와 조금 다르며, 만들어진 지 얼마 되지 않았기 때문에 조금 설정이 필요합니다.

이 설정은 한 번만 설정해 주면 끝나는 일이니 걱정하지 마세요. 아래에서 자세히 설명해 드리겠습니다.

### 이메일 설정은 반드시 필요한가요?

현재로서 Ghost가 이메일을 보내는 경우는 여러분이 비밀번호를 잊었을 때 새 비밀번호를 요청하는 경우뿐입니다. 별로 대단한 경우는 아니지만 필요할 때 작동하지 않으면 곤란합니다.

미래에, Ghost는 이메일 구독이나 새 사용자들에게 이메일로 계정 정보를 전송하는 것과 같은 기능을 지원하게 될 것입니다. 이러한 기능을 위해서는 이메일 설정이 반드시 필요합니다.

## 어떻게 이메일을 설정할 수 있나요? <a id="how-to"></a>

우선 이메일 전송 서비스의 계정이 필요합니다. 이 때 Mailgun을 사용하시는 것을 강력히 추천합니다. Mailgun 무료 계정은 대부분의 블로그에게 충분한 이메일 전송량을 제공합니다. 물론 Gmail이나 Amazon SES를 사용할 수도 있습니다.

어떤 이메일 서비스를 사용할지 결정하셨다면 Ghost 설정 파일에 이메일 설정을 추가하셔야 합니다. Ghost가 설치된 디렉토리를 보시면 루트 디렉토리에서 <code class="path">config.js</code> 파일과 <code class="path">index.js</code>를 발견하실 수 있을 것입니다. <code class="path">config.js</code>를 찾을 수 없다면 <code class="path">config.example.js</code> 파일을 복사하시고 이름을 바꾸세요.

### Mailgun <a id="mailgun"></a>

[mailgun.com](http://www.mailgun.com/)으로 이동하시고 계정을 만드세요. 이메일 주소와 도메인 이름, 또는 서브 도메인 이름을 제공해야 합니다. 여러분은 설정을 나중에 변경할 수 있으므로 블로그의 이름과 유사한 서브 도메인을 적당히 등록해도 됩니다.

Mailgun에서 여러분의 이메일 주소가 유효한지 확인이 끝나면 제어판에 접근할 수 있습니다. 이제 오른쪽에 위치한 여러분의 도메인 이름을 클릭함으로써 Mailgun이 생성한 이메일 서비스 계정 이름과 비밀번호를 확인하셔야 합니다. 이 때의 계정 이름과 비밀번호는 여러분이 가입 시 입력한 것과 다른 것이므로 주의하세요. 아래의 동영상을 확인하셔서 자세한 방법을 확인하실 수 있습니다.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Mailgun details" width="100%" />

이제 모든 Mailgun에서의 설정이 끝나고 Ghost에서의 설정만 남았습니다. <code class="path">config.js</code> 파일을 여시고 development 및 production 환경의 이메일 설정을 다음과 같이 수정하세요.

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

그리고 Mailgun의 'Login' 항목의 값을 'user'에, 'Password' 항목의 값을 'pass'에 복사하세요. 예를 들어 위 동영상에 나온 'tryghosttest' 계정의 설정은 다음과 같습니다.

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

콜론(:)과 따옴표('), 중괄호({})가 제대로 위치해 있는지 확인하세요. 잘못된 위치에 있다면 오류가 발생할 것입니다.

### 아마존 SES <a id="ses"></a>

<http://aws.amazon.com/ses/>에서 Amazon Simple Email Service에 가입할 수 있습니다. 가입이 끝나면 액세스 키(Access Key)와 비밀 키(Secret)를 부여받으셨을 것입니다.

<code class="path">config.js</code> 파일을 여시고 development 및 production 환경의 이메일 설정을 다음과 같이 수정하세요. AWSACCESSKEY와 /AWS/SECRET를 각각 액세스 키 값와 비밀 키 값으로 수정하셔야 합니다.

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

기본적으로 Ghost가 보내는 이메일의 발신 주소로 Ghost의 일반 설정 페이지에 설정된 이메일 주소가 사용됩니다. 발신 주소를 다른 주소로 수정하시고 싶다면 다음과 같이 <code class="path">config.js</code>에 설정을 추가할 수 있습니다.

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
