import ModalComponent from 'ghost-admin/components/modal-base';
import diff from 'node-htmldiff';

export default ModalComponent.extend({

    get previous() {
        return `{root: {children: [{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'This is a sentence - changed ',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'Awesome!',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'Yala',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'root',version: 1}}`;
    },

    get current() {
        return `{root: {children: [{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'Hello, world',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'Weird...',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'Awesome!! That\'s sooooo cool !',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [],direction: null,format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'hello??',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'hmmm',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [],direction: null,format: '',indent: 0,type: 'paragraph',version: 1},{children: [{detail: 0,format: 0,mode: 'normal',style: '',text: 'huh!',type: 'text',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'paragraph',version: 1},{children: [],direction: null,format: '',indent: 0,type: 'paragraph',version: 1}],direction: 'ltr',format: '',indent: 0,type: 'root',version: 1}}`;
    },
     
    get postDiff() {
        let post = this.get('post');
        let previousPost = this.get('previousPost');
        let diffHtml = diff(previousPost.get('html'), post.get('html'));
        return diffHtml;
    }
});
