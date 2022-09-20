describe('Text transforms > Headings', function () {
    describe('on blank paragraph', function () {
        test.todo('#\\s -> h1');
        test.todo('##\\s -> h2');
        test.todo('###\\s -> h3');
        test.todo('####\\s -> h4');
        test.todo('#####\\s -> h5');
        test.todo('######\\s -> h6');
        test.todo('#######\\s -> nothing');
    });

    describe('on existing heading', function () {
        test.todo('h1 #\\s -> h1');
        test.todo('h2 #\\s -> h1');
        test.todo('h1 ##\\s -> h2');
    });

    describe('on lists', function () {
        test.todo('li #\\s -> h1');
    });

    describe('on quotes', function () {
        test.todo('blockquote #\\s -> h1');
        test.todo('aside #\\s -> h1');
    });
});
