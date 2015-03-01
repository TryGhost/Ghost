if (typeof module === 'object') require('./setup');

testSuite('NProgress', function() {

  var $ = window.jQuery || require('jquery');
  var NProgress = window.NProgress || require('nprogress');

  beforeEach(function() {
    this.settings = $.extend({}, NProgress.settings);
  });

  afterEach(function() {
    $("#nprogress").remove();
    $('html').attr('class', '');
    NProgress.status = null;

    // Restore settings
    $.extend(NProgress.settings, this.settings);
  });

  describe('.set()', function() {
    it('.set(0) must render', function(done) {
      NProgress.set(0);
      assert.equal($("#nprogress").length, 1);
      assert.equal($("#nprogress .bar").length, 1);
      assert.equal($("#nprogress .peg").length, 1);
      assert.equal($("#nprogress .spinner").length, 1);
      done();
    });

    it('.set(1) should appear and disappear', function(done) {
      NProgress.configure({ speed: 10 });
      NProgress.set(0).set(1);
      assert.equal($("#nprogress").length, 1);

      setTimeout(function() {
        assert.equal($("#nprogress").length, 0);
        done();
      }, 70);
    });

    it('must respect minimum', function() {
      NProgress.set(0);
      assert.equal(NProgress.status, NProgress.settings.minimum);
    });

    it('must clamp to minimum', function() {
      NProgress.set(-100);
      assert.equal(NProgress.status, NProgress.settings.minimum);
    });

    it('must clamp to maximum', function() {
      NProgress.set(456);
      assert.equal(NProgress.status, null);
    });
  });

  // ----

  describe('.start()', function() {
    it('must render', function(done) {
      NProgress.start();
      assert.equal($("#nprogress").length, 1);
      done();
    });

    it('must respect minimum', function() {
      NProgress.start();
      assert.equal(NProgress.status, NProgress.settings.minimum);
    });
  });

  // ----

  describe('.done()', function() {
    it('must not render without start', function(done) {
      NProgress.done();
      assert.equal($("#nprogress").length, 0);
      done();
    });

    it('.done(true) must render', function(done) {
      NProgress.done(true);
      assert.equal($("#nprogress").length, 1);
      done();
    });
  });

  // ----

  describe('.inc()', function() {
    it('should render', function() {
      NProgress.inc();
      assert.equal($("#nprogress").length, 1);
    });

    it('should start with minimum', function() {
      NProgress.inc();
      assert.equal(NProgress.status, NProgress.settings.minimum);
    });

    it('should increment', function() {
      NProgress.start();
      var start = NProgress.status;

      NProgress.inc();
      assert.operator(NProgress.status, '>', start);
    });

    it('should never reach 1.0', function() {
      for (var i=0; i<100; ++i) { NProgress.inc(); }
      assert.operator(NProgress.status, '<', 1.0);
    });
  });

  // -----

  describe('.configure()', function() {
    it('should work', function() {
      NProgress.configure({ minimum: 0.5 });
      assert.equal(NProgress.settings.minimum, 0.5);
    });
  });

  // ----

  describe('.configure(showSpinner)', function() {
    it('should render spinner by default', function() {
      NProgress.start();

      assert.equal($("#nprogress .spinner").length, 1);
    });

    it('should be true by default', function() {
      assert.equal(NProgress.settings.showSpinner, true);
    });

    it('should hide (on false)', function() {
      NProgress.configure({ showSpinner: false });
      NProgress.start();

      assert.equal($("#nprogress .spinner").length, 0);
    });
  });
});
