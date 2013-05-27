/*global window, document, Ghost, Backbone, $, _, Chart */
(function () {

  Ghost.Views.Dashboard = Backbone.View.extend({

      render: function () {
          this.temporaryAnimate();
          return this;
      },

      temporaryAnimate: function () {
          $('.time').fadeIn(1000);
          $('.image').delay(300).fadeIn(1000);
          $('.posts').delay(600).fadeIn(900, function(){

            var ctx = $("#poststats").get(0).getContext("2d");
            var data = [
              {
                value: 9,
                color:"#9ec14a"
              },
              {
                value : 4,
                color : "#f9e15d"
              },
              {
                value : 2,
                color : "#EB5700"
              }
            ];
            var options = {
              animationEasing: 'easeOutQuart',
              percentageInnerCutout: 60,
              segmentStrokeColor : "#efefef"
            };
            var poststats = new Chart(ctx).Doughnut(data, options);

          });

          $('.stats').delay(800).fadeIn(1000);
          $('.facebook').delay(1000).fadeIn(1000);
          $('.gplus').delay(1200).fadeIn(1000);
          $('.twitter').delay(1300).fadeIn(1000);
          $('.campaignmonitor').delay(1400).fadeIn(1000);
      }

  });

}());
