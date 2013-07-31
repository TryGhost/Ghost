/*globals casper, __utils__, url, testPost */

casper.test.begin("Ghost editor is correct", 7, function suite(test) {

    casper.test.filename = "editor_test.png";

    casper.start(url + "ghost/editor", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/editor", "Ghost doesn't require login this time");
        test.assertExists(".entry-markdown", "Ghost editor is present");
        test.assertExists(".entry-preview", "Ghost preview is present");
    }).viewport(1280, 1024);

    function handleResource(resource) {
        if (resource.url === 'http://localhost:2368/api/v0.1/posts') {
            casper.removeListener('resource.received', handleResource);
            casper.test.assertEquals(resource.status, 200, "Received correct response");
        }
    }

    casper.then(function testCreatePost() {
        // bind to resource events so we can get the API response
        casper.on('resource.received', handleResource);

        casper.sendKeys('#entry-title', testPost.title);
        casper.evaluate(function () {
            var txt = document.querySelector('.CodeMirror-wrap textarea');
            txt.focus();
            // TODO: finish figuring out codemirror this works in chrome console.. but not in evaluate?
            txt.value = "abcd";
        });

        casper.click('.button-save');
    });

    casper.wait(1000, function doneWait() {
        this.echo("I've waited for 1 seconds.");
    });

    casper.then(function checkPostWasCreated() {
        var urlRegExp = new RegExp("^" + url + "ghost\/editor\/[0-9]*");
        test.assertUrlMatch(urlRegExp, 'got an id on our URL');
        test.assertExists('.notification-success', 'got success notification');
    });

    casper.run(function () {
        casper.removeListener('resource.received', handleResource);
        test.done();
    });
});
