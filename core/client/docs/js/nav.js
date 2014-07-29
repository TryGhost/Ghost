(function(){

    if (matchMedia) {
        var mq_max_1025 = window.matchMedia("(max-width: 1025px)");
        mq_max_1025.addListener(show_hide_nav);
        show_hide_nav(mq_max_1025);
    }

    function show_hide_nav(mq) {

        var viewport = document.querySelector(".viewport"),
            global_nav = document.querySelector(".global-nav"),
            menu_button = document.querySelector(".menu-button");

        menu_button.addEventListener("click", function(e) {
            e.preventDefault();
            viewport.classList.toggle("global-nav-expanded");
            global_nav.classList.toggle("global-nav-expanded");
        });

        if (mq.matches) {
            // Window is 1025px or less
        } else {
            // Window is 1026px or more
            viewport.classList.remove("global-nav-expanded");
            global_nav.classList.remove("global-nav-expanded");
        }
    }

})();