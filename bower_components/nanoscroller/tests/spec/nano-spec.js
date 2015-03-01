(function() {
  describe("nanoScroller (with CSS: 'width: 200px, height 200px' set to .content)", function() {
    var $content, $nano, $nestedNano, $pane, $slider, height, spyScrollend, spyScrolltop;
    $nano = null;
    $nestedNano = null;
    $content = null;
    $pane = null;
    $slider = null;
    height = null;
    spyScrolltop = null;
    spyScrollend = null;
    jasmine.getFixtures().fixturesPath = 'spec/fixtures';
    describe("when the plugin is called without any options and there is content", function() {
      beforeEach(function() {
        loadFixtures('nano-content.html');
        $nano = $("#nano");
        return $nano.nanoScroller();
      });
      describe("content element", function() {
        beforeEach(function() {
          return $content = $nano.find('.content');
        });
        it("should exist", function() {
          expect($content).toExist();
          expect($content.length).toBeTruthy();
          return expect($nano).toContain("div.content");
        });
        it("should have tabindex attribute set", function() {
          return expect($content).toHaveAttr('tabindex');
        });
        return it("should have a height of 200px", function() {
          return expect($content.height()).toEqual(200);
        });
      });
      describe("pane element", function() {
        beforeEach(function() {
          return $pane = $nano.find('.pane');
        });
        it("should exist", function() {
          expect($pane).toExist();
          expect($pane.length).toBeTruthy();
          return expect($nano).toContain("div.pane");
        });
        return it("should have a height of 200px", function() {
          return expect($pane.height()).toEqual(200);
        });
      });
      describe("slider element", function() {
        beforeEach(function() {
          return $slider = $nano.find('.slider');
        });
        it("should exist", function() {
          expect($slider).toExist();
          expect($slider.length).toBeTruthy();
          return expect($nano).toContain("div.slider");
        });
        return it("should have style attribute set", function() {
          return expect($slider).toHaveAttr('style');
        });
      });
      describe("calling $('.nano').nanoScroller({ scroll: 'top' }) when the scrollbar is not at the top", function() {
        beforeEach(function() {
          spyScrolltop = spyOnEvent($nano, 'scrolltop');
          $nano.nanoScroller({
            scroll: 'bottom'
          });
          $nano.nanoScroller({
            scroll: 'top'
          });
          return $slider = $nano.find('.slider');
        });
        it("should have set .slider CSS 'top' value to 0px", function() {
          return expect($slider).toHaveCss({
            top: '0px'
          });
        });
        return it("should have triggered the 'scrolltop' event", function() {
          return expect('scrolltop').toHaveBeenTriggeredOn($nano);
        });
      });
      describe("calling $('.nano').nanoScroller({ scroll: 'bottom' }) when the scrollbar is at the top", function() {
        beforeEach(function() {
          spyScrollend = spyOnEvent($nano, 'scrollend');
          $nano.nanoScroller({
            scroll: 'bottom'
          });
          $slider = $nano.find('.slider');
          return height = $nano.find('.content').height() - $slider.height();
        });
        it("should have set .slider CSS 'top' value to (content height - slider height)", function() {
          return expect($slider).toHaveCss({
            top: height + 'px'
          });
        });
        return it("should have triggered the 'scrollend' event", function() {
          return expect('scrollend').toHaveBeenTriggeredOn($nano);
        });
      });
      describe("calling $('.nano').nanoScroller({ stop: true })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            stop: true
          });
          return $pane = $nano.find('.pane');
        });
        return it("should have hidden .pane with 'display: none'", function() {
          return expect($pane.css('display')).toEqual('none');
        });
      });
      describe("calling $('.nano').nanoScroller({ flash: true })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            flash: true
          });
          return $pane = $nano.find('.pane');
        });
        return it("should have added CSS class .flashed to .pane", function() {
          return expect($pane).toHaveClass('flashed');
        });
      });
      describe("calling $('.nano').nanoScroller({ sliderMinHeight: 120 })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            sliderMinHeight: 120
          });
          return $slider = $nano.find('.slider');
        });
        return it("should have set slider height to at least 120px", function() {
          return expect($slider.height()).toBeGreaterThan(119);
        });
      });
      describe("calling $('.nano').nanoScroller({ sliderMaxHeight: 21 })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            sliderMaxHeight: 21
          });
          return $slider = $nano.find('.slider');
        });
        return it("should not have set slider height to more than 21px", function() {
          return expect($slider.height()).toBeLessThan(22);
        });
      });
      return describe("calling $('.nano').nanoScroller({ sliderMinHeight: 120, sliderMaxHeight: 120 })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            sliderMinHeight: 120,
            sliderMaxHeight: 120
          });
          return $slider = $nano.find('.slider');
        });
        return it("should have set slider height to 120px", function() {
          expect($slider).toHaveCss({
            height: '120px'
          });
          return expect($slider.height()).toBe(120);
        });
      });
    });
    describe("when the plugin is called without any options and there is no content", function() {
      beforeEach(function() {
        loadFixtures('nano-no-content.html');
        $nano = $("#nano");
        return $nano.nanoScroller();
      });
      describe("content element", function() {
        beforeEach(function() {
          return $content = $nano.find('.content');
        });
        it("should exist", function() {
          expect($content).toExist();
          expect($content.length).toBeTruthy();
          return expect($nano).toContain("div.content");
        });
        it("should have tabindex attribute set", function() {
          return expect($content).toHaveAttr('tabindex');
        });
        return it("should have a height of 200px", function() {
          return expect($content.height()).toEqual(200);
        });
      });
      describe("pane element", function() {
        beforeEach(function() {
          return $pane = $nano.find('.pane');
        });
        it("should exist", function() {
          expect($pane).toExist();
          expect($pane.length).toBeTruthy();
          return expect($nano).toContain("div.pane");
        });
        it("should have a height of 200px", function() {
          return expect($pane.height()).toEqual(200);
        });
        return it("should be hidden with 'display: none'", function() {
          return expect($pane.css('display')).toEqual('none');
        });
      });
      describe("slider element", function() {
        beforeEach(function() {
          return $slider = $nano.find('.slider');
        });
        it("should exist", function() {
          expect($slider).toExist();
          expect($slider.length).toBeTruthy();
          return expect($nano).toContain("div.slider");
        });
        return it("should have style attribute set", function() {
          return expect($slider).toHaveAttr('style');
        });
      });
      describe("calling $('.nano').nanoScroller({ scroll: 'top' }) when the scrollbar is not at the top", function() {
        beforeEach(function() {
          spyScrolltop = spyOnEvent($nano, 'scrolltop');
          $nano.nanoScroller({
            scroll: 'bottom'
          });
          return $nano.nanoScroller({
            scroll: 'top'
          });
        });
        return it("should not have triggered the 'scrolltop' event", function() {
          return expect('scrolltop').not.toHaveBeenTriggeredOn($nano);
        });
      });
      describe("calling $('.nano').nanoScroller({ scroll: 'bottom' }) when the scrollbar is at the top", function() {
        beforeEach(function() {
          spyScrollend = spyOnEvent($nano, 'scrollend');
          $nano.nanoScroller({
            scroll: 'bottom'
          });
          $slider = $nano.find('.slider');
          return height = $nano.find('.content').height() - $slider.height();
        });
        it("should not have set .slider CSS 'top' value to (content height - slider height)", function() {
          return expect($slider).not.toHaveCss({
            top: height + 'px'
          });
        });
        return it("should not have triggered the 'scrollend' event", function() {
          return expect('scrollend').not.toHaveBeenTriggeredOn($nano);
        });
      });
      describe("calling $('.nano').nanoScroller({ stop: true })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            stop: true
          });
          return $pane = $nano.find('.pane');
        });
        return it("should have hidden .pane with 'display: none'", function() {
          return expect($pane.css('display')).toEqual('none');
        });
      });
      describe("calling $('.nano').nanoScroller({ flash: true })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            flash: true
          });
          return $pane = $nano.find('.pane');
        });
        return it("should not have added CSS class .flashed to .pane", function() {
          return expect($pane).not.toHaveClass('flashed');
        });
      });
      describe("calling $('.nano').nanoScroller({ sliderMinHeight: 120 })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            sliderMinHeight: 120
          });
          return $slider = $nano.find('.slider');
        });
        return it("should have set slider height to at least 120px", function() {
          return expect($slider.height()).toBeGreaterThan(119);
        });
      });
      describe("calling $('.nano').nanoScroller({ sliderMaxHeight: 21 })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            sliderMaxHeight: 21
          });
          return $slider = $nano.find('.slider');
        });
        return it("should not have set slider height to more than 21px", function() {
          return expect($slider.height()).toBeLessThan(22);
        });
      });
      return describe("calling $('.nano').nanoScroller({ sliderMinHeight: 120, sliderMaxHeight: 120 })", function() {
        beforeEach(function() {
          $nano.nanoScroller({
            sliderMinHeight: 120,
            sliderMaxHeight: 120
          });
          return $slider = $nano.find('.slider');
        });
        return it("should have set slider height to 120px", function() {
          expect($slider).toHaveCss({
            height: '120px'
          });
          return expect($slider.height()).toBe(120);
        });
      });
    });
    describe("when there is a nested nanoScroller, calling nanoScroller() on the parent", function() {
      beforeEach(function() {
        loadFixtures('nano-content.html');
        $nano = $("#nano");
        $content = $nano.find('.content');
        $content.append('<div id="nestednano" class="nano" style="width:200px;height:200px"><div class="content" /></div>');
        $nestedNano = $('#nestednano');
        $nestedNano.nanoScroller();
        return $nano.nanoScroller();
      });
      return it("should not modify the slider element of its child", function() {
        var $nestedSlider;
        $nano.nanoScroller({
          scrollTop: 100
        });
        $nestedSlider = $nestedNano.find('.slider');
        return expect($nestedSlider.css('top')).toEqual('0px');
      });
    });
    return describe("extending the constructor", function() {
      return it("should be possible via $.fn.nanoScroller.Constructor", function() {
        expect(typeof $.fn.nanoScroller.Constructor).toBe("function");
        return expect(typeof $.fn.nanoScroller.Constructor.prototype.scroll).toBe("function");
      });
    });
  });

}).call(this);
