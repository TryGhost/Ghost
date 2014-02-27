this["JST"] = this["JST"] || {};

this["JST"]["forgotten"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<form id=\"forgotten\" class=\"forgotten-form\" method=\"post\" novalidate=\"novalidate\">\n    <div class=\"email-wrap\">\n        <input class=\"email\" type=\"email\" placeholder=\"Email Address\" name=\"email\" autocapitalize=\"off\" autocorrect=\"off\">\n    </div>\n    <button class=\"button-save\" type=\"submit\">Send new password</button>\n</form>\n";
  });

this["JST"]["list-item"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this, functionType="function";

function program1(depth0,data) {
  
  
  return " featured";
  }

function program3(depth0,data) {
  
  
  return " page";
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.page), {hash:{},inverse:self.program(8, program8, data),fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  return buffer;
  }
function program6(depth0,data) {
  
  
  return "\n                    <span class=\"page\">Page</span>\n            ";
  }

function program8(depth0,data) {
  
  var buffer = "", stack1, options;
  buffer += "\n                <time datetime=\"";
  options = {hash:{
    'format': ("YYYY-MM-DD hh:mm")
  },data:data};
  buffer += escapeExpression(((stack1 = helpers.date || (depth0 && depth0.date)),stack1 ? stack1.call(depth0, (depth0 && depth0.published_at), options) : helperMissing.call(depth0, "date", (depth0 && depth0.published_at), options)))
    + "\" class=\"date published\">\n                    Published ";
  options = {hash:{
    'timeago': ("True")
  },data:data};
  buffer += escapeExpression(((stack1 = helpers.date || (depth0 && depth0.date)),stack1 ? stack1.call(depth0, (depth0 && depth0.published_at), options) : helperMissing.call(depth0, "date", (depth0 && depth0.published_at), options)))
    + "\n                </time>\n            ";
  return buffer;
  }

function program10(depth0,data) {
  
  
  return "\n            <span class=\"draft\">Draft</span>\n        ";
  }

  buffer += "<a class=\"permalink";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.featured), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.page), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" href=\"#\" title=\"Edit this post\">\n    <h3 class=\"entry-title\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.title); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\n    <section class=\"entry-meta\">\n        <span class=\"status\">\n        ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.published), {hash:{},inverse:self.program(10, program10, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </span>\n    </section>\n</a>\n";
  return buffer;
  });

this["JST"]["login"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<form id=\"login\" class=\"login-form\" method=\"post\" novalidate=\"novalidate\">\n    <div class=\"email-wrap\">\n        <input class=\"email\" type=\"email\" placeholder=\"Email Address\" name=\"email\" autocapitalize=\"off\" autocorrect=\"off\">\n    </div>\n    <div class=\"password-wrap\">\n        <input class=\"password\" type=\"password\" placeholder=\"Password\" name=\"password\">\n    </div>\n    <button class=\"button-save\" type=\"submit\">Log in</button>\n    <section class=\"meta\">\n        <a class=\"forgotten-password\" href=\"";
  if (stack1 = helpers.admin_url) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.admin_url); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "/forgotten/\">Forgotten password?</a>\n    </section>\n</form>\n";
  return buffer;
  });

this["JST"]["modal"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "-"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.type)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  return buffer;
  }

function program3(depth0,data) {
  
  var stack1, stack2;
  stack2 = helpers.each.call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.style), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack2 || stack2 === 0) { return stack2; }
  else { return ''; }
  }
function program4(depth0,data) {
  
  var buffer = "";
  buffer += "modal-style-"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + " ";
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "<header class=\"modal-header\"><h1>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.content)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h1></header>";
  return buffer;
  }

function program8(depth0,data) {
  
  
  return "<a class=\"close\" href=\"#\" title=\"Close\"><span class=\"hidden\">Close</span></a>";
  }

function program10(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <footer class=\"modal-footer\">\n            <button class=\"js-button-accept ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm)),stack1 == null || stack1 === false ? stack1 : stack1.accept)),stack1 == null || stack1 === false ? stack1 : stack1.buttonClass), {hash:{},inverse:self.program(13, program13, data),fn:self.program(11, program11, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\">"
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm)),stack1 == null || stack1 === false ? stack1 : stack1.accept)),stack1 == null || stack1 === false ? stack1 : stack1.text)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n            <button class=\"js-button-reject ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm)),stack1 == null || stack1 === false ? stack1 : stack1.reject)),stack1 == null || stack1 === false ? stack1 : stack1.buttonClass), {hash:{},inverse:self.program(17, program17, data),fn:self.program(15, program15, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\">"
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm)),stack1 == null || stack1 === false ? stack1 : stack1.reject)),stack1 == null || stack1 === false ? stack1 : stack1.text)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n        </footer>\n        ";
  return buffer;
  }
function program11(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm)),stack1 == null || stack1 === false ? stack1 : stack1.accept)),stack1 == null || stack1 === false ? stack1 : stack1.buttonClass)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program13(depth0,data) {
  
  
  return "button-add";
  }

function program15(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm)),stack1 == null || stack1 === false ? stack1 : stack1.reject)),stack1 == null || stack1 === false ? stack1 : stack1.buttonClass)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program17(depth0,data) {
  
  
  return "button-delete";
  }

  buffer += "<article class=\"modal";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.type), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.style), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.animation)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " js-modal\">\n    <section class=\"modal-content\">\n        ";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.content)),stack1 == null || stack1 === false ? stack1 : stack1.title), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n        ";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.close), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n        <section class=\"modal-body\">\n        </section>\n        ";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.confirm), {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n    </section>\n</article>";
  return buffer;
  });

this["JST"]["modals/blank"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var stack1, stack2, functionType="function";


  stack2 = ((stack1 = ((stack1 = (depth0 && depth0.content)),stack1 == null || stack1 === false ? stack1 : stack1.text)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { return stack2; }
  else { return ''; }
  });

this["JST"]["modals/copyToHTML"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "Press Ctrl / Cmd + C to copy the following HTML.\n<pre>\n<code class=\"modal-copyToHTML-content\"></code>\n</pre>";
  });

this["JST"]["modals/markdown"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<section class=\"markdown-help-container\">\n    <table class=\"modal-markdown-help-table\">\n        <thead>\n            <tr>\n                <th>Result</th>\n                <th>Markdown</th>\n                <th>Shortcut</th>\n            </tr>\n        </thead>\n        <tbody>\n            <tr>\n                <td><strong>Bold</strong></td>\n                <td>**text**</td>\n                <td>Ctrl / Cmd + B</td>\n            </tr>\n            <tr>\n                <td><em>Emphasize</em></td>\n                <td>*text*</td>\n                <td>Ctrl / Cmd + I</td>\n            </tr>\n            <tr>\n                <td><code>Inline Code</code></td>\n                <td>`code`</td>\n                <td>Cmd + K / Ctrl + Shift + K</td>\n            </tr>\n            <tr>\n                <td>Strike-through</td>\n                <td>~~text~~</td>\n                <td>Ctrl + Alt + U</td>\n            </tr>\n            <tr>\n                <td><a href=\"#\">Link</a></td>\n                <td>[title](http://)</td>\n                <td>Ctrl + Shift + L</td>\n            </tr>\n            <tr>\n                <td>Image</td>\n                <td>![alt](http://)</td>\n                <td>Ctrl + Shift + I</td>\n            </tr>\n            <tr>\n                <td>List</td>\n                <td>* item</td>\n                <td>Ctrl + L</td>\n            </tr>\n            <tr>\n                <td>Blockquote</td>\n                <td>> quote</td>\n                <td>Ctrl + Q</td>\n            </tr>\n            <tr>\n                <td>H1</td>\n                <td># Heading</td>\n                <td>Ctrl + Alt + 1</td>\n            </tr>\n            <tr>\n                <td>H2</td>\n                <td>## Heading</td>\n                <td>Ctrl + Alt + 2</td>\n            </tr>\n            <tr>\n                <td>H3</td>\n                <td>### Heading</td>\n                <td>Ctrl + Alt + 3</td>\n            </tr>\n            <tr>\n                <td>H4</td>\n                <td>#### Heading</td>\n                <td>Ctrl + Alt + 4</td>\n            </tr>\n            <tr>\n                <td>H5</td>\n                <td>##### Heading</td>\n                <td>Ctrl + Alt + 5</td>\n            </tr>\n            <tr>\n                <td>H6</td>\n                <td>###### Heading</td>\n                <td>Ctrl + Alt + 6</td>\n            </tr>\n            <tr>\n                <td>Select Word</td>\n                <td></td>\n                <td>Ctrl + Alt + W</td>\n            </tr>\n            <tr>\n                <td>New Paragraph</td>\n                <td></td>\n                <td>Ctrl / Cmd + Enter</td>\n            </tr>\n            <tr>\n                <td>Uppercase</td>\n                <td></td>\n                <td>Ctrl + U</td>\n            </tr>\n            <tr>\n                <td>Lowercase</td>\n                <td></td>\n                <td>Ctrl + Shift + U</td>\n            </tr>\n            <tr>\n                <td>Titlecase</td>\n                <td></td>\n                <td>Ctrl + Alt + Shift + U</td>\n            </tr>\n            <tr>\n                <td>Insert Current Date</td>\n                <td></td>\n                <td>Ctrl + Shift + 1</td>\n            </tr>\n        </tbody>\n    </table>\n    For further Markdown syntax reference: <a href=\"http://daringfireball.net/projects/markdown/syntax\" target=\"_blank\">Markdown Documentation</a>\n</section>\n";
  });

this["JST"]["modals/uploadImage"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return " style=\"display: none\"";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "accept=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.acceptEncoding)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"";
  return buffer;
  }

  buffer += "<section class=\"js-drop-zone\">\n    <img class=\"js-upload-target\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.src)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"";
  stack2 = helpers.unless.call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.src), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " alt=\"logo\">\n    <input data-url=\"upload\" class=\"js-fileupload main\" type=\"file\" name=\"uploadimage\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.acceptEncoding), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += ">\n</section>\n";
  return buffer;
  });

this["JST"]["notification"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "-";
  if (stack1 = helpers.type) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.type); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1);
  return buffer;
  }

  buffer += "<section class=\"notification";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.type), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " notification-";
  if (stack1 = helpers.status) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.status); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + " js-notification\">\n    ";
  if (stack1 = helpers.message) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.message); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <a class=\"close\" href=\"#\"><span class=\"hidden\">Close</span></a>\n</section>\n";
  return buffer;
  });

this["JST"]["preview"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "featured";
  }

function program3(depth0,data) {
  
  
  return "unfeatured";
  }

function program5(depth0,data) {
  
  
  return "Unfeature";
  }

function program7(depth0,data) {
  
  
  return "Feature";
  }

function program9(depth0,data) {
  
  
  return "Published";
  }

function program11(depth0,data) {
  
  
  return "Written";
  }

function program13(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.author)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program15(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.author)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program17(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"no-posts-box\">\n        <div class=\"no-posts\">\n            <h3>You Haven't Written Any Posts Yet!</h3>\n            <form action=\"";
  if (stack1 = helpers.admin_url) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.admin_url); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "/editor/\"><button class=\"button-add large\" title=\"New Post\">Write a new Post</button></form>\n        </div>\n    </div>\n";
  return buffer;
  }

  buffer += "<header class=\"floatingheader\">\n    <button class=\"button-back\" href=\"#\">Back</button>\n    <a class=\"";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.featured), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" href=\"#\" title=\"";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.featured), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " this post\">\n        <span class=\"hidden\">Star</span>\n    </a>\n    <small>\n        <span class=\"status\">";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.published), {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</span>\n        <span class=\"normal\">by</span>\n        <span class=\"author\">";
  stack2 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.author)),stack1 == null || stack1 === false ? stack1 : stack1.name), {hash:{},inverse:self.program(15, program15, data),fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</span>\n    </small>\n    <section class=\"post-controls\">\n        <a class=\"post-edit\" href=\"#\" title=\"Edit Post\"><span class=\"hidden\">Edit Post</span></a>\n        <a class=\"post-settings\" href=\"#\" data-toggle=\".post-settings-menu\" title=\"Post Settings\"><span class=\"hidden\">Post Settings</span></a>\n        <div class=\"post-settings-menu menu-drop-right overlay\">\n            <form>\n                <table class=\"plain\">\n                    <tr class=\"post-setting\">\n                        <td class=\"post-setting-label\">\n                            <label for=\"url\">URL</label>\n                        </td>\n                        <td class=\"post-setting-field\">\n                            <input id=\"url\" class=\"post-setting-slug\" type=\"text\" value=\"\" />\n                        </td>\n                    </tr>\n                    <tr class=\"post-setting\">\n                        <td class=\"post-setting-label\">\n                            <label for=\"pub-date\">Pub Date</label>\n                        </td>\n                        <td class=\"post-setting-field\">\n                            <input id=\"pub-date\" class=\"post-setting-date\" type=\"text\" value=\"\"><!--<span class=\"post-setting-calendar\"></span>-->\n                        </td>\n                    </tr>\n                    <tr class=\"post-setting\">\n                        <td class=\"post-setting-label\">\n                            <span class=\"label\">Static Page</span>\n                        </td>\n                        <td class=\"post-setting-item\">\n                            <input id=\"static-page\" class=\"post-setting-static-page\" type=\"checkbox\" value=\"\">\n                            <label class=\"checkbox\" for=\"static-page\"></label>\n                        </td>\n                    </tr>\n                </table>\n            </form>\n            <a class=\"delete\" href=\"#\">Delete This Post</a>\n        </div>\n    </section>\n</header>\n<section class=\"content-preview-content\">\n    <div class=\"wrapper\"><h1>";
  if (stack2 = helpers.title) { stack2 = stack2.call(depth0, {hash:{},data:data}); }
  else { stack2 = (depth0 && depth0.title); stack2 = typeof stack2 === functionType ? stack2.call(depth0, {hash:{},data:data}) : stack2; }
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</h1>";
  if (stack2 = helpers.html) { stack2 = stack2.call(depth0, {hash:{},data:data}); }
  else { stack2 = (depth0 && depth0.html); stack2 = typeof stack2 === functionType ? stack2.call(depth0, {hash:{},data:data}) : stack2; }
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</div>\n</section>\n";
  stack2 = helpers.unless.call(depth0, (depth0 && depth0.title), {hash:{},inverse:self.noop,fn:self.program(17, program17, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  return buffer;
  });

this["JST"]["reset"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<form id=\"reset\" class=\"reset-form\" method=\"post\" novalidate=\"novalidate\">\n    <div class=\"password-wrap\">\n        <input class=\"password\" type=\"password\" placeholder=\"Password\" name=\"newpassword\" />\n    </div>\n    <div class=\"password-wrap\">\n        <input class=\"password\" type=\"password\" placeholder=\"Confirm Password\" name=\"ne2password\" />\n    </div>\n    <button class=\"button-save\" type=\"submit\">Reset Password</button>\n</form>\n";
  });

this["JST"]["settings/general"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    <a class=\"js-modal-logo\" href=\"#\"><img id=\"blog-logo\" src=\"";
  if (stack1 = helpers.logo) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.logo); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"logo\"></a>\n                ";
  return buffer;
  }

function program3(depth0,data) {
  
  
  return "\n                    <a class=\"button-add js-modal-logo\" >Upload Image</a>\n                ";
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    <a class=\"js-modal-cover\" href=\"#\"><img id=\"blog-cover\" src=\"";
  if (stack1 = helpers.cover) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.cover); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"cover photo\"></a>\n                ";
  return buffer;
  }

function program7(depth0,data) {
  
  
  return "\n                    <a class=\"button-add js-modal-cover\">Upload Image</a>\n                ";
  }

function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                        <option value=\"";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.active), {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0['package']), {hash:{},inverse:self.program(14, program14, data),fn:self.program(12, program12, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</option>\n                        ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0['package']), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                    ";
  return buffer;
  }
function program10(depth0,data) {
  
  
  return "selected";
  }

function program12(depth0,data) {
  
  var buffer = "", stack1;
  buffer += escapeExpression(((stack1 = ((stack1 = (depth0 && depth0['package'])),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " - "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0['package'])),stack1 == null || stack1 === false ? stack1 : stack1.version)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  return buffer;
  }

function program14(depth0,data) {
  
  var stack1;
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  return escapeExpression(stack1);
  }

function program16(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "<script>console.log('Hi! The theme named \"";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" does not have a package.json file or it\\'s malformed. This will be required in the future. For more info, see http://docs.ghost.org/themes/.');</script>";
  return buffer;
  }

  buffer += "<header>\n    <button class=\"button-back\">Back</button>\n    <h2 class=\"title\">General</h2>\n    <section class=\"page-actions\">\n        <button class=\"button-save\">Save</button>\n    </section>\n</header>\n\n<section class=\"content\">\n    <form id=\"settings-general\" novalidate=\"novalidate\">\n        <fieldset>\n\n            <div class=\"form-group\">\n                <label for=\"blog-title\">Blog Title</label>\n                <input id=\"blog-title\" name=\"general[title]\" type=\"text\" value=\"";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.title); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" />\n                <p>The name of your blog</p>\n            </div>\n\n            <div class=\"form-group description-container\">\n                <label for=\"blog-description\">Blog Description</label>\n                <textarea id=\"blog-description\">";
  if (stack1 = helpers.description) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.description); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</textarea>\n                <p>\n                    Describe what your blog is about\n                    <span class=\"word-count\">0</span>\n                </p>\n\n            </div>\n        </fieldset>\n            <div class=\"form-group\">\n                <label for=\"blog-logo\">Blog Logo</label>\n                ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.logo), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                <p>Display a sexy logo for your publication</p>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"blog-cover\">Blog Cover</label>\n                ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.cover), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                <p>Display a cover image on your site</p>\n            </div>\n        <fieldset>\n            <div class=\"form-group\">\n                <label for=\"email-address\">Email Address</label>\n                <input id=\"email-address\" name=\"general[email-address]\" type=\"email\" value=\"";
  if (stack1 = helpers.email) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.email); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" autocapitalize=\"off\" autocorrect=\"off\" />\n                <p>Address to use for admin notifications</p>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"postsPerPage\">Posts per page</label>\n                <input id=\"postsPerPage\" name=\"general[postsPerPage]\" type=\"number\" value=\"";
  if (stack1 = helpers.postsPerPage) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.postsPerPage); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" />\n                <p>How many posts should be displayed on each page</p>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"permalinks\">Dated Permalinks</label>\n                <input id=\"permalinks\" name=\"general[permalinks]\" type=\"checkbox\" value='permalink'/>\n                <label class=\"checkbox\" for=\"permalinks\"></label>\n                <p>Include the date in your post URLs</p>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"activeTheme\">Theme</label>\n                <select id=\"activeTheme\" name=\"general[activeTheme]\">\n                    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.availableThemes), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                </select>\n                <p>Select a theme for your blog</p>\n            </div>\n\n        </fieldset>\n    </form>\n</section>\n";
  return buffer;
  });

this["JST"]["settings/sidebar"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<header>\n    <h1 class=\"title\">Settings</h1>\n</header>\n<nav class=\"settings-menu\">\n    <ul>\n        <li class=\"general\"><a href=\"#general\">General</a></li>\n        <li class=\"users\"><a href=\"#user\">User</a></li>\n    </ul>\n</nav>";
  });

this["JST"]["settings/user-profile"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var stack1;
  if (stack1 = helpers.cover) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.cover); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  return escapeExpression(stack1);
  }

function program3(depth0,data) {
  
  var stack1, options;
  options = {hash:{},data:data};
  return escapeExpression(((stack1 = helpers.asset || (depth0 && depth0.asset)),stack1 ? stack1.call(depth0, "shared/img/user-cover.png", options) : helperMissing.call(depth0, "asset", "shared/img/user-cover.png", options)));
  }

function program5(depth0,data) {
  
  var stack1;
  if (stack1 = helpers.image) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.image); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  return escapeExpression(stack1);
  }

function program7(depth0,data) {
  
  var stack1, options;
  options = {hash:{},data:data};
  return escapeExpression(((stack1 = helpers.asset || (depth0 && depth0.asset)),stack1 ? stack1.call(depth0, "shared/img/user-image.png", options) : helperMissing.call(depth0, "asset", "shared/img/user-image.png", options)));
  }

  buffer += "<header>\n    <button class=\"button-back\">Back</button>\n    <h2 class=\"title\">Your Profile</h2>\n    <section class=\"page-actions\">\n        <button class=\"button-save\">Save</button>\n    </section>\n</header>\n\n<section class=\"content no-padding\">\n\n    <header class=\"user-profile-header\">\n        <img id=\"user-cover\" class=\"cover-image\" src=\"";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.cover), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" title=\"";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "'s Cover Image\"/>\n\n        <a class=\"edit-cover-image js-modal-cover button\" href=\"#\">Change Cover</a>\n    </header>\n\n    <form class=\"user-profile\" novalidate=\"novalidate\">\n\n        <fieldset class=\"user-details-top\">\n\n            <figure class=\"user-image\">\n                <div id=\"user-image\" class=\"img\" style=\"background-image: url(";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.image), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ");\" href=\"#\"><span class=\"hidden\">";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "'s Picture</span></div>\n                <a href=\"#\" class=\"edit-user-image js-modal-image\">Edit Picture</a>\n            </figure>\n\n            <div class=\"form-group\">\n                <label for=\"user-name\" class=\"hidden\">Full Name</label>\n                <input type=\"url\" value=\"";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" id=\"user-name\" placeholder=\"Full Name\" autocorrect=\"off\" />\n                <p>Use your real name so people can recognise you</p>\n            </div>\n\n        </fieldset>\n\n        <fieldset class=\"user-details-bottom\">\n\n            <div class=\"form-group\">\n                <label for\"user-email\">Email</label>\n                <input type=\"email\" value=\"";
  if (stack1 = helpers.email) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.email); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" id=\"user-email\" placeholder=\"Email Address\" autocapitalize=\"off\" autocorrect=\"off\" />\n                <p>Used for notifications</p>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"user-location\">Location</label>\n                <input type=\"text\" value=\"";
  if (stack1 = helpers.location) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.location); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" id=\"user-location\" />\n                <p>Where in the world do you live?</p>\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"user-website\">Website</label>\n                <input type=\"text\" value=\"";
  if (stack1 = helpers.website) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.website); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" id=\"user-website\" autocapitalize=\"off\" autocorrect=\"off\" />\n                <p>Have a website or blog other than this one? Link it!</p>\n            </div>\n\n            <div class=\"form-group bio-container\">\n                <label for=\"user-bio\">Bio</label>\n                <textarea id=\"user-bio\">";
  if (stack1 = helpers.bio) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.bio); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</textarea>\n                <p>\n                    Write about you, in 200 characters or less.\n                    <span class=\"word-count\">0</span>\n                </p>\n            </div>\n\n            <hr />\n\n        </fieldset>\n\n        <fieldset>\n\n            <div class=\"form-group\">\n                <label for=\"user-password-old\">Old Password</label>\n                <input type=\"password\" id=\"user-password-old\" />\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"user-password-new\">New Password</label>\n                <input type=\"password\" id=\"user-password-new\" />\n            </div>\n\n            <div class=\"form-group\">\n                <label for=\"user-new-password-verification\">Verify Password</label>\n                <input type=\"password\" id=\"user-new-password-verification\" />\n            </div>\n            <div class=\"form-group\">\n                <button type=\"button\" class=\"button-delete button-change-password\">Change Password</button>\n            </div>\n\n        </fieldset>\n\n    </form>\n</section>\n";
  return buffer;
  });

this["JST"]["signup"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<form id=\"signup\" class=\"signup-form\" method=\"post\" novalidate=\"novalidate\">\n    <div class=\"name-wrap\">\n        <input class=\"name\" type=\"text\" placeholder=\"Full Name\" name=\"name\" autocorrect=\"off\" />\n    </div>\n    <div class=\"email-wrap\">\n        <input class=\"email\" type=\"email\" placeholder=\"Email Address\" name=\"email\" autocapitalize=\"off\" autocorrect=\"off\" />\n    </div>\n    <div class=\"password-wrap\">\n        <input class=\"password\" type=\"password\" placeholder=\"Password\" name=\"password\" />\n    </div>\n    <button class=\"button-save\" type=\"submit\">Sign Up</button>\n</form>\n";
  });