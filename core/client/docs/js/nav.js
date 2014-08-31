(function(){

    // TODO: unbind click events when nav is desktop sized

    // Element vars
    var menu_button = document.querySelector(".menu-button"),
        viewport = document.querySelector(".viewport"),
        global_nav = document.querySelector(".global-nav"),
        page_content = document.querySelector(".viewport .page-content");

    // mediaQuery listener
    var mq_max_1025 = window.matchMedia("(max-width: 1025px)");
    mq_max_1025.addListener(show_hide_nav);
    show_hide_nav(mq_max_1025);

    menu_button.addEventListener("click", function(e) {
        e.preventDefault();
        if (menu_button.getAttribute('data-nav-open')) {
            close_nav();
        } else {
            open_nav();
        }
    });

    page_content.addEventListener("click", function(e) {
        e.preventDefault();
        console.log("click viewport");
        if (viewport.classList.contains("global-nav-expanded")) {
            console.log("close nav from viewport");
            close_nav();
        }
    });

    var open_nav = function(){
        menu_button.setAttribute("data-nav-open", "true");
        viewport.classList.add("global-nav-expanded");
        global_nav.classList.add("global-nav-expanded");
    };

    var close_nav = function(){
        menu_button.removeAttribute('data-nav-open');
        viewport.classList.remove("global-nav-expanded");
        global_nav.classList.remove("global-nav-expanded");
    };

    function show_hide_nav(mq) {
        if (mq.matches) {
            // Window is 1025px or less
        } else {
            // Window is 1026px or more
            viewport.classList.remove("global-nav-expanded");
            global_nav.classList.remove("global-nav-expanded");
        }
    }

})();