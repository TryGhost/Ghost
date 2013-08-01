$(function(){
    var headerHeight =  $('.navbar').outerHeight(true) + $('.bs-header').outerHeight(true) + 10;
    $(document.body).scrollspy({
        target: '#sidebar',
        offset: headerHeight
    });
    $('.bs-sidebar').affix({
        offset: {
            bottom: function () {
                return (this.bottom = $('.bs-footer').outerHeight(true))
            }
        }
    });
});