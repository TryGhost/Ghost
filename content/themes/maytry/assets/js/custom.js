(function($) {
  "use strict";

  // 文字数と予想時間
  $(".blog-container").each(function() {
    $(this).readingTime({
      readingTimeTarget: $(this).find(".eta"),
      wordCountTarget: $(this).find(".words"),
      lang: document.getElementsByTagName("html")[0].getAttribute("lang"),
      remotePath: $(this).attr("data-file"),
      remoteTarget: $(this).attr("data-target")
    });
  });

  // スクロールでヘッダーの色透過
  $(window).scroll(function() {
    if (640 < window.innerWidth) {
      var scVal = $(document).scrollTop();
      var rate = (Math.min(scVal, 120) / 160);
      // RGBA 値を設定
      $(".header").css('background-color', 'rgba(0, 0, 0, ' + rate + ')');
    }

    if(150 < scVal) {
      $(".header .row.collapse").removeClass("topbar");
      $(".header .row.collapse").addClass("multi-col");
      $(".header").addClass("full-width");
      $(".logo").addClass("left-side");
    } else {
      $(".header .row.collapse").removeClass("multi-col");
      $(".header .row.collapse").addClass("topbar");
      $(".header").removeClass("full-width");
      $(".logo").removeClass("left-side");
    }

  });

  // ______________ MOBILE MENU
  //$("#menu").slicknav();

  // ______________ SHARE BAR

  $('body').scrollspy({target: '.outline', offset: 1});
  if(640 < window.innerWidth && 0 < $('.outline').size()) {
    $('.outline').scrollChaser({
      wrapper: '.blog-container',
      offsetTop: window.innerWidth <= 640 ? -5 : 65,
      offsetBottom: 5,
      absolute: true
    });
    if(379 < $('.outline').innerHeight()) {
      $('.outline').css("height", "379");
    }
  }
  $('.outline ul').addClass('nav');

  if(0 < $('.share-side-bar').size()) {
    $('.share-side-bar').scrollChaser({
      wrapper: '.blog-container',
      offsetTop: window.innerWidth <= 640 ? -5 : 65,
      absolute: true
    });
  }

  // Youtube画像をクリック時に動画に変える
  $(".youtube").click(function(e) {
    // 画像のsrcを取得
    var y_img = $(this).attr("src");
    // 動画IDを抽出
    var id = y_img.slice(23, y_img.lastIndexOf("/") + 0);
    // 画像をiframeに置き換え
    $(this).hide().parent().html('<iframe width="560" height="315" src="https://www.youtube.com/embed/' + id + '" frameborder="0" allowfullscreen=""></iframe>');
  });

  // ______________ BACK TO TOP BUTTON

  $(window).scroll(function() {
    if($(this).scrollTop() > 200) {
      $("#back-to-top").fadeIn("slow");
    } else {
      $("#back-to-top").fadeOut("slow");
    }
  });
  $("#back-to-top").click(function() {
    $("html, body").animate({scrollTop: 0}, 600);
    return false;
  });

  window.sr = new scrollReveal({
    reset: true,
    mobile: false
  });

  $("#share").jsSocials({
    showLabel: false,
    showCount: "inside",
    shares: ["twitter", "facebook", "googleplus", "linkedin"]
  });

  $("code").each(function() {
    var codeName = $(this).attr("class") ? $(this).attr("class").split(":")[1] : null;
    if(codeName) {
      $(this).parent().addClass("source-code");
      $("<div class='code-name'>" + codeName + "</div>").insertBefore($(this));
    }
  });

  /* DOMの読み込み完了後に処理 */
  if(window.addEventListener) {
    window.addEventListener("load", shareButtonReadSyncer, false);
  } else {
    window.attachEvent("onload", shareButtonReadSyncer);
  }

  /* シェアボタンを読み込む関数 */
  function shareButtonReadSyncer() {
    $(".sc-fb div:first-child").attr("data-href", document.URL);
    var socials = [
      {
        "id": "twitter-wjs",
        "src": (/^http:/.test(document.location) ? 'http' : 'https') + '://platform.twitter.com/widgets.js'
      },
      //{"id": "facebook-jssdk", "src": "//connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v2.5&appId=459774450888368"},
      {"id": "facebook-jssdk", "src": "//connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v2.5"}];

    socials.forEach(function(social) {
      (!function(d, s, social) {
        var id = social["id"];
        var js, fjs = d.getElementsByTagName(s)[0];
        if(!d.getElementById(id)) {
          js = d.createElement(s);
          js.id = id;
          js.type = "text/javascript";
          js.src = social["src"];
          js.async = true;
          fjs.parentNode.insertBefore(js, fjs);
        }
      }(document, 'script', social));
    });
  }
})(jQuery);