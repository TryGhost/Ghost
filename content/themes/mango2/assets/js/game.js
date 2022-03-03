(function() {
  $('#ready-play').click(function() {
    $('.game-ready').addClass('hide');
  });

  $('#fullscreen-btn').click(function() {
    $('.game-part .game-container').addClass('full');
  });

  $('.exit-btn').click(function() {
    $('.game-part .game-container').removeClass('full');
  });
})();
