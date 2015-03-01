describe "nanoScroller (with CSS: 'width: 200px, height 200px' set to .content)", ->
  $nano = null
  $nestedNano = null
  $content = null
  $pane = null
  $slider = null
  height = null
  spyScrolltop = null
  spyScrollend = null
  jasmine.getFixtures().fixturesPath = 'spec/fixtures'

  describe "when the plugin is called without any options and there is content", ->
    beforeEach ->
      loadFixtures('nano-content.html')
      $nano = $("#nano")
      $nano.nanoScroller()

    describe "content element", ->
      beforeEach ->
        $content = $nano.find('.content')
      it "should exist", ->
        expect($content).toExist()
        expect($content.length).toBeTruthy()
        expect($nano).toContain("div.content")
      it "should have tabindex attribute set", ->
        expect($content).toHaveAttr('tabindex')
      it "should have a height of 200px", ->
        expect($content.height()).toEqual(200)

    describe "pane element", ->
      beforeEach ->
        $pane = $nano.find('.pane')
      it "should exist", ->
        expect($pane).toExist()
        expect($pane.length).toBeTruthy()
        expect($nano).toContain("div.pane")
      it "should have a height of 200px", ->
        expect($pane.height()).toEqual(200)

    describe "slider element", ->
      beforeEach ->
        $slider = $nano.find('.slider')
      it "should exist", ->
        expect($slider).toExist()
        expect($slider.length).toBeTruthy()
        expect($nano).toContain("div.slider")
      it "should have style attribute set", ->
        expect($slider).toHaveAttr('style')

    describe "calling $('.nano').nanoScroller({ scroll: 'top' }) when the scrollbar is not at the top", ->
      beforeEach ->
        spyScrolltop = spyOnEvent($nano, 'scrolltop')
        $nano.nanoScroller({ scroll: 'bottom' })
        $nano.nanoScroller({ scroll: 'top' })
        $slider = $nano.find('.slider')
      it "should have set .slider CSS 'top' value to 0px", ->
        expect($slider).toHaveCss({ top: '0px' })
      it "should have triggered the 'scrolltop' event", ->
        expect('scrolltop').toHaveBeenTriggeredOn($nano)

    describe "calling $('.nano').nanoScroller({ scroll: 'bottom' }) when the scrollbar is at the top", ->
      beforeEach ->
        spyScrollend = spyOnEvent($nano, 'scrollend')
        $nano.nanoScroller({ scroll: 'bottom' })
        $slider = $nano.find('.slider')
        height = $nano.find('.content').height() - $slider.height()
      it "should have set .slider CSS 'top' value to (content height - slider height)", ->
        expect($slider).toHaveCss({ top: height + 'px' })
      it "should have triggered the 'scrollend' event", ->
        expect('scrollend').toHaveBeenTriggeredOn($nano)

    describe "calling $('.nano').nanoScroller({ stop: true })", ->
      beforeEach ->
        $nano.nanoScroller({ stop: true })
        $pane = $nano.find('.pane')
      it "should have hidden .pane with 'display: none'", ->
        expect($pane.css('display')).toEqual('none')

    describe "calling $('.nano').nanoScroller({ flash: true })", ->
      beforeEach ->
        $nano.nanoScroller({ flash: true })
        $pane = $nano.find('.pane')
      it "should have added CSS class .flashed to .pane", ->
        expect($pane).toHaveClass('flashed')

    describe "calling $('.nano').nanoScroller({ sliderMinHeight: 120 })", ->
      beforeEach ->
        $nano.nanoScroller({ sliderMinHeight: 120 })
        $slider = $nano.find('.slider')
      it "should have set slider height to at least 120px", ->
        expect($slider.height()).toBeGreaterThan(119)

    describe "calling $('.nano').nanoScroller({ sliderMaxHeight: 21 })", ->
      beforeEach ->
        $nano.nanoScroller({ sliderMaxHeight: 21 })
        $slider = $nano.find('.slider')
      it "should not have set slider height to more than 21px", ->
        expect($slider.height()).toBeLessThan(22)

    describe "calling $('.nano').nanoScroller({ sliderMinHeight: 120, sliderMaxHeight: 120 })", ->
      beforeEach ->
        $nano.nanoScroller({ sliderMinHeight: 120, sliderMaxHeight: 120 })
        $slider = $nano.find('.slider')
      it "should have set slider height to 120px", ->
        expect($slider).toHaveCss({ height: '120px' })
        expect($slider.height()).toBe(120)

  describe "when the plugin is called without any options and there is no content", ->
    beforeEach ->
      loadFixtures('nano-no-content.html')
      $nano = $("#nano")
      $nano.nanoScroller()

    describe "content element", ->
      beforeEach ->
        $content = $nano.find('.content')
      it "should exist", ->
        expect($content).toExist()
        expect($content.length).toBeTruthy()
        expect($nano).toContain("div.content")
      it "should have tabindex attribute set", ->
        expect($content).toHaveAttr('tabindex')
      it "should have a height of 200px", ->
        expect($content.height()).toEqual(200)

    describe "pane element", ->
      beforeEach ->
        $pane = $nano.find('.pane')
      it "should exist", ->
        expect($pane).toExist()
        expect($pane.length).toBeTruthy()
        expect($nano).toContain("div.pane")
      it "should have a height of 200px", ->
        expect($pane.height()).toEqual(200)
      it "should be hidden with 'display: none'", ->
        expect($pane.css('display')).toEqual('none')

    describe "slider element", ->
      beforeEach ->
        $slider = $nano.find('.slider')
      it "should exist", ->
        expect($slider).toExist()
        expect($slider.length).toBeTruthy()
        expect($nano).toContain("div.slider")
      it "should have style attribute set", ->
        expect($slider).toHaveAttr('style')

    describe "calling $('.nano').nanoScroller({ scroll: 'top' }) when the scrollbar is not at the top", ->
      beforeEach ->
        spyScrolltop = spyOnEvent($nano, 'scrolltop')
        $nano.nanoScroller({ scroll: 'bottom' })
        $nano.nanoScroller({ scroll: 'top' })
      it "should not have triggered the 'scrolltop' event", ->
        expect('scrolltop').not.toHaveBeenTriggeredOn($nano)

    describe "calling $('.nano').nanoScroller({ scroll: 'bottom' }) when the scrollbar is at the top", ->
      beforeEach ->
        spyScrollend = spyOnEvent($nano, 'scrollend')
        $nano.nanoScroller({ scroll: 'bottom' })
        $slider = $nano.find('.slider')
        height = $nano.find('.content').height() - $slider.height()
      it "should not have set .slider CSS 'top' value to (content height - slider height)", ->
        expect($slider).not.toHaveCss({ top: height + 'px' })
      it "should not have triggered the 'scrollend' event", ->
        expect('scrollend').not.toHaveBeenTriggeredOn($nano)

    describe "calling $('.nano').nanoScroller({ stop: true })", ->
      beforeEach ->
        $nano.nanoScroller({ stop: true })
        $pane = $nano.find('.pane')
      it "should have hidden .pane with 'display: none'", ->
        expect($pane.css('display')).toEqual('none')

    describe "calling $('.nano').nanoScroller({ flash: true })", ->
      beforeEach ->
        $nano.nanoScroller({ flash: true })
        $pane = $nano.find('.pane')
      it "should not have added CSS class .flashed to .pane", ->
        expect($pane).not.toHaveClass('flashed')

    describe "calling $('.nano').nanoScroller({ sliderMinHeight: 120 })", ->
      beforeEach ->
        $nano.nanoScroller({ sliderMinHeight: 120 })
        $slider = $nano.find('.slider')
      it "should have set slider height to at least 120px", ->
        expect($slider.height()).toBeGreaterThan(119)

    describe "calling $('.nano').nanoScroller({ sliderMaxHeight: 21 })", ->
      beforeEach ->
        $nano.nanoScroller({ sliderMaxHeight: 21 })
        $slider = $nano.find('.slider')
      it "should not have set slider height to more than 21px", ->
        expect($slider.height()).toBeLessThan(22)

    describe "calling $('.nano').nanoScroller({ sliderMinHeight: 120, sliderMaxHeight: 120 })", ->
      beforeEach ->
        $nano.nanoScroller({ sliderMinHeight: 120, sliderMaxHeight: 120 })
        $slider = $nano.find('.slider')
      it "should have set slider height to 120px", ->
        expect($slider).toHaveCss({ height: '120px' })
        expect($slider.height()).toBe(120)

  describe "when there is a nested nanoScroller, calling nanoScroller() on the parent", ->
    beforeEach ->
      loadFixtures('nano-content.html')
      $nano = $("#nano")
      $content = $nano.find('.content')
      $content.append('<div id="nestednano" class="nano" style="width:200px;height:200px"><div class="content" /></div>')
      $nestedNano = $('#nestednano')
      $nestedNano.nanoScroller()
      $nano.nanoScroller()

    it "should not modify the slider element of its child", ->
      $nano.nanoScroller({ scrollTop: 100 })
      $nestedSlider = $nestedNano.find('.slider')
      expect($nestedSlider.css('top')).toEqual('0px')

  describe "extending the constructor", ->
    it "should be possible via $.fn.nanoScroller.Constructor", ->
      expect(typeof $.fn.nanoScroller.Constructor).toBe("function")
      expect(typeof $.fn.nanoScroller.Constructor.prototype.scroll).toBe("function")

