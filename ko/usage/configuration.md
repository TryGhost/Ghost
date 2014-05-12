---
lang: ko
layout: usage
meta_title: Ghost 사용 방법 - Ghost 가이드
meta_description: Ghost 사용 방법을 설명합니다. Ghost는 설치했는데, 어떻게 사용해야 할지 모르시겠나요? 여기를 참조해보세요.
heading: Ghost 사용 방법
subheading: Ghost를 자신에 맞게 설정하고 이용하는 방법에 대해 소개합니다.
chapter: usage
section: configuration
permalink: /ko/usage/configuration/
prev_section: usage
next_section: settings
---

## 구성 설정 <a id="configuration"></a>

Ghost를 처음으로 실행한 후, 여러분은 Ghost가 설치된 루트 디렉토리에서 `index.js`와 함께 있는 `config.js` 파일을 발견하실 수 있을 것입니다. 이 파일을 편집함으로써 여러분은 블로그 URL, 데이터베이스, 이메일과 같은 설정을 변경하실 수 있습니다.

아직 Ghost를 한 번도 실행한 적이 없다면 `config.js` 파일이 자리에 없을 것입니다. `config.example.js` 파일을 복사하고 이름을 바꿔서 파일을 만드세요. (이는 Ghost가 처음으로 실행될 때 수행하는 작업 중 하나입니다.)

블로그 URL, 이메일, 데이터베이스 설정을 변경하시려면 `config.js` 파일을 선호하는 텍스트 편집기로 여시고 환경에 알맞게 설정을 수정하세요. 환경이 무엇인지 잘 모르시겠따면, 아래의 [환경에 대한 설명](#environments)을 참조하세요.

## 설정 옵션

Ghost는 Ghost가 작동하는 방법을 바꿀 수 있는 많은 수의 설정 옵션을 제공합니다.

### 이메일

Ghost 설정에 있어서 가장 중요한 부분은 아마 비밀번호를 잊어버렸을 때 다시 설정할 수 있는 옵션을 제공해 주는 이메일일 것입니다. 이메일 설정에 관한 더 많은 정보를 위해서는 [이메일 설정 가이드]({% if page.lang %}/{{ page.lang }}{% endif %}/mail)를 참조하세요.

### 데이터베이스

기본적으로, Ghost가 사용하는 데이터베이스는 SQLite이며 별다른 설정이 필요하지 않습니다.

하지만 만약 여러분이 MySQL 데이터베이스를 사용하는 것을 더 선호하신다면 다음과 같이 설정을 변경하시면 됩니다. 반드시 데이터베이스와 사용자를 먼저 만드신 후 설정을 변경하세요.

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

또한 `pool` 설정을 변경함으로써 동시 접속 수를 제한하실 수 있습니다.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### 서버

server 항목의 host와 port는 Ghost가 요청을 받는 IP 주소와 포트입니다.

다음과 같이 설정을 변경함으로써 Ghost가 유닉스 소켓으로 요청을 받도록 할 수 있습니다.

```
server: {
    socket: 'path/to/socket.sock'
}
```

### 업데이트 확인

Ghost 0.4부터는 새 버전의 Ghost가 나왔을 때 알림을 띄우도록 할 수 있습니다. Ghost.org는 업데이트 확인 요청을 받으면서 기본적인 사용 통계를 익명으로 수집합니다. 더 많은 정보를 위해 Ghost core의 [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) 파일을 확인하세요.

다음과 같이 설정을 수정함으로써 업데이트 확인과 익명 데이터 수집 기능을 끌 수 있습니다.

`updateCheck: false`

설정을 바꿔도 새 버전에 대한 알림을 받을 수 있도록 Ghost 이메일 또는 [Ghost 블로그](http://blog.ghost.org)를 구독해 주세요.

### 파일 저장소

Heroku와 같은 몇몇 플랫폼은 고정적 파일 시스템을 가지고 있지 않습니다. 따라서 업로드된 이미지는 얼마 후 유실될 확률이 높습니다.
다음 설정을 수정함으로써 Ghost의 파일 저장소 기능을 비활성화시킬 수 있습니다.

`fileStorage: false`

파일 저장소 기능이 비활성화되면 Ghost는 기본적으로 이미지를 업로드할 때 URL을 입력하도록 할 것입니다. 이를 통해 실수로 이미지를 업로드하는 것을 방지할 수 있습니다.

## 환경에 대하여 <a id="environments"></a>

Node.js와 Ghost에는 환경(Environment)에 대한 개념이 포함되어 있습니다. 환경은 여러분이 여러 상황에 맞는 각각의 설정을 만들 수 있도록 해 줍니다. 기본적으로 Ghost에는 **development**과 **production**의 2가지 환경이 있습니다.

두 환경은 거의 차이가 없습니다. 기본적으로 **development** 환경은 개발을 위한 환경으로 특히 디버깅을 할 때 사용합니다. 반면 **production** 환경은 여러분이 사람들에게 Ghost를 공개할 때 사용하는 환경입니다. 이 두 환경의 차이는 로그 및 에러 메시지가 표시되는지 여부와 얼마나 정적 파일이 압축되었는지 정도입니다. 예를 들어, 관리자 화면의 기능을 구현하기 위해 **production** 환경에서는 압축된 1개의 자바스크립트 파일이 사용되는 반면 **development** 환경에서는 여러 개의 자바스크립트 파일이 사용됩니다.

Ghost가 점점 발전하면서, 두 환경 사이의 차이는 점점 커지고 눈에 보이게 될 것입니다. 따라서 공개된 블로그가 **production** 환경을 사용하는 것은 점점 중요해질 것입니다. 그렇다면 사람들은 **production** 환경에서 Ghost를 실행하고 싶어할 텐데 왜 **development** 환경이 기본 설정일까요? 이는 여러분이 블로그를 처음 설정할 때 필요한 디버깅 작업에 있어서 **development** 환경이 최적이기 때문입니다.

## 환경 사용 <a id="using-env"></a>

Ghost를 development가 아닌 다른 환경에서 실행하기 위해서는 환경 변수를 사용해야 합니다. 예를 들어 여러분이 보통 `node index.js`로 Ghost를 실행한다면 다른 환경에서 Ghost를 실행하기 위해서 다음과 같이 명령을 입력하면 됩니다.

`NODE_ENV=production node index.js`

아니면 여러분이 보통 forever를 이용하여 Ghost를 실행한다면 다음과 같이 명령을 입력하면 됩니다.

`NODE_ENV=production forever start index.js`

혹은 여러분이 `npm start`를 이용하여 Ghost를 실행하는 데에 익숙해져 있다면 다음과 같이 명령을 입력하세요.

`npm start --production`

### 왜 설치 시 `npm install --production`을 사용하도록 하나요?

Ghost가 기본적으로 development 환경에서 실행된다면 왜 설치 가이드에서 `npm install --production`을 사용하도록 하는지에 관한 질문을 많이 받았습니다. 이는 `--production`을 포함하지 않고 설치 시 Ghost를 실행하게 된다면 Ghost core를 디버깅하기 위한 수많은 추가 패키지가 설치되기 때문입니다. 또한 `--production` 없이 Ghost를 실행한다면 추후 `npm install -g grunt-cli` 명령어를 이용하여 global 환경에 `grunt-cli`를 설치하는 과정도 필요합니다. 이는 Ghost를 블로그로 사용하고 싶어하는 일반적인 사람에게는 불필요한 작업입니다.

