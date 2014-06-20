---
lang: ko
layout: usage
meta_title: Ghost 사용 방법 - Ghost 가이드
meta_description: Ghost 사용 방법을 설명합니다. Ghost는 설치했는데, 어떻게 사용해야 할지 모르시겠나요? 여기를 참조해보세요.
heading: Ghost 사용 방법
subheading: Ghost를 자신에 맞게 설정하고 이용하는 방법에 대해 소개합니다.
chapter: usage
section: writing
permalink: /ko/usage/writing/
prev_section: managing
next_section: faq
---

##  글 작성 <a id="writing"></a>

Ghost 블로그의 글은 Markdown을 이용하여 작성됩니다. Markdown은 문서의 형식을 갖추기 위해 특수문자를 이용하는 간단한 구문입니다. Markdown은 글 작성 흐름을 방해하지 않도록 설계되었기 때문에, 여러분은 이를 사용함으로써 글의 외형보다는 내용에 더욱 집중할 수 있습니다.

###  Markdown 가이드 <a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/)은 가독성을 유지하면서도 글 작성의 효율을 높이도록 설계된 마크업 언어입니다.

Ghost는 Markdown의 모든 기본 구문을 지원하며, 이에 몇 가지 독자적인 구문을 더했습니다. 아래에서 사용하실 수 있는 구문 목록을 확인하실 수 있습니다.

####  제목

텍스트 앞에 '#'를 추가하는 것으로 대제목이나 소제목을 만들 수 있습니다. 앞에 붙는 '#'의 숫자가 많아질수록 점점 글자가 작아지고 강조 정도가 약해집니다. 총 6개의 단계가 있습니다.

*   H1 : `# 제목 1`
*   H2 : `## 제목 2`
*   H3 : `### 제목 3`
*   H4 : `#### 제목 4`
*   H5 : `##### 제목 5`
*   H6 : `###### 제목 6`

####  텍스트 꾸미기

*   링크: `[링크 텍스트](URL)`
*   굵게: `**굵게**`
*   기울임: `*기울임*`
*   문단: 문단 사이의 빈 줄로 구분합니다.
*   목록: `* 각 목록 항목 앞에 별표(*) 추가`
*   인용: `> 인용문`
*   코드: `` `코드` ``
*   가로줄: `==========`

####  이미지

글에 이미지를 추가하기 위해서는 우선 글 작성 화면에서 `![]()`를 입력하세요.
미리보기 패널에 이미지 업로드 상자가 나타날 것입니다.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

이제 .png, .gif, .jpg 형식의 이미지를 상자에 드래그 앤 드롭하여 이미지를 업로드할 수 있습니다. 또는 상자를 클릭하셔서 이미지 업로드 팝업을 통해 이미지를 업로드하실 수도 있습니다.
이미지 URL을 통해 사진을 추가하시고 싶으시다면 상자 왼쪽 아래에 위치한 링크 아이콘을 클릭하세요. 이미지 URL 입력 텍스트 상자가 나타날 것입니다.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

이미지에 제목을 추가하려면 대괄호 사이에 텍스트를 입력하세요. (e.g. `![제목 텍스트]()`)

##### 이미지 제거

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

이미지를 제거하시려면 이미지 오른쪽 위에 위치한 휴지통 모양의 제거 아이콘을 클릭하세요. 해당 위치에 다시 이미지를 삽입할 수 있도록 빈 이미지 업로드 상자가 나타날 것입니다.

