import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import startApp from '../../helpers/start-app';
import Ember from 'ember';
// import { Position, Range } from 'mobiledoc-kit/utils/cursor';
let App;
moduleForComponent('ghost-editor', 'Integration | Component | ghost editor', {
  integration: true,
    setup: function() {
        App = startApp();
    },
    teardown: function() {
        Ember.run(App, 'destroy');
    }
});


const blankDoc = {version:"0.3.0",atoms:[],cards:[],markups:[],sections:[[1,"p",[[0,[],0,""]]]]};

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });


    assert.expect(2);

    this.set('mobiledoc', blankDoc);
    this.render(hbs`{{ghost-editor value=mobiledoc}}`);

    assert.ok(
        this.$('.surface').prop('contenteditable'),
        'editor is created'
    );


    let editor = window.editor;
    return wait().then(() => {
        return selectRangeWithEditor(editor, editor.post.tailPosition());
    }).then(() => {
        Ember.run(() => editor.insertText('abcdef'));
        return wait();
    }).then(() => {
        assert.equal('abcdef', $('.surface')[0].childNodes[0].innerHTML, 'editor renders changes into the dom');
    });
});

test('inline markdown support', function(assert) {
   assert.expect(14);

    this.set('mobiledoc', blankDoc);
    this.render(hbs`{{ghost-editor value=mobiledoc}}`);


    let editor = window.editor;
    return wait().then(() => {
        return selectRangeWithEditor(editor, editor.post.tailPosition());
    }).then(() => {
        return clearEditorAndInputText(editor, '**test**');
    }).then(() => {
        assert.equal('<strong>test</strong>', $('.surface')[0].childNodes[0].innerHTML, '** markdown bolds at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123**test**');
    }).then(() => {
        assert.equal('123<strong>test</strong>', $('.surface')[0].childNodes[0].innerHTML, '** markdown bolds in line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '__test__');
    }).then(() => {
        assert.equal('<strong>test</strong>', $('.surface')[0].childNodes[0].innerHTML, '__ markdown bolds at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123__test__');
    }).then(() => {
        assert.equal('123<strong>test</strong>', $('.surface')[0].childNodes[0].innerHTML, '__ markdown bolds in line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '*test*');
    }).then(() => {
        assert.equal('<em>test</em>', $('.surface')[0].childNodes[0].innerHTML, '* markdown emphasises at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123*test*');
    }).then(() => {
        assert.equal('123<em>test</em>', $('.surface')[0].childNodes[0].innerHTML, '* markdown emphasises in line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '_test_');
    }).then(() => {
        assert.equal('<em>test</em>', $('.surface')[0].childNodes[0].innerHTML, '_ markdown emphasises at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123_test_');
    }).then(() => {
        assert.equal('123<em>test</em>', $('.surface')[0].childNodes[0].innerHTML, '_ markdown emphasises in line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '**test*');
    }).then(() => {
        assert.equal('**test*', $('.surface')[0].childNodes[0].innerHTML, 'two ** at the start and one * at the end (mixing strong and em) doesn\'t render');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '__test_');
    }).then(() => {
        assert.equal('__test_', $('.surface')[0].childNodes[0].innerHTML, 'two __ at the start and one _ at the end (mixing strong and em) doesn\'t render');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '~~test~~');
    }).then(() => {
        assert.equal('<s>test</s>', $('.surface')[0].childNodes[0].innerHTML, '~~ markdown strikethroughs at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123~~test~~');
    }).then(() => {
        assert.equal('123<s>test</s>', $('.surface')[0].childNodes[0].innerHTML, '~~ markdown strikethroughs in line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '[http://www.ghost.org/](Ghost)');
    }).then(() => {
        assert.equal('<a href=\"Ghost\">http://www.ghost.org/</a>', $('.surface')[0].childNodes[0].innerHTML, 'creates a link at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123[http://www.ghost.org/](Ghost)');
    }).then(() => {
        assert.equal('123<a href=\"Ghost\">http://www.ghost.org/</a>', $('.surface')[0].childNodes[0].innerHTML, 'creates a link in line');
        return wait();
    });
});

test('block markdown support', function(assert) {
    assert.expect(2);

    this.set('mobiledoc', blankDoc);
    this.render(hbs`{{ghost-editor value=mobiledoc}}`);

    //1., *, #, ##, and ### are all tested within mobiledoc

    let editor = window.editor;
    return wait().then(() => {
        return selectRangeWithEditor(editor, editor.post.tailPosition());
    }).then(() => {
        return clearEditorAndInputText(editor, '- ');
    }).then(() => {
        assert.equal('<ul><li><br></li></ul>', $('.surface')[0].innerHTML, '- creates a list');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '> ');
    }).then(() => {
        assert.equal('<blockquote><br></blockquote>', $('.surface')[0].innerHTML, '> creates a pullquote');
        return wait();
    });
});

/*
test('card markdown support', function(assert) {
    assert.expect(2);

    this.set('mobiledoc', blankDoc);
    this.render(hbs`{{ghost-editor value=mobiledoc}}`);
    //![](), ```

    let editor = window.editor;
    return wait().then(() => {
        return selectRangeWithEditor(editor, editor.post.tailPosition());
    }).then(() => {
        return clearEditorAndInputText(editor, '**test**');
    }).then(() => {
        assert.equal('<strong>test</strong>', $('.surface')[0].childNodes[0].innerHTML, '** markdown bolds at start of line');
        return wait();
    }).then(() => {
        return clearEditorAndInputText(editor, '123**test**');
    }).then(() => {
        assert.equal('123<strong>test</strong>', $('.surface')[0].childNodes[0].innerHTML, '** markdown bolds in line');
        return wait();
    })
        ;
});
*/

let runLater = (cb) => window.requestAnimationFrame(cb);
function selectRangeWithEditor(editor, range) {
    editor.selectRange(range);
    return new Ember.RSVP.Promise(resolve => runLater(resolve));
}

function clearEditorAndInputText(editor, text) {
    editor.run(postEditor => {
        postEditor.deleteRange(editor.post.toRange());
    });
    editor._eventManager._textInputHandler.handle(text);
    return wait();
}
