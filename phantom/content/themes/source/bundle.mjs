import Handlebars from 'handlebars';

export const templates = {
    "author": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <section class=\"gh-archive"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publication_info_sidebar")),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":7,"column":34},"end":{"line":7,"column":98}}})) != null ? stack1 : "")
    + " gh-inner\">\n            <div class=\"gh-archive-inner\">\n                <div class=\"gh-archive-wrapper\">\n                    <h1 class=\"gh-article-title is-title\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"website") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":11,"column":24},"end":{"line":15,"column":31}}})) != null ? stack1 : "")
    + "                    </h1>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"bio") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":17,"column":20},"end":{"line":19,"column":27}}})) != null ? stack1 : "")
    + "                    <footer class=\"gh-author-meta\">\n                        <div class=\"gh-author-social\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"twitter") : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":28},"end":{"line":24,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"facebook") : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":25,"column":28},"end":{"line":27,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"linkedin") : depth0),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":28},"end":{"line":30,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"bluesky") : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":31,"column":28},"end":{"line":33,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"threads") : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":34,"column":28},"end":{"line":36,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"mastodon") : depth0),{"name":"if","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":28},"end":{"line":39,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"tiktok") : depth0),{"name":"if","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":40,"column":28},"end":{"line":42,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"youtube") : depth0),{"name":"if","hash":{},"fn":container.program(24, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":28},"end":{"line":45,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"instagram") : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":46,"column":28},"end":{"line":48,"column":35}}})) != null ? stack1 : "")
    + "                        </div>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"location") : depth0),{"name":"if","hash":{},"fn":container.program(28, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":50,"column":24},"end":{"line":52,"column":31}}})) != null ? stack1 : "")
    + "                    </footer>\n                </div>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"profile_image") : depth0),{"name":"if","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":55,"column":16},"end":{"line":57,"column":23}}})) != null ? stack1 : "")
    + "            </div>\n        </section>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return " has-sidebar";
},"4":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <a class=\"gh-author-social-link\" href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"website") || (depth0 != null ? lookupProperty(depth0,"website") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"website","hash":{},"data":data,"loc":{"start":{"line":12,"column":67},"end":{"line":12,"column":78}}}) : helper)))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":12,"column":111},"end":{"line":12,"column":119}}}) : helper)))
    + "</a>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data,"loc":{"start":{"line":14,"column":28},"end":{"line":14,"column":36}}}) : helper)))
    + "\n";
},"8":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <p class=\"gh-article-excerpt\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"bio") || (depth0 != null ? lookupProperty(depth0,"bio") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"bio","hash":{},"data":data,"loc":{"start":{"line":18,"column":54},"end":{"line":18,"column":61}}}) : helper)))
    + "</p>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"twitter"},"data":data,"loc":{"start":{"line":23,"column":71},"end":{"line":23,"column":100}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/twitter"),depth0,{"name":"icons/twitter","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"facebook"},"data":data,"loc":{"start":{"line":26,"column":71},"end":{"line":26,"column":101}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/facebook"),depth0,{"name":"icons/facebook","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"linkedin"},"data":data,"loc":{"start":{"line":29,"column":71},"end":{"line":29,"column":101}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/linkedin"),depth0,{"name":"icons/linkedin","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"bluesky"},"data":data,"loc":{"start":{"line":32,"column":71},"end":{"line":32,"column":100}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/bluesky"),depth0,{"name":"icons/bluesky","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"threads"},"data":data,"loc":{"start":{"line":35,"column":71},"end":{"line":35,"column":100}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/threads"),depth0,{"name":"icons/threads","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"20":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"mastodon"},"data":data,"loc":{"start":{"line":38,"column":71},"end":{"line":38,"column":101}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/mastodon"),depth0,{"name":"icons/mastodon","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"tiktok"},"data":data,"loc":{"start":{"line":41,"column":71},"end":{"line":41,"column":99}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/tiktok"),depth0,{"name":"icons/tiktok","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"youtube"},"data":data,"loc":{"start":{"line":44,"column":71},"end":{"line":44,"column":100}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/youtube"),depth0,{"name":"icons/youtube","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"26":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <a class=\"gh-author-social-link\" href=\""
    + container.escapeExpression((lookupProperty(helpers,"social_url")||(depth0 && lookupProperty(depth0,"social_url"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"social_url","hash":{"type":"instagram"},"data":data,"loc":{"start":{"line":47,"column":71},"end":{"line":47,"column":102}}}))
    + "\" target=\"_blank\" rel=\"noopener\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/instagram"),depth0,{"name":"icons/instagram","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"28":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <div class=\"gh-author-location\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"location") || (depth0 != null ? lookupProperty(depth0,"location") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"location","hash":{},"data":data,"loc":{"start":{"line":51,"column":60},"end":{"line":51,"column":72}}}) : helper)))
    + "</div>\n";
},"30":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <img class=\"gh-article-image\" src=\""
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"profile_image") : depth0),{"name":"img_url","hash":{"size":"s"},"data":data,"loc":{"start":{"line":56,"column":55},"end":{"line":56,"column":89}}}))
    + "\" alt=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":56,"column":96},"end":{"line":56,"column":104}}}) : helper)))
    + "\">\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    }, buffer = 
  "\n<main class=\"gh-main gh-outer\">\n\n";
  stack1 = ((helper = (helper = lookupProperty(helpers,"author") || (depth0 != null ? lookupProperty(depth0,"author") : depth0)) != null ? helper : container.hooks.helperMissing),(options={"name":"author","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":4},"end":{"line":60,"column":15}}}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!lookupProperty(helpers,"author")) { stack1 = container.hooks.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "    \n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/post-list"),depth0,{"name":"components/post-list","hash":{"showSidebar":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publication_info_sidebar")),"showTitle":false,"postFeedStyle":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"post_feed_style")),"feed":"archive"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n</main>";
},"usePartial":true,"useData":true}),
    "default": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "serif";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"title_font")),"Consistent mono",{"name":"match","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":50,"column":82},"end":{"line":50,"column":149}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    return "mono";
},"6":function(container,depth0,helpers,partials,data) {
    return "sans";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"lightbox"),depth0,{"name":"lightbox","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : (container.nullContext || {}), alias4=container.hooks.helperMissing, alias5="function", lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<!DOCTYPE html>\n<html lang=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"locale")), depth0))
    + "\">\n<head>\n\n    <title>"
    + alias2(((helper = (helper = lookupProperty(helpers,"meta_title") || (depth0 != null ? lookupProperty(depth0,"meta_title") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"meta_title","hash":{},"data":data,"loc":{"start":{"line":6,"column":11},"end":{"line":6,"column":25}}}) : helper)))
    + "</title>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    \n    <link rel=\"preload\" as=\"style\" href=\""
    + alias2((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias4).call(alias3,"built/screen.css",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":11,"column":41},"end":{"line":11,"column":69}}}))
    + "\">\n    <link rel=\"preload\" as=\"script\" href=\""
    + alias2((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias4).call(alias3,"built/source.js",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":12,"column":42},"end":{"line":12,"column":69}}}))
    + "\">\n    \n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"typography/fonts"),depth0,{"name":"typography/fonts","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n    <link rel=\"stylesheet\" type=\"text/css\" href=\""
    + alias2((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias4).call(alias3,"built/screen.css",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":18,"column":49},"end":{"line":18,"column":77}}}))
    + "\">\n\n    <style>\n        :root {\n            --background-color: "
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"site_background_color")), depth0))
    + "\n        }\n    </style>\n\n    <script>\n        /* The script for calculating the color contrast has been taken from\n        https://gomakethings.com/dynamically-changing-the-text-color-based-on-background-color-contrast-with-vanilla-js/ */\n        var accentColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color');\n        accentColor = accentColor.trim().slice(1);\n\n        if (accentColor.length === 3) {\n            accentColor = accentColor[0] + accentColor[0] + accentColor[1] + accentColor[1] + accentColor[2] + accentColor[2];\n        }\n\n        var r = parseInt(accentColor.substr(0, 2), 16);\n        var g = parseInt(accentColor.substr(2, 2), 16);\n        var b = parseInt(accentColor.substr(4, 2), 16);\n        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;\n        var textColor = (yiq >= 128) ? 'dark' : 'light';\n\n        document.documentElement.className = `has-${textColor}-text`;\n    </script>\n\n    "
    + alias2(((helper = (helper = lookupProperty(helpers,"ghost_head") || (depth0 != null ? lookupProperty(depth0,"ghost_head") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"ghost_head","hash":{},"data":data,"loc":{"start":{"line":47,"column":4},"end":{"line":47,"column":18}}}) : helper)))
    + "\n\n</head>\n<body class=\""
    + alias2(((helper = (helper = lookupProperty(helpers,"body_class") || (depth0 != null ? lookupProperty(depth0,"body_class") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"body_class","hash":{},"data":data,"loc":{"start":{"line":50,"column":13},"end":{"line":50,"column":27}}}) : helper)))
    + " has-"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias4).call(alias3,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"title_font")),"Elegant serif",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":50,"column":32},"end":{"line":50,"column":159}}})) != null ? stack1 : "")
    + "-title has-"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias4).call(alias3,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"body_font")),"Elegant serif",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":50,"column":170},"end":{"line":50,"column":241}}})) != null ? stack1 : "")
    + "-body\">\n\n<div class=\"gh-viewport\">\n    \n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/navigation"),depth0,{"name":"components/navigation","hash":{"navigationLayout":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"navigation_layout"))},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n    "
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"body") || (depth0 != null ? lookupProperty(depth0,"body") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"body","hash":{},"data":data,"loc":{"start":{"line":56,"column":4},"end":{"line":56,"column":14}}}) : helper))) != null ? stack1 : "")
    + "\n    \n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/footer"),depth0,{"name":"components/footer","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    \n</div>\n\n"
    + ((stack1 = (lookupProperty(helpers,"is")||(depth0 && lookupProperty(depth0,"is"))||alias4).call(alias3,"post, page",{"name":"is","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":62,"column":0},"end":{"line":64,"column":7}}})) != null ? stack1 : "")
    + "\n<script src=\""
    + alias2((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias4).call(alias3,"built/source.js",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":67,"column":13},"end":{"line":67,"column":40}}}))
    + "\"></script>\n\n"
    + alias2(((helper = (helper = lookupProperty(helpers,"ghost_foot") || (depth0 != null ? lookupProperty(depth0,"ghost_foot") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"ghost_foot","hash":{},"data":data,"loc":{"start":{"line":70,"column":0},"end":{"line":70,"column":14}}}) : helper)))
    + "\n\n</body>\n</html>\n";
},"usePartial":true,"useData":true}),
    "home": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/featured"),depth0,{"name":"components/featured","hash":{"limit":4,"showFeatured":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_featured_posts"))},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/header"),depth0,{"name":"components/header","hash":{"headerStyle":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style"))},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style")),"!=","Highlight",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":0},"end":{"line":8,"column":10}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/cta"),depth0,{"name":"components/cta","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/post-list"),depth0,{"name":"components/post-list","hash":{"showSidebar":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publication_info_sidebar")),"showTitle":true,"postFeedStyle":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"post_feed_style")),"feed":"home"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
    "index": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n<main class=\"gh-main\">\n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/post-list"),depth0,{"name":"components/post-list","hash":{"showSidebar":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publication_info_sidebar")),"showTitle":true,"postFeedStyle":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"post_feed_style")),"feed":"index"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</main>";
},"usePartial":true,"useData":true}),
    "page": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n<main class=\"gh-main\">\n    <article class=\"gh-article "
    + alias4(((helper = (helper = lookupProperty(helpers,"post_class") || (depth0 != null ? lookupProperty(depth0,"post_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"post_class","hash":{},"data":data,"loc":{"start":{"line":7,"column":31},"end":{"line":7,"column":45}}}) : helper)))
    + "\">\n\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,((stack1 = (data && lookupProperty(data,"page"))) && lookupProperty(stack1,"show_title_and_feature_image")),{"name":"match","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":9,"column":8},"end":{"line":17,"column":18}}})) != null ? stack1 : "")
    + "\n        <section class=\"gh-content gh-canvas is-body\">\n            "
    + alias4(((helper = (helper = lookupProperty(helpers,"content") || (depth0 != null ? lookupProperty(depth0,"content") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"content","hash":{},"data":data,"loc":{"start":{"line":20,"column":12},"end":{"line":20,"column":23}}}) : helper)))
    + "\n        </section>\n\n    </article>\n</main>\n\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <header class=\"gh-article-header gh-canvas\">\n                <h1 class=\"gh-article-title is-title\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":11,"column":54},"end":{"line":11,"column":63}}}) : helper)))
    + "</h1>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":12,"column":16},"end":{"line":14,"column":23}}})) != null ? stack1 : "")
    + "                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"feature-image"),depth0,{"name":"feature-image","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "            </header>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <p class=\"gh-article-excerpt is-body\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"custom_excerpt") || (depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"custom_excerpt","hash":{},"data":data,"loc":{"start":{"line":13,"column":58},"end":{"line":13,"column":76}}}) : helper)))
    + "</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    }, buffer = 
  "\n";
  stack1 = ((helper = (helper = lookupProperty(helpers,"post") || (depth0 != null ? lookupProperty(depth0,"post") : depth0)) != null ? helper : container.hooks.helperMissing),(options={"name":"post","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":26,"column":9}}}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!lookupProperty(helpers,"post")) { stack1 = container.hooks.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"usePartial":true,"useData":true}),
    "post": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n<main class=\"gh-main\">\n\n    <article class=\"gh-article "
    + alias4(((helper = (helper = lookupProperty(helpers,"post_class") || (depth0 != null ? lookupProperty(depth0,"post_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"post_class","hash":{},"data":data,"loc":{"start":{"line":8,"column":31},"end":{"line":8,"column":45}}}) : helper)))
    + "\">\n\n        <header class=\"gh-article-header gh-canvas\">\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"primary_tag") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":12,"column":12},"end":{"line":14,"column":19}}})) != null ? stack1 : "")
    + "            <h1 class=\"gh-article-title is-title\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":15,"column":50},"end":{"line":15,"column":59}}}) : helper)))
    + "</h1>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":16,"column":12},"end":{"line":18,"column":19}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_post_metadata")),{"name":"if","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":12},"end":{"line":43,"column":19}}})) != null ? stack1 : "")
    + "\n            "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"feature-image"),depth0,{"name":"feature-image","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n        </header>\n\n        <section class=\"gh-content gh-canvas is-body"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"enable_drop_caps_on_posts")),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":49,"column":52},"end":{"line":49,"column":109}}})) != null ? stack1 : "")
    + "\">\n            "
    + alias4(((helper = (helper = lookupProperty(helpers,"content") || (depth0 != null ? lookupProperty(depth0,"content") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"content","hash":{},"data":data,"loc":{"start":{"line":50,"column":12},"end":{"line":50,"column":23}}}) : helper)))
    + "\n        </section>\n\n    </article>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"comments") : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":55,"column":4},"end":{"line":59,"column":11}}})) != null ? stack1 : "")
    + "\n</main>\n\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <a class=\"gh-article-tag\" href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"primary_tag") : depth0)) != null ? lookupProperty(stack1,"url") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"primary_tag") : depth0)) != null ? lookupProperty(stack1,"name") : stack1), depth0))
    + "</a>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <p class=\"gh-article-excerpt is-body\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"custom_excerpt") || (depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"custom_excerpt","hash":{},"data":data,"loc":{"start":{"line":17,"column":54},"end":{"line":17,"column":72}}}) : helper)))
    + "</p>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <div class=\"gh-article-meta\">\n                <div class=\"gh-article-author-image instapaper_ignore\">\n"
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"authors") : depth0),{"name":"foreach","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":23,"column":20},"end":{"line":31,"column":32}}})) != null ? stack1 : "")
    + "                </div>\n                <div class=\"gh-article-meta-wrapper\">\n                    <h4 class=\"gh-article-author-name\">"
    + alias3(((helper = (helper = lookupProperty(helpers,"authors") || (depth0 != null ? lookupProperty(depth0,"authors") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"authors","hash":{},"data":data,"loc":{"start":{"line":34,"column":55},"end":{"line":34,"column":66}}}) : helper)))
    + "</h4>\n                    <div class=\"gh-article-meta-content\">\n                        <time class=\"gh-article-meta-date\" datetime=\""
    + alias3((lookupProperty(helpers,"date")||(depth0 && lookupProperty(depth0,"date"))||alias2).call(alias1,{"name":"date","hash":{"format":"YYYY-MM-DD"},"data":data,"loc":{"start":{"line":36,"column":69},"end":{"line":36,"column":97}}}))
    + "\">"
    + alias3((lookupProperty(helpers,"date")||(depth0 && lookupProperty(depth0,"date"))||alias2).call(alias1,{"name":"date","hash":{"format":"DD MMM YYYY"},"data":data,"loc":{"start":{"line":36,"column":99},"end":{"line":36,"column":128}}}))
    + "</time>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"reading_time") : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":24},"end":{"line":39,"column":31}}})) != null ? stack1 : "")
    + "                    </div>\n                </div>\n            </div>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"profile_image") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.program(10, data, 0),"data":data,"loc":{"start":{"line":24,"column":24},"end":{"line":30,"column":31}}})) != null ? stack1 : "");
},"8":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"url") || (depth0 != null ? lookupProperty(depth0,"url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data,"loc":{"start":{"line":25,"column":37},"end":{"line":25,"column":44}}}) : helper)))
    + "\">\n                                <img class=\"author-profile-image\" src=\""
    + alias4((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"profile_image") : depth0),{"name":"img_url","hash":{"size":"xs"},"data":data,"loc":{"start":{"line":26,"column":71},"end":{"line":26,"column":106}}}))
    + "\" alt=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":26,"column":113},"end":{"line":26,"column":121}}}) : helper)))
    + "\">\n                            </a>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <a href=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"url") || (depth0 != null ? lookupProperty(depth0,"url") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"url","hash":{},"data":data,"loc":{"start":{"line":29,"column":37},"end":{"line":29,"column":44}}}) : helper)))
    + "\">"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/avatar"),depth0,{"name":"icons/avatar","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <span class=\"gh-article-meta-length\"><span class=\"bull\">—</span> "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"reading_time") || (depth0 != null ? lookupProperty(depth0,"reading_time") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"reading_time","hash":{},"data":data,"loc":{"start":{"line":38,"column":93},"end":{"line":38,"column":109}}}) : helper)))
    + "</span>\n";
},"14":function(container,depth0,helpers,partials,data) {
    return " drop-cap";
},"16":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <div class=\"gh-comments gh-canvas\">\n            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"comments") || (depth0 != null ? lookupProperty(depth0,"comments") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"comments","hash":{},"data":data,"loc":{"start":{"line":57,"column":12},"end":{"line":57,"column":24}}}) : helper)))
    + "\n        </div>\n";
},"18":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":"4","filter":"id:-{{post.id}}","include":"authors"},"fn":container.program(19, data, 1, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":66,"column":4},"end":{"line":79,"column":12}}})) != null ? stack1 : "");
},"19":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),blockParams[0][0],{"name":"if","hash":{},"fn":container.program(20, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":67,"column":8},"end":{"line":78,"column":15}}})) != null ? stack1 : "");
},"20":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <section class=\"gh-container is-grid gh-outer\">\n                <div class=\"gh-container-inner gh-inner\">\n                    <h2 class=\"gh-container-title\">Read more</h2>\n                    <div class=\"gh-feed\">\n"
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),blockParams[1][0],{"name":"foreach","hash":{},"fn":container.program(21, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":72,"column":24},"end":{"line":74,"column":36}}})) != null ? stack1 : "")
    + "                    </div>\n                </div>\n            </section>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"lazyLoad":true},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    }, buffer = 
  "\n";
  stack1 = ((helper = (helper = lookupProperty(helpers,"post") || (depth0 != null ? lookupProperty(depth0,"post") : depth0)) != null ? helper : container.hooks.helperMissing),(options={"name":"post","hash":{},"fn":container.program(1, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":4,"column":0},"end":{"line":63,"column":9}}}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!lookupProperty(helpers,"post")) { stack1 = container.hooks.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_related_articles")),{"name":"if","hash":{},"fn":container.program(18, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":65,"column":0},"end":{"line":80,"column":7}}})) != null ? stack1 : "");
},"usePartial":true,"useData":true,"useBlockParams":true}),
    "tag": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <section class=\"gh-archive"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":7,"column":34},"end":{"line":7,"column":72}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publication_info_sidebar")),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":7,"column":72},"end":{"line":7,"column":136}}})) != null ? stack1 : "")
    + " gh-inner\">\n            <div class=\"gh-archive-inner\">\n                <header class=\"gh-archive-wrapper\">\n                    <h1 class=\"gh-article-title is-title\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":10,"column":58},"end":{"line":10,"column":66}}}) : helper)))
    + "</h1>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"description") : depth0),{"name":"if","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":11,"column":20},"end":{"line":13,"column":27}}})) != null ? stack1 : "")
    + "                </header>\n                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"feature-image"),depth0,{"name":"feature-image","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "            </div>\n        </section>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return " has-image";
},"4":function(container,depth0,helpers,partials,data) {
    return " has-sidebar";
},"6":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <p class=\"gh-article-excerpt\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"description") || (depth0 != null ? lookupProperty(depth0,"description") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"description","hash":{},"data":data,"loc":{"start":{"line":12,"column":54},"end":{"line":12,"column":69}}}) : helper)))
    + "</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    }, buffer = 
  "\n<main class=\"gh-main gh-outer\">\n\n";
  stack1 = ((helper = (helper = lookupProperty(helpers,"tag") || (depth0 != null ? lookupProperty(depth0,"tag") : depth0)) != null ? helper : container.hooks.helperMissing),(options={"name":"tag","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":4},"end":{"line":18,"column":12}}}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!lookupProperty(helpers,"tag")) { stack1 = container.hooks.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/post-list"),depth0,{"name":"components/post-list","hash":{"showSidebar":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publication_info_sidebar")),"showTitle":false,"postFeedStyle":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"post_feed_style")),"feed":"archive"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n</main>";
},"usePartial":true,"useData":true})
};
export const partials = {
    "components/cta": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(data && lookupProperty(data,"member")),{"name":"unless","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":4},"end":{"line":24,"column":15}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style")),"!=","Landing",{"name":"match","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":3,"column":8},"end":{"line":23,"column":18}}})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style")),"!=","Search",{"name":"match","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":8},"end":{"line":22,"column":18}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style")),"!=","Off",{"name":"match","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":5,"column":8},"end":{"line":21,"column":18}}})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"posts") : depth0)) != null ? lookupProperty(stack1,"length") : stack1),">=",7,{"name":"match","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":8},"end":{"line":20,"column":18}}})) != null ? stack1 : "");
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <section class=\"gh-cta gh-outer\">\n                <div class=\"gh-cta-inner gh-inner\">\n                    <div class=\"gh-cta-content\">\n                        <h2 class=\"gh-cta-title is-title\">\n                            "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_heading")),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(9, data, 0),"data":data,"loc":{"start":{"line":11,"column":28},"end":{"line":11,"column":114}}})) != null ? stack1 : "")
    + "\n                        </h2>\n                        <p class=\"gh-cta-description is-body\">\n                            "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_subheading")),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(13, data, 0),"data":data,"loc":{"start":{"line":14,"column":28},"end":{"line":14,"column":126}}})) != null ? stack1 : "")
    + "\n                        </p>\n                    </div>\n                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"email-subscription"),depth0,{"name":"email-subscription","hash":{"email_field_id":"cta-email"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "                </div>\n            </section>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_heading")), depth0));
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0));
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_subheading")), depth0));
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"description")), depth0));
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_enabled")),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":25,"column":7}}})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
    "components/featured": Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":(depth0 != null ? lookupProperty(depth0,"limit") : depth0),"include":"authors","filter":"featured:true"},"fn":container.program(2, data, 1, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":2,"column":4},"end":{"line":13,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <section class=\"gh-featured gh-outer\">\n            <div class=\"gh-featured-inner gh-inner\">\n                <h2 class=\"gh-featured-title\">Featured</h2>\n                <div class=\"gh-featured-feed\">\n"
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),blockParams[0][0],{"name":"foreach","hash":{},"fn":container.program(3, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":7,"column":20},"end":{"line":9,"column":32}}})) != null ? stack1 : "")
    + "                </div>\n            </div>\n        </section>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"imageSizes":"80px"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"showFeatured") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":1,"column":0},"end":{"line":14,"column":7}}})) != null ? stack1 : "");
},"usePartial":true,"useData":true,"useBlockParams":true}),
    "components/footer": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return " has-accent-color";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <img src=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"logo")), depth0))
    + "\" alt=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "\">\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(data && lookupProperty(data,"member")),{"name":"unless","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":12},"end":{"line":31,"column":23}}})) != null ? stack1 : "");
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <section class=\"gh-footer-signup\">\n                    <h2 class=\"gh-footer-signup-header is-title\">\n                        "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_heading")),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(11, data, 0),"data":data,"loc":{"start":{"line":24,"column":24},"end":{"line":24,"column":110}}})) != null ? stack1 : "")
    + "\n                    </h2>\n                    <p class=\"gh-footer-signup-subhead is-body\">\n                        "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_subheading")),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.program(15, data, 0),"data":data,"loc":{"start":{"line":27,"column":24},"end":{"line":27,"column":122}}})) != null ? stack1 : "")
    + "\n                    </p>\n                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"email-subscription"),depth0,{"name":"email-subscription","hash":{"email_field_id":"footer-email"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "                </section>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_heading")), depth0));
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0));
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"signup_subheading")), depth0));
},"15":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"description")), depth0));
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<footer class=\"gh-footer"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_and_footer_color")),"Accent color",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":24},"end":{"line":1,"column":108}}})) != null ? stack1 : "")
    + " gh-outer\">\n    <div class=\"gh-footer-inner gh-inner\">\n\n        <div class=\"gh-footer-bar\">\n            <span class=\"gh-footer-logo is-title\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"logo")),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(5, data, 0),"data":data,"loc":{"start":{"line":6,"column":16},"end":{"line":10,"column":23}}})) != null ? stack1 : "")
    + "            </span>\n            <nav class=\"gh-footer-menu\">\n                "
    + container.escapeExpression((lookupProperty(helpers,"navigation")||(depth0 && lookupProperty(depth0,"navigation"))||alias2).call(alias1,{"name":"navigation","hash":{"type":"secondary"},"data":data,"loc":{"start":{"line":13,"column":16},"end":{"line":13,"column":47}}}))
    + "\n            </nav>\n            <div class=\"gh-footer-copyright\">\n                Powered by <a href=\"https://ghost.org/\" target=\"_blank\" rel=\"noopener\">Ghost</a>\n            </div>\n        </div>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_enabled")),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":8},"end":{"line":32,"column":15}}})) != null ? stack1 : "")
    + "\n    </div>\n</footer>";
},"usePartial":true,"useData":true}),
    "components/header-content": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "magazine";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Highlight",{"name":"match","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":1,"column":70},"end":{"line":1,"column":132}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    return "highlight";
},"6":function(container,depth0,helpers,partials,data) {
    return "classic";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"cover_image")),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":174},"end":{"line":1,"column":216}}})) != null ? stack1 : "");
},"9":function(container,depth0,helpers,partials,data) {
    return " has-image";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"!=","Magazine",{"name":"match","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":5,"column":8},"end":{"line":11,"column":18}}})) != null ? stack1 : "");
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"!=","Highlight",{"name":"match","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":8},"end":{"line":10,"column":18}}})) != null ? stack1 : "");
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"cover_image")),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":7,"column":12},"end":{"line":9,"column":19}}})) != null ? stack1 : "");
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <img class=\"gh-header-image\" src=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"cover_image")), depth0))
    + "\" alt=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "\">\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <div class=\"gh-header-left\">\n"
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"limit":"1"},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":19,"column":16},"end":{"line":21,"column":28}}})) != null ? stack1 : "")
    + "            </div>\n            <div class=\"gh-header-middle\">\n"
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"limit":"3","from":"2"},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":16},"end":{"line":26,"column":28}}})) != null ? stack1 : "")
    + "            </div>\n            <div class=\"gh-header-right\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_featured_posts")),{"name":"if","hash":{},"fn":container.program(21, data, 0),"inverse":container.program(23, data, 0),"data":data,"loc":{"start":{"line":29,"column":16},"end":{"line":37,"column":23}}})) != null ? stack1 : "")
    + "            </div>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"imageSizes":"(max-width: 767px) calc(100vw - max(8vmin, 40px)), 640px"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"19":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/featured"),depth0,{"name":"components/featured","hash":{"limit":6,"showFeatured":((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_featured_posts"))},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"23":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <div class=\"gh-featured-feed\">\n"
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"limit":"6","from":"5"},"fn":container.program(24, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":24},"end":{"line":35,"column":36}}})) != null ? stack1 : "")
    + "                    </div>\n";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"imageSizes":"80px"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"26":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"limit":"7"},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":12},"end":{"line":61,"column":24}}})) != null ? stack1 : "");
},"27":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(data && lookupProperty(data,"number")),2,{"name":"match","hash":{},"fn":container.program(28, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":44,"column":16},"end":{"line":46,"column":26}}})) != null ? stack1 : "")
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(data && lookupProperty(data,"number")),5,{"name":"match","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":47,"column":16},"end":{"line":49,"column":26}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(data && lookupProperty(data,"first")),{"name":"if","hash":{},"fn":container.program(32, data, 0),"inverse":container.program(19, data, 0),"data":data,"loc":{"start":{"line":50,"column":16},"end":{"line":54,"column":23}}})) != null ? stack1 : "")
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(data && lookupProperty(data,"number")),4,{"name":"match","hash":{},"fn":container.program(34, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":55,"column":16},"end":{"line":57,"column":26}}})) != null ? stack1 : "")
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(data && lookupProperty(data,"number")),7,{"name":"match","hash":{},"fn":container.program(34, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":58,"column":16},"end":{"line":60,"column":26}}})) != null ? stack1 : "");
},"28":function(container,depth0,helpers,partials,data) {
    return "                    <div class=\"gh-header-left\">\n";
},"30":function(container,depth0,helpers,partials,data) {
    return "                    <div class=\"gh-header-right\">\n";
},"32":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"imageSizes":"640px"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"34":function(container,depth0,helpers,partials,data) {
    return "                    </div>\n";
},"36":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <h1 class=\"gh-header-title is-title\">"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_text")),{"name":"if","hash":{},"fn":container.program(37, data, 0),"inverse":container.program(39, data, 0),"data":data,"loc":{"start":{"line":66,"column":49},"end":{"line":66,"column":135}}})) != null ? stack1 : "")
    + "</h1>\n            "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"email-subscription"),depth0,{"name":"email-subscription","hash":{"email_field_id":"header-email"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"37":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_text")), depth0));
},"39":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"description")), depth0));
},"41":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <h1 class=\"gh-header-title is-title\">"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_text")),{"name":"if","hash":{},"fn":container.program(37, data, 0),"inverse":container.program(39, data, 0),"data":data,"loc":{"start":{"line":72,"column":49},"end":{"line":72,"column":135}}})) != null ? stack1 : "")
    + "</h1>\n            <form class=\"gh-form\">\n                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/search"),depth0,{"name":"icons/search","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "                <button class=\"gh-form-input\" data-ghost-search>Search posts, tags and authors</button>\n            </form>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<section class=\"gh-header is-"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Magazine",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":29},"end":{"line":1,"column":142}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"background_image")),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":142},"end":{"line":1,"column":223}}})) != null ? stack1 : "")
    + " gh-outer\">\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"background_image")),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":4},"end":{"line":12,"column":11}}})) != null ? stack1 : "")
    + "\n    <div class=\"gh-header-inner gh-inner\">\n\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Highlight",{"name":"match","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":17,"column":8},"end":{"line":39,"column":18}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Magazine",{"name":"match","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":42,"column":8},"end":{"line":62,"column":18}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Landing",{"name":"match","hash":{},"fn":container.program(36, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":65,"column":8},"end":{"line":68,"column":18}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Search",{"name":"match","hash":{},"fn":container.program(41, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":71,"column":8},"end":{"line":77,"column":18}}})) != null ? stack1 : "")
    + "\n    </div>\n\n</section>";
},"usePartial":true,"useData":true}),
    "components/header": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Highlight",{"name":"match","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":3,"column":4},"end":{"line":17,"column":14}}})) != null ? stack1 : "")
    + "\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/header-content"),depth0,{"name":"components/header-content","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Magazine",{"name":"match","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(5, data, 0),"data":data,"loc":{"start":{"line":5,"column":4},"end":{"line":17,"column":4}}})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"Landing",{"name":"match","hash":{},"fn":container.program(6, data, 0),"inverse":container.program(10, data, 0),"data":data,"loc":{"start":{"line":8,"column":8},"end":{"line":16,"column":18}}})) != null ? stack1 : "")
    + "    ";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_enabled")),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":9,"column":12},"end":{"line":13,"column":19}}})) != null ? stack1 : "");
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(data && lookupProperty(data,"member")),{"name":"unless","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":16},"end":{"line":12,"column":27}}})) != null ? stack1 : "");
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/header-content"),depth0,{"name":"components/header-content","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"components/header-content"),depth0,{"name":"components/header-content","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"headerStyle") : depth0),"!=","Off",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":19,"column":10}}})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
    "components/navigation": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "left-logo";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"navigationLayout") : depth0),"Stacked",{"name":"match","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":1,"column":106},"end":{"line":1,"column":173}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    return "stacked";
},"6":function(container,depth0,helpers,partials,data) {
    return "middle-logo";
},"8":function(container,depth0,helpers,partials,data) {
    return " has-accent-color";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <img src=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"logo")), depth0))
    + "\" alt=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "\">\n";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"navigationLayout") : depth0),"Stacked",{"name":"match","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":16},"end":{"line":24,"column":26}}})) != null ? stack1 : "");
},"15":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"search-toggle"),depth0,{"name":"search-toggle","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"navigationLayout") : depth0),"Stacked",{"name":"match","hash":{},"fn":container.noop,"inverse":container.program(15, data, 0),"data":data,"loc":{"start":{"line":30,"column":16},"end":{"line":32,"column":26}}})) != null ? stack1 : "");
},"19":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"search-toggle"),depth0,{"name":"search-toggle","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "                <div class=\"gh-navigation-members\">\n"
    + ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(data && lookupProperty(data,"member")),{"name":"unless","hash":{},"fn":container.program(20, data, 0),"inverse":container.program(26, data, 0),"data":data,"loc":{"start":{"line":36,"column":20},"end":{"line":47,"column":31}}})) != null ? stack1 : "")
    + "                </div>\n";
},"20":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_invite_only")),{"name":"unless","hash":{},"fn":container.program(21, data, 0),"inverse":container.program(24, data, 0),"data":data,"loc":{"start":{"line":37,"column":24},"end":{"line":44,"column":35}}})) != null ? stack1 : "");
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <a href=\"#/portal/signin\" data-portal=\"signin\">Sign in</a>\n"
    + ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"hideSubscribeButton") : depth0),{"name":"unless","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":39,"column":28},"end":{"line":41,"column":39}}})) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data) {
    return "                                <a class=\"gh-button\" href=\"#/portal/signup\" data-portal=\"signup\">Subscribe</a>\n";
},"24":function(container,depth0,helpers,partials,data) {
    return "                            <a class=\"gh-button\" href=\"#/portal/signin\" data-portal=\"signin\">Sign in</a>\n";
},"26":function(container,depth0,helpers,partials,data) {
    return "                        <a class=\"gh-button\" href=\"#/portal/account\" data-portal=\"account\">Account</a>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<header id=\"gh-navigation\" class=\"gh-navigation is-"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"navigationLayout") : depth0),"Logo on the left",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":51},"end":{"line":1,"column":183}}})) != null ? stack1 : "")
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_and_footer_color")),"Accent color",{"name":"match","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":183},"end":{"line":1,"column":267}}})) != null ? stack1 : "")
    + " gh-outer\">\n    <div class=\"gh-navigation-inner gh-inner\">\n\n        <div class=\"gh-navigation-brand\">\n            <a class=\"gh-navigation-logo is-title\" href=\""
    + alias3(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"url")), depth0))
    + "\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"logo")),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.program(12, data, 0),"data":data,"loc":{"start":{"line":6,"column":16},"end":{"line":10,"column":23}}})) != null ? stack1 : "")
    + "            </a>\n            "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"search-toggle"),depth0,{"name":"search-toggle","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "            <button class=\"gh-burger gh-icon-button\" aria-label=\"Menu\">\n                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/burger"),depth0,{"name":"icons/burger","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/close"),depth0,{"name":"icons/close","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "            </button>\n        </div>\n\n        <nav class=\"gh-navigation-menu\">\n            "
    + alias3(((helper = (helper = lookupProperty(helpers,"navigation") || (depth0 != null ? lookupProperty(depth0,"navigation") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"navigation","hash":{},"data":data,"loc":{"start":{"line":20,"column":12},"end":{"line":20,"column":26}}}) : helper)))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_enabled")),{"name":"unless","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":12},"end":{"line":25,"column":23}}})) != null ? stack1 : "")
    + "        </nav>\n\n        <div class=\"gh-navigation-actions\">\n"
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_enabled")),{"name":"unless","hash":{},"fn":container.program(17, data, 0),"inverse":container.program(19, data, 0),"data":data,"loc":{"start":{"line":29,"column":12},"end":{"line":49,"column":23}}})) != null ? stack1 : "")
    + "        </div>\n\n    </div>\n</header>\n";
},"usePartial":true,"useData":true}),
    "components/post-list": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "list";
},"3":function(container,depth0,helpers,partials,data) {
    return "grid";
},"5":function(container,depth0,helpers,partials,data) {
    return " has-sidebar";
},"7":function(container,depth0,helpers,partials,data) {
    return " no-image";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <h2 class=\"gh-container-title\">\n                "
    + ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"title") : depth0),{"name":"unless","hash":{},"fn":container.program(10, data, 0),"inverse":container.program(12, data, 0),"data":data,"loc":{"start":{"line":14,"column":16},"end":{"line":14,"column":67}}})) != null ? stack1 : "")
    + "\n            </h2>\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "Latest";
},"12":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title","hash":{},"data":data,"loc":{"start":{"line":14,"column":47},"end":{"line":14,"column":56}}}) : helper)));
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style")),"Highlight",{"name":"match","hash":{},"fn":container.program(15, data, 0),"inverse":container.program(25, data, 0),"data":data,"loc":{"start":{"line":23,"column":20},"end":{"line":55,"column":30}}})) != null ? stack1 : "");
},"15":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_featured_posts")),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.program(21, data, 0),"data":data,"loc":{"start":{"line":24,"column":24},"end":{"line":40,"column":31}}})) != null ? stack1 : "");
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"posts") : depth0)) != null ? lookupProperty(stack1,"length") : stack1),">=",4,{"name":"match","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":25,"column":28},"end":{"line":31,"column":38}}})) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":"16","include":"authors"},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":26,"column":32},"end":{"line":30,"column":40}}})) != null ? stack1 : "");
},"18":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"from":"5"},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":27,"column":36},"end":{"line":29,"column":48}}})) != null ? stack1 : "");
},"19":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"lazyLoad":true},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"posts") : depth0)) != null ? lookupProperty(stack1,"length") : stack1),">=",10,{"name":"match","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":28},"end":{"line":39,"column":38}}})) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":"22","include":"authors"},"fn":container.program(23, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":34,"column":32},"end":{"line":38,"column":40}}})) != null ? stack1 : "");
},"23":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"from":"11"},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":35,"column":36},"end":{"line":37,"column":48}}})) != null ? stack1 : "");
},"25":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"header_style")),"Magazine",{"name":"match","hash":{},"fn":container.program(26, data, 0),"inverse":container.program(31, data, 0),"data":data,"loc":{"start":{"line":41,"column":20},"end":{"line":55,"column":20}}})) != null ? stack1 : "");
},"26":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"posts") : depth0)) != null ? lookupProperty(stack1,"length") : stack1),">=",7,{"name":"match","hash":{},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":42,"column":24},"end":{"line":48,"column":34}}})) != null ? stack1 : "");
},"27":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":"19","include":"authors"},"fn":container.program(28, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":28},"end":{"line":47,"column":36}}})) != null ? stack1 : "");
},"28":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{"from":"8"},"fn":container.program(29, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":44,"column":32},"end":{"line":46,"column":44}}})) != null ? stack1 : "");
},"29":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"lazyLoad":true},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"31":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":"12","include":"authors"},"fn":container.program(32, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":50,"column":24},"end":{"line":54,"column":32}}})) != null ? stack1 : "")
    + "                    ";
},"32":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{},"fn":container.program(33, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":51,"column":28},"end":{"line":53,"column":40}}})) != null ? stack1 : "");
},"33":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"lazyLoad":true},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"35":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pagination") : depth0)) != null ? lookupProperty(stack1,"page") : stack1),2,{"name":"match","hash":{},"fn":container.program(36, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":60,"column":20},"end":{"line":66,"column":30}}})) != null ? stack1 : "")
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{},"fn":container.program(40, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":67,"column":20},"end":{"line":69,"column":32}}})) != null ? stack1 : "");
},"36":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"get")||(depth0 && lookupProperty(depth0,"get"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"posts",{"name":"get","hash":{"limit":((stack1 = (data && lookupProperty(data,"config"))) && lookupProperty(stack1,"posts_per_page")),"include":"authors"},"fn":container.program(37, data, 1, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":61,"column":24},"end":{"line":65,"column":32}}})) != null ? stack1 : "");
},"37":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),blockParams[0][0],{"name":"foreach","hash":{},"fn":container.program(38, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":62,"column":28},"end":{"line":64,"column":40}}})) != null ? stack1 : "");
},"38":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"40":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"post-card"),depth0,{"name":"post-card","hash":{"lazyLoad":true},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"42":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"posts") : depth0),{"name":"foreach","hash":{},"fn":container.program(40, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":74,"column":20},"end":{"line":76,"column":32}}})) != null ? stack1 : "");
},"44":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <div class=\"gh-more is-title\">\n                    <a href=\""
    + container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"url")), depth0))
    + "/page/2\">See all "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/arrow"),depth0,{"name":"icons/arrow","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</a>\n                </div>\n";
},"46":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <aside class=\"gh-sidebar\">\n                <div class=\"gh-sidebar-inner\">\n                    <section class=\"gh-about\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"icon")),{"name":"if","hash":{},"fn":container.program(47, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":92,"column":24},"end":{"line":94,"column":31}}})) != null ? stack1 : "")
    + "                        <h3 class=\"gh-about-title is-title\">"
    + container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "</h3>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"description")),{"name":"if","hash":{},"fn":container.program(49, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":96,"column":24},"end":{"line":98,"column":31}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"members_enabled")),{"name":"if","hash":{},"fn":container.program(51, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":99,"column":24},"end":{"line":109,"column":31}}})) != null ? stack1 : "")
    + "                    </section>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"recommendations_enabled")),{"name":"if","hash":{},"fn":container.program(58, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":111,"column":20},"end":{"line":117,"column":27}}})) != null ? stack1 : "")
    + "                </div>\n            </aside>\n";
},"47":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <img class=\"gh-about-icon\" src=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"icon")), depth0))
    + "\" alt=\""
    + alias2(alias1(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"title")), depth0))
    + "\" loading=\"lazy\">\n";
},"49":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <p class=\"gh-about-description is-body\">"
    + container.escapeExpression(container.lambda(((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"description")), depth0))
    + "</p>\n";
},"51":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),(data && lookupProperty(data,"member")),{"name":"unless","hash":{},"fn":container.program(52, data, 0),"inverse":container.program(54, data, 0),"data":data,"loc":{"start":{"line":100,"column":28},"end":{"line":108,"column":39}}})) != null ? stack1 : "");
},"52":function(container,depth0,helpers,partials,data) {
    return "                                <button class=\"gh-button\" data-portal=\"signup\">Subscribe</button>\n";
},"54":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"site"))) && lookupProperty(stack1,"paid_members_enabled")),{"name":"if","hash":{},"fn":container.program(55, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":103,"column":32},"end":{"line":107,"column":39}}})) != null ? stack1 : "");
},"55":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"unless").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"member"))) && lookupProperty(stack1,"paid")),{"name":"unless","hash":{},"fn":container.program(56, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":104,"column":36},"end":{"line":106,"column":47}}})) != null ? stack1 : "");
},"56":function(container,depth0,helpers,partials,data) {
    return "                                        <button class=\"gh-button\" data-portal=\"upgrade\">Upgrade</button>\n";
},"58":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <section class=\"gh-recommendations\">\n                            <h4 class=\"gh-sidebar-title\">Recommendations</h4>\n                            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"recommendations") || (depth0 != null ? lookupProperty(depth0,"recommendations") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"recommendations","hash":{},"data":data,"loc":{"start":{"line":114,"column":28},"end":{"line":114,"column":47}}}) : helper)))
    + "\n                            <button data-portal=\"recommendations\">See all "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/arrow"),depth0,{"name":"icons/arrow","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</button>\n                        </section>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n<section class=\"gh-container is-"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"postFeedStyle") : depth0),"List",{"name":"match","hash":{},"fn":container.program(1, data, 0, blockParams),"inverse":container.program(3, data, 0, blockParams),"data":data,"blockParams":blockParams,"loc":{"start":{"line":9,"column":32},"end":{"line":9,"column":89}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"showSidebar") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":9,"column":89},"end":{"line":9,"column":127}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_images_in_feed")),{"name":"unless","hash":{},"fn":container.program(7, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":9,"column":127},"end":{"line":9,"column":186}}})) != null ? stack1 : "")
    + " gh-outer\">\n    <div class=\"gh-container-inner gh-inner\">\n        \n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"showTitle") : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":12,"column":8},"end":{"line":16,"column":15}}})) != null ? stack1 : "")
    + "\n        <main class=\"gh-main\">\n            <div class=\"gh-feed\">\n\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feed") : depth0),"home",{"name":"match","hash":{},"fn":container.program(14, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":22,"column":16},"end":{"line":56,"column":26}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feed") : depth0),"index",{"name":"match","hash":{},"fn":container.program(35, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":59,"column":16},"end":{"line":70,"column":26}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feed") : depth0),"archive",{"name":"match","hash":{},"fn":container.program(42, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":73,"column":16},"end":{"line":77,"column":26}}})) != null ? stack1 : "")
    + "\n            </div>\n\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pagination") : depth0)) != null ? lookupProperty(stack1,"pages") : stack1),">",1,{"name":"match","hash":{},"fn":container.program(44, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":81,"column":12},"end":{"line":85,"column":22}}})) != null ? stack1 : "")
    + "        </main>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"showSidebar") : depth0),{"name":"if","hash":{},"fn":container.program(46, data, 0, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams,"loc":{"start":{"line":88,"column":8},"end":{"line":120,"column":15}}})) != null ? stack1 : "")
    + "\n    </div>\n</section>";
},"usePartial":true,"useData":true,"useBlockParams":true}),
    "email-subscription": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<form class=\"gh-form\" data-members-form>\n    <input class=\"gh-form-input\" id=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"email_field_id") || (depth0 != null ? lookupProperty(depth0,"email_field_id") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"email_field_id","hash":{},"data":data,"loc":{"start":{"line":2,"column":37},"end":{"line":2,"column":55}}}) : helper)))
    + "\" name=\"email\" type=\"email\" placeholder=\"jamie@example.com\" required data-members-email>\n    <button class=\"gh-button\" type=\"submit\" aria-label=\"Subscribe\">\n        <span><span>Subscribe</span> "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/arrow"),depth0,{"name":"icons/arrow","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</span>\n        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/loader"),depth0,{"name":"icons/loader","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/checkmark"),depth0,{"name":"icons/checkmark","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    </button>\n    <p data-members-error></p>\n</form>";
},"usePartial":true,"useData":true}),
    "feature-image": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <figure class=\"gh-article-image\">\n        <img\n            srcset=\""
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"s"},"data":data,"loc":{"start":{"line":4,"column":20},"end":{"line":4,"column":54}}}))
    + " 320w,\n                    "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"m"},"data":data,"loc":{"start":{"line":5,"column":20},"end":{"line":5,"column":54}}}))
    + " 600w,\n                    "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"l"},"data":data,"loc":{"start":{"line":6,"column":20},"end":{"line":6,"column":54}}}))
    + " 960w,\n                    "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"xl"},"data":data,"loc":{"start":{"line":7,"column":20},"end":{"line":7,"column":55}}}))
    + " 1200w,\n                    "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"xxl"},"data":data,"loc":{"start":{"line":8,"column":20},"end":{"line":8,"column":56}}}))
    + " 2000w\"\n            sizes=\"(max-width: 1200px) 100vw, 1120px\"\n            src=\""
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"xl"},"data":data,"loc":{"start":{"line":10,"column":17},"end":{"line":10,"column":52}}}))
    + "\"\n            alt=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image_alt") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":11,"column":17},"end":{"line":11,"column":87}}})) != null ? stack1 : "")
    + "\"\n        >\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image_caption") : depth0),{"name":"if","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":13,"column":8},"end":{"line":15,"column":15}}})) != null ? stack1 : "")
    + "    </figure>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"feature_image_alt") || (depth0 != null ? lookupProperty(depth0,"feature_image_alt") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"feature_image_alt","hash":{},"data":data,"loc":{"start":{"line":11,"column":42},"end":{"line":11,"column":63}}}) : helper)));
},"4":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title","hash":{},"data":data,"loc":{"start":{"line":11,"column":71},"end":{"line":11,"column":80}}}) : helper)));
},"6":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <figcaption>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"feature_image_caption") || (depth0 != null ? lookupProperty(depth0,"feature_image_caption") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"feature_image_caption","hash":{},"data":data,"loc":{"start":{"line":14,"column":24},"end":{"line":14,"column":49}}}) : helper)))
    + "</figcaption>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":17,"column":7}}})) != null ? stack1 : "");
},"useData":true}),
    "icons/arrow": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" fill=\"currentColor\" viewBox=\"0 0 256 256\"><path d=\"M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z\"></path></svg>";
},"useData":true}),
    "icons/avatar": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M3.513 18.998C4.749 15.504 8.082 13 12 13s7.251 2.504 8.487 5.998C18.47 21.442 15.417 23 12 23s-6.47-1.558-8.487-4.002zM12 12c2.21 0 4-2.79 4-5s-1.79-4-4-4-4 1.79-4 4 1.79 5 4 5z\" fill=\"#FFF\"/></g></svg>\n";
},"useData":true}),
    "icons/bluesky": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M11.8868 11.3624C10.8107 9.1288 7.87874 4.96656 5.15331 2.91348C3.18679 1.43245 0 0.28612 0 3.93314C0 4.66121 0.416033 10.0519 0.660462 10.927C1.50889 13.9693 4.60131 14.7453 7.352 14.2758C2.54378 15.0967 1.32092 17.8158 3.9624 20.535C8.97901 25.6994 11.1728 19.2393 11.7346 17.584C11.8385 17.2784 11.8868 17.1365 11.8868 17.262C11.8868 17.1365 11.9351 17.2784 12.0391 17.584C12.6008 19.2393 14.7946 25.6994 19.8113 20.535C22.4527 17.8158 21.2298 15.0967 16.4217 14.2758C19.1723 14.7453 22.2648 13.9693 23.1132 10.927C23.3576 10.0519 23.7736 4.66121 23.7736 3.93314C23.7736 0.28612 20.5872 1.43245 18.6204 2.91348C15.8949 4.96656 12.963 9.1288 11.8868 11.3624Z\" fill=\"currentColor\"/>\n</svg>";
},"useData":true}),
    "icons/burger": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 256 256\"><path d=\"M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z\"></path></svg>";
},"useData":true}),
    "icons/checkmark": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"checkmark\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 52 52\">\n    <path class=\"checkmark__check\" fill=\"none\" d=\"M14.1 27.2l7.1 7.2 16.7-16.8\"/>\n    <style>\n        .checkmark {\n            width: 40px;\n            height: 40px;\n            display: block;\n            stroke-width: 2.5;\n            stroke: currentColor;\n            stroke-miterlimit: 10;\n        }\n\n        .checkmark__check {\n            transform-origin: 50% 50%;\n            stroke-dasharray: 48;\n            stroke-dashoffset: 48;\n            animation: stroke .3s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;\n        }\n\n        @keyframes stroke {\n            100% { stroke-dashoffset: 0; }\n        }\n    </style>\n</svg>";
},"useData":true}),
    "icons/close": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 256 256\"><path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"></path></svg>";
},"useData":true}),
    "icons/facebook": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\"><path d=\"M23.9981 11.9991C23.9981 5.37216 18.626 0 11.9991 0C5.37216 0 0 5.37216 0 11.9991C0 17.9882 4.38789 22.9522 10.1242 23.8524V15.4676H7.07758V11.9991H10.1242V9.35553C10.1242 6.34826 11.9156 4.68714 14.6564 4.68714C15.9692 4.68714 17.3424 4.92149 17.3424 4.92149V7.87439H15.8294C14.3388 7.87439 13.8739 8.79933 13.8739 9.74824V11.9991H17.2018L16.6698 15.4676H13.8739V23.8524C19.6103 22.9522 23.9981 17.9882 23.9981 11.9991Z\"/></svg>";
},"useData":true}),
    "icons/fire": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg width=\"16\" height=\"17\" viewBox=\"0 0 16 17\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M4.49365 4.58752C3.53115 6.03752 2.74365 7.70002 2.74365 9.25002C2.74365 10.6424 3.29678 11.9778 4.28134 12.9623C5.26591 13.9469 6.60127 14.5 7.99365 14.5C9.38604 14.5 10.7214 13.9469 11.706 12.9623C12.6905 11.9778 13.2437 10.6424 13.2437 9.25002C13.2437 6.00002 10.9937 3.50002 9.16865 1.68127L6.99365 6.25002L4.49365 4.58752Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>\n</svg>";
},"useData":true}),
    "icons/instagram": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M12 2.982C14.937 2.982 15.285 2.993 16.445 3.046C17.1424 3.05412 17.8331 3.18233 18.487 3.425C18.965 3.60111 19.3973 3.88237 19.752 4.248C20.1176 4.60269 20.3989 5.035 20.575 5.513C20.8177 6.16685 20.9459 6.85762 20.954 7.555C21.007 8.715 21.018 9.063 21.018 12C21.018 14.937 21.007 15.285 20.954 16.445C20.9459 17.1424 20.8177 17.8331 20.575 18.487C20.3919 18.9615 20.1116 19.3924 19.752 19.752C19.3924 20.1116 18.9615 20.3919 18.487 20.575C17.8331 20.8177 17.1424 20.9459 16.445 20.954C15.285 21.007 14.937 21.018 12 21.018C9.063 21.018 8.715 21.007 7.555 20.954C6.85762 20.9459 6.16685 20.8177 5.513 20.575C5.035 20.3989 4.60269 20.1176 4.248 19.752C3.88237 19.3973 3.60111 18.965 3.425 18.487C3.18233 17.8331 3.05412 17.1424 3.046 16.445C2.993 15.285 2.982 14.937 2.982 12C2.982 9.063 2.993 8.715 3.046 7.555C3.05412 6.85762 3.18233 6.16685 3.425 5.513C3.60111 5.035 3.88237 4.60269 4.248 4.248C4.60269 3.88237 5.035 3.60111 5.513 3.425C6.16685 3.18233 6.85762 3.05412 7.555 3.046C8.715 2.993 9.063 2.982 12 2.982ZM12 1C9.013 1 8.638 1.013 7.465 1.066C6.55258 1.08486 5.6499 1.25762 4.795 1.577C4.06355 1.86017 3.3994 2.29319 2.84521 2.84824C2.29102 3.40329 1.85904 4.06811 1.577 4.8C1.25762 5.6549 1.08486 6.55758 1.066 7.47C1.013 8.638 1 9.013 1 12C1 14.987 1.013 15.362 1.066 16.535C1.08486 17.4474 1.25762 18.3501 1.577 19.205C1.86017 19.9365 2.29319 20.6006 2.84824 21.1548C3.40329 21.709 4.06811 22.141 4.8 22.423C5.6549 22.7424 6.55758 22.9151 7.47 22.934C8.638 22.987 9.013 23 12 23C14.987 23 15.362 22.987 16.535 22.934C17.4474 22.9151 18.3501 22.7424 19.205 22.423C19.9365 22.1398 20.6006 21.7068 21.1548 21.1518C21.709 20.5967 22.141 19.9319 22.423 19.2C22.7424 18.3451 22.9151 17.4424 22.934 16.53C22.987 15.362 23 14.987 23 12C23 9.013 22.987 8.638 22.934 7.465C22.9151 6.55258 22.7424 5.6499 22.423 4.795C22.1398 4.06355 21.7068 3.3994 21.1518 2.84521C20.5967 2.29102 19.9319 1.85904 19.2 1.577C18.3451 1.25762 17.4424 1.08486 16.53 1.066C15.362 1.013 14.987 1 12 1Z\" fill=\"currentColor\"/>\n    <path d=\"M11.9996 6.35107C10.8823 6.35107 9.79015 6.68238 8.86117 7.3031C7.9322 7.92382 7.20815 8.80608 6.78059 9.8383C6.35303 10.8705 6.24116 12.0063 6.45913 13.1021C6.6771 14.1979 7.21512 15.2045 8.00514 15.9945C8.79517 16.7845 9.80172 17.3226 10.8975 17.5405C11.9933 17.7585 13.1291 17.6466 14.1614 17.2191C15.1936 16.7915 16.0758 16.0675 16.6966 15.1385C17.3173 14.2095 17.6486 13.1173 17.6486 12.0001C17.6486 10.5019 17.0534 9.06502 15.994 8.00563C14.9346 6.94624 13.4978 6.35107 11.9996 6.35107ZM11.9996 15.6671C11.2743 15.6671 10.5653 15.452 9.96231 15.0491C9.35928 14.6461 8.88927 14.0734 8.61172 13.4034C8.33418 12.7333 8.26156 11.996 8.40305 11.2847C8.54454 10.5734 8.89379 9.91995 9.40663 9.40711C9.91947 8.89427 10.5729 8.54503 11.2842 8.40353C11.9955 8.26204 12.7328 8.33466 13.4029 8.61221C14.0729 8.88975 14.6457 9.35976 15.0486 9.9628C15.4515 10.5658 15.6666 11.2748 15.6666 12.0001C15.6666 12.9726 15.2802 13.9053 14.5925 14.593C13.9049 15.2807 12.9721 15.6671 11.9996 15.6671Z\" fill=\"currentColor\"/>\n    <path d=\"M17.8718 7.44811C18.6008 7.44811 19.1918 6.85712 19.1918 6.12811C19.1918 5.39909 18.6008 4.80811 17.8718 4.80811C17.1427 4.80811 16.5518 5.39909 16.5518 6.12811C16.5518 6.85712 17.1427 7.44811 17.8718 7.44811Z\" fill=\"currentColor\"/>\n</svg>\n";
},"useData":true}),
    "icons/linkedin": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M22.2 0H1.8C1.32261 0 0.864773 0.18964 0.527213 0.527213C0.18964 0.864773 0 1.32261 0 1.8V22.2C0 22.6773 0.18964 23.1352 0.527213 23.4728C0.864773 23.8104 1.32261 24 1.8 24H22.2C22.6773 24 23.1352 23.8104 23.4728 23.4728C23.8104 23.1352 24 22.6773 24 22.2V1.8C24 1.32261 23.8104 0.864773 23.4728 0.527213C23.1352 0.18964 22.6773 0 22.2 0ZM7.2 20.4H3.6V9.6H7.2V20.4ZM5.4 7.5C4.98741 7.48821 4.58747 7.35509 4.25011 7.11729C3.91275 6.87949 3.65293 6.54755 3.50316 6.16293C3.35337 5.77832 3.32025 5.35809 3.40793 4.95476C3.4956 4.55144 3.7002 4.18288 3.99613 3.89517C4.29208 3.60745 4.66624 3.41332 5.07188 3.33704C5.47752 3.26075 5.89664 3.30569 6.27688 3.46625C6.65712 3.6268 6.98163 3.89585 7.20983 4.23977C7.43804 4.58371 7.55983 4.98725 7.56 5.4C7.55052 5.96441 7.318 6.50213 6.91327 6.89564C6.50852 7.28913 5.96447 7.50643 5.4 7.5ZM20.4 20.4H16.8V14.712C16.8 13.008 16.08 12.396 15.144 12.396C14.8696 12.4143 14.6015 12.4865 14.3551 12.6088C14.1087 12.7309 13.8888 12.9007 13.7081 13.108C13.5276 13.3155 13.3896 13.5565 13.3024 13.8173C13.2152 14.0781 13.1804 14.3536 13.2 14.628C13.194 14.6839 13.194 14.7401 13.2 14.796V20.4H9.6V9.6H13.08V11.16C13.4311 10.626 13.9133 10.1911 14.4807 9.89693C15.048 9.6028 15.6813 9.4592 16.32 9.48C18.18 9.48 20.352 10.512 20.352 13.872L20.4 20.4Z\" fill=\"currentColor\"/>\n</svg>";
},"useData":true}),
    "icons/loader": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" width=\"24\" viewBox=\"0 0 24 24\">\n    <g stroke-linecap=\"round\" stroke-width=\"2\" fill=\"currentColor\" stroke=\"none\" stroke-linejoin=\"round\" class=\"nc-icon-wrapper\">\n        <g class=\"nc-loop-dots-4-24-icon-o\">\n            <circle cx=\"4\" cy=\"12\" r=\"3\"></circle>\n            <circle cx=\"12\" cy=\"12\" r=\"3\"></circle>\n            <circle cx=\"20\" cy=\"12\" r=\"3\"></circle>\n        </g>\n        <style data-cap=\"butt\">\n            .nc-loop-dots-4-24-icon-o{--animation-duration:0.8s}\n            .nc-loop-dots-4-24-icon-o *{opacity:.4;transform:scale(.75);animation:nc-loop-dots-4-anim var(--animation-duration) infinite}\n            .nc-loop-dots-4-24-icon-o :nth-child(1){transform-origin:4px 12px;animation-delay:-.3s;animation-delay:calc(var(--animation-duration)/-2.666)}\n            .nc-loop-dots-4-24-icon-o :nth-child(2){transform-origin:12px 12px;animation-delay:-.15s;animation-delay:calc(var(--animation-duration)/-5.333)}\n            .nc-loop-dots-4-24-icon-o :nth-child(3){transform-origin:20px 12px}\n            @keyframes nc-loop-dots-4-anim{0%,100%{opacity:.4;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}\n        </style>\n    </g>\n</svg>";
},"useData":true}),
    "icons/lock": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" height=\"20\" width=\"20\" id=\"Lock-1--Streamline-Ultimate\"><defs></defs><title>lock-1</title><path d=\"M4.375 8.125h11.25s1.25 0 1.25 1.25v8.75s0 1.25 -1.25 1.25H4.375s-1.25 0 -1.25 -1.25v-8.75s0 -1.25 1.25 -1.25\" fill=\"none\" stroke=\"currentcolor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"></path><path d=\"M5.625 8.125V5a4.375 4.375 0 0 1 8.75 0v3.125\" fill=\"none\" stroke=\"currentcolor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"></path><path d=\"m10 12.5 0 2.5\" fill=\"none\" stroke=\"currentcolor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\"></path></svg>";
},"useData":true}),
    "icons/mastodon": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M16.68 18.2926C19.6352 17.9336 22.2083 16.0807 22.5317 14.3878C23.0412 11.7208 22.9992 7.87958 22.9992 7.87958C22.9992 2.67325 19.647 1.14719 19.647 1.14719C17.9569 0.357269 15.0545 0.0250852 12.0393 0H11.9652C8.94993 0.0250852 6.04953 0.357269 4.35923 1.14719C4.35923 1.14719 1.00697 2.67325 1.00697 7.87958C1.00697 8.19521 1.00537 8.52719 1.0037 8.87279C0.999066 9.83259 0.993924 10.8974 1.02121 12.0089C1.14294 17.1004 1.93853 22.1184 6.56468 23.3644C8.69769 23.9389 10.529 24.0591 12.004 23.9766C14.6787 23.8257 16.1801 23.0053 16.1801 23.0053L16.092 21.0305C16.092 21.0305 14.1806 21.6438 12.0339 21.5691C9.90716 21.4949 7.66194 21.3357 7.31796 18.6786C7.28619 18.4452 7.2703 18.1957 7.2703 17.9336C7.2703 17.9336 9.35808 18.4528 12.004 18.5762C13.6218 18.6517 15.1391 18.4797 16.68 18.2926ZM19.045 14.5875V8.28346C19.045 6.99507 18.7227 5.97123 18.0752 5.21376C17.4074 4.45629 16.5328 4.06799 15.4474 4.06799C14.1913 4.06799 13.2402 4.55922 12.6114 5.54181L12 6.58465L11.3886 5.54181C10.7598 4.55922 9.80863 4.06799 8.55266 4.06799C7.46709 4.06799 6.59259 4.45629 5.92483 5.21376C5.27728 5.97123 4.9549 6.99507 4.9549 8.28346V14.5875H7.40928V8.46875C7.40928 7.17894 7.94259 6.52427 9.00936 6.52427C10.1888 6.52427 10.7801 7.30087 10.7801 8.8365V12.1856H13.22V8.8365C13.22 7.30087 13.8111 6.52427 14.9906 6.52427C16.0573 6.52427 16.5907 7.17894 16.5907 8.46875V14.5875H19.045Z\" fill=\"currentColor\"/>\n</svg>";
},"useData":true}),
    "icons/rss": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><circle cx=\"6.18\" cy=\"17.82\" r=\"2.18\"/><path d=\"M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z\"/></svg>\n";
},"useData":true}),
    "icons/search": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\" width=\"20\" height=\"20\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\"></path></svg>";
},"useData":true}),
    "icons/threads": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M17.5609 11.1236C17.4575 11.074 17.3526 11.0263 17.2462 10.9806C17.0611 7.56727 15.1967 5.61312 12.0661 5.59312C12.0519 5.59304 12.0379 5.59304 12.0237 5.59304C10.1512 5.59304 8.59388 6.39262 7.63537 7.84759L9.35708 9.0291C10.0732 7.94229 11.1969 7.7106 12.0245 7.7106C12.034 7.7106 12.0436 7.7106 12.0531 7.71068C13.0839 7.71726 13.8618 8.01708 14.3652 8.60175C14.7315 9.02742 14.9765 9.61563 15.0978 10.3579C14.1839 10.2026 13.1956 10.1548 12.139 10.2155C9.16261 10.387 7.24916 12.1235 7.37767 14.5365C7.44288 15.7605 8.05242 16.8135 9.09393 17.5014C9.97446 18.0829 11.1087 18.3673 12.2874 18.3029C13.844 18.2175 15.0652 17.6234 15.9171 16.5371C16.564 15.712 16.9732 14.6429 17.154 13.2958C17.8957 13.7436 18.4455 14.333 18.7492 15.0414C19.2655 16.2459 19.2956 18.225 17.6814 19.8385C16.267 21.2521 14.5669 21.8635 11.9976 21.8824C9.14756 21.8613 6.9921 20.9468 5.59068 19.1646C4.27836 17.4958 3.60015 15.0852 3.57484 12C3.60015 8.91472 4.27836 6.5042 5.59068 4.83533C6.9921 3.05312 9.14752 2.13875 11.9976 2.11756C14.8684 2.13891 17.0614 3.05767 18.5164 4.8485C19.2299 5.7267 19.7677 6.8311 20.1224 8.11879L22.14 7.58028C21.7102 5.99527 21.0338 4.62946 20.1135 3.49675C18.248 1.20083 15.5199 0.024398 12.0046 0H11.9906C8.48249 0.0243044 5.78485 1.20522 3.97257 3.50991C2.3599 5.5608 1.52804 8.41446 1.50008 11.9916L1.5 12L1.50008 12.0084C1.52804 15.5855 2.3599 18.4393 3.97257 20.4901C5.78485 22.7947 8.48249 23.9758 11.9906 24H12.0046C15.1235 23.9783 17.3219 23.1615 19.1329 21.3513C21.5024 18.9833 21.431 16.0149 20.6501 14.1927C20.0898 12.8859 19.0216 11.8245 17.5609 11.1236ZM12.1759 16.1884C10.8715 16.2619 9.51623 15.6761 9.44937 14.4215C9.39984 13.4913 10.1111 12.4533 12.256 12.3296C12.5016 12.3154 12.7427 12.3085 12.9794 12.3085C13.7585 12.3085 14.4874 12.3842 15.1499 12.5292C14.9028 15.6169 13.4532 16.1183 12.1759 16.1884Z\" fill=\"currentColor\"/>\n</svg>\n";
},"useData":true}),
    "icons/tiktok": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M10.1891 8.937V13.059C9.66997 12.9221 9.12673 12.9034 8.59942 13.0044C8.07212 13.1054 7.57419 13.3234 7.14234 13.6424C6.7105 13.9613 6.35575 14.3732 6.10423 14.8475C5.85272 15.3218 5.71085 15.8466 5.6891 16.383C5.65937 16.8449 5.72887 17.3078 5.89293 17.7405C6.057 18.1733 6.31182 18.5659 6.64027 18.892C6.96872 19.2181 7.36318 19.4701 7.79713 19.631C8.23108 19.7919 8.69446 19.8581 9.1561 19.825C9.62242 19.8608 10.0909 19.7949 10.5293 19.6319C10.9677 19.4689 11.3654 19.2126 11.6951 18.8809C12.0247 18.5491 12.2784 18.1498 12.4387 17.7104C12.5989 17.271 12.6618 16.8021 12.6231 16.336V0H16.7001C17.3931 4.315 19.5511 5.316 22.4401 5.778V9.913C20.438 9.74881 18.5067 9.09645 16.8151 8.013V16.18C16.8151 19.88 14.6251 24 9.1881 24C8.16806 23.9955 7.15918 23.7875 6.22058 23.3881C5.28199 22.9886 4.43258 22.4059 3.72213 21.6739C3.01168 20.942 2.4545 20.0755 2.08325 19.1254C1.712 18.1754 1.53414 17.1607 1.5601 16.141C1.59241 15.0794 1.84936 14.0366 2.31401 13.0815C2.77866 12.1265 3.44047 11.2807 4.2558 10.6C5.07114 9.9193 6.02148 9.41915 7.0442 9.1325C8.06691 8.84586 9.13876 8.77923 10.1891 8.937Z\" fill=\"currentColor\"/>\n</svg>";
},"useData":true}),
    "icons/twitter": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><g><path d=\"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\"></path></g></svg>";
},"useData":true}),
    "icons/youtube": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M21.3763 2.59736C22.4096 2.92662 23.2216 3.89324 23.4982 5.12324C23.9979 7.35042 24 12 24 12C24 12 24 16.6496 23.4982 18.8768C23.2216 20.1068 22.4096 21.0734 21.3763 21.4026C19.5055 22 12 22 12 22C12 22 4.49456 22 2.62363 21.4026C1.59039 21.0734 0.7784 20.1068 0.501806 18.8768C0 16.6496 0 12 0 12C0 12 0 7.35042 0.501806 5.12324C0.7784 3.89324 1.59039 2.92662 2.62363 2.59736C4.49456 2 12 2 12 2C12 2 19.5055 2 21.3763 2.59736ZM16.0153 12.0004L9.48326 15.8822V8.11841L16.0153 12.0004Z\" fill=\"currentColor\"/>\n</svg>";
},"useData":true}),
    "lightbox": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"pswp\" tabindex=\"-1\" role=\"dialog\" aria-hidden=\"true\">\n    <div class=\"pswp__bg\"></div>\n\n    <div class=\"pswp__scroll-wrap\">\n        <div class=\"pswp__container\">\n            <div class=\"pswp__item\"></div>\n            <div class=\"pswp__item\"></div>\n            <div class=\"pswp__item\"></div>\n        </div>\n\n        <div class=\"pswp__ui pswp__ui--hidden\">\n            <div class=\"pswp__top-bar\">\n                <div class=\"pswp__counter\"></div>\n\n                <button class=\"pswp__button pswp__button--close\" title=\"Close (Esc)\"></button>\n                <button class=\"pswp__button pswp__button--share\" title=\"Share\"></button>\n                <button class=\"pswp__button pswp__button--fs\" title=\"Toggle fullscreen\"></button>\n                <button class=\"pswp__button pswp__button--zoom\" title=\"Zoom in/out\"></button>\n\n                <div class=\"pswp__preloader\">\n                    <div class=\"pswp__preloader__icn\">\n                        <div class=\"pswp__preloader__cut\">\n                            <div class=\"pswp__preloader__donut\"></div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n            <div class=\"pswp__share-modal pswp__share-modal--hidden pswp__single-tap\">\n                <div class=\"pswp__share-tooltip\"></div>\n            </div>\n\n            <button class=\"pswp__button pswp__button--arrow--left\" title=\"Previous (arrow left)\"></button>\n            <button class=\"pswp__button pswp__button--arrow--right\" title=\"Next (arrow right)\"></button>\n\n            <div class=\"pswp__caption\">\n                <div class=\"pswp__caption__center\"></div>\n            </div>\n        </div>\n    </div>\n</div>";
},"useData":true}),
    "post-card": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return " no-image";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <figure class=\"gh-card-image\">\n                <img\n                    srcset=\""
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"format":"webp","size":"xs"},"data":data,"loc":{"start":{"line":6,"column":28},"end":{"line":6,"column":77}}}))
    + " 160w,\n                            "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"format":"webp","size":"s"},"data":data,"loc":{"start":{"line":7,"column":28},"end":{"line":7,"column":76}}}))
    + " 320w,\n                            "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"format":"webp","size":"m"},"data":data,"loc":{"start":{"line":8,"column":28},"end":{"line":8,"column":76}}}))
    + " 600w,\n                            "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"format":"webp","size":"l"},"data":data,"loc":{"start":{"line":9,"column":28},"end":{"line":9,"column":76}}}))
    + " 960w,\n                            "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"format":"webp","size":"xl"},"data":data,"loc":{"start":{"line":10,"column":28},"end":{"line":10,"column":77}}}))
    + " 1200w,\n                            "
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"format":"webp","size":"xxl"},"data":data,"loc":{"start":{"line":11,"column":28},"end":{"line":11,"column":78}}}))
    + " 2000w\"\n                    sizes=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"imageSizes") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":12,"column":27},"end":{"line":12,"column":79}}})) != null ? stack1 : "")
    + "\"\n                    src=\""
    + alias3((lookupProperty(helpers,"img_url")||(depth0 && lookupProperty(depth0,"img_url"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"img_url","hash":{"size":"m"},"data":data,"loc":{"start":{"line":13,"column":25},"end":{"line":13,"column":59}}}))
    + "\"\n                    alt=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image_alt") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.program(10, data, 0),"data":data,"loc":{"start":{"line":14,"column":25},"end":{"line":14,"column":95}}})) != null ? stack1 : "")
    + "\"\n                    "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"lazyLoad") : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":15,"column":20},"end":{"line":15,"column":57}}})) != null ? stack1 : "")
    + "\n                >\n            </figure>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"imageSizes") || (depth0 != null ? lookupProperty(depth0,"imageSizes") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"imageSizes","hash":{},"data":data,"loc":{"start":{"line":12,"column":45},"end":{"line":12,"column":59}}}) : helper)));
},"6":function(container,depth0,helpers,partials,data) {
    return "320px";
},"8":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"feature_image_alt") || (depth0 != null ? lookupProperty(depth0,"feature_image_alt") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"feature_image_alt","hash":{},"data":data,"loc":{"start":{"line":14,"column":50},"end":{"line":14,"column":71}}}) : helper)));
},"10":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title","hash":{},"data":data,"loc":{"start":{"line":14,"column":79},"end":{"line":14,"column":88}}}) : helper)));
},"12":function(container,depth0,helpers,partials,data) {
    return "loading=\"lazy\"";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <p class=\"gh-card-tag\">"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"primary_tag") : depth0)) != null ? lookupProperty(stack1,"name") : stack1), depth0))
    + "</p>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <p class=\"gh-card-excerpt is-body\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"custom_excerpt") || (depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"custom_excerpt","hash":{},"data":data,"loc":{"start":{"line":25,"column":51},"end":{"line":25,"column":69}}}) : helper)))
    + "</p>\n";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"excerpt") : depth0),{"name":"if","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":16},"end":{"line":30,"column":23}}})) != null ? stack1 : "");
},"19":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <p class=\"gh-card-excerpt is-body\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"excerpt") || (depth0 != null ? lookupProperty(depth0,"excerpt") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"excerpt","hash":{},"data":data,"loc":{"start":{"line":29,"column":55},"end":{"line":29,"column":66}}}) : helper)))
    + "</p>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"has")||(depth0 && lookupProperty(depth0,"has"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"has","hash":{"visibility":"public"},"fn":container.noop,"inverse":container.program(22, data, 0),"data":data,"loc":{"start":{"line":34,"column":20},"end":{"line":36,"column":28}}})) != null ? stack1 : "")
    + "                ";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/lock"),depth0,{"name":"icons/lock","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"24":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n                    <span class=\"gh-card-author\">By "
    + ((stack1 = (lookupProperty(helpers,"foreach")||(depth0 && lookupProperty(depth0,"foreach"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"authors") : depth0),{"name":"foreach","hash":{},"fn":container.program(25, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":39,"column":52},"end":{"line":39,"column":131}}})) != null ? stack1 : "")
    + "</span>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(data && lookupProperty(data,"first")),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.program(28, data, 0),"data":data,"loc":{"start":{"line":39,"column":72},"end":{"line":39,"column":119}}})) != null ? stack1 : "");
},"26":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data,"loc":{"start":{"line":39,"column":86},"end":{"line":39,"column":94}}}) : helper)));
},"28":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ", "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data,"loc":{"start":{"line":39,"column":104},"end":{"line":39,"column":112}}}) : helper)));
},"30":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <time class=\"gh-card-date\" datetime=\""
    + alias3((lookupProperty(helpers,"date")||(depth0 && lookupProperty(depth0,"date"))||alias2).call(alias1,{"name":"date","hash":{"format":"YYYY-MM-DD"},"data":data,"loc":{"start":{"line":42,"column":57},"end":{"line":42,"column":85}}}))
    + "\">"
    + alias3((lookupProperty(helpers,"date")||(depth0 && lookupProperty(depth0,"date"))||alias2).call(alias1,{"name":"date","hash":{"format":"DD MMM YYYY"},"data":data,"loc":{"start":{"line":42,"column":87},"end":{"line":42,"column":116}}}))
    + "</time>\n                ";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<article class=\"gh-card "
    + alias4(((helper = (helper = lookupProperty(helpers,"post_class") || (depth0 != null ? lookupProperty(depth0,"post_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"post_class","hash":{},"data":data,"loc":{"start":{"line":1,"column":24},"end":{"line":1,"column":38}}}) : helper)))
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_images_in_feed")),{"name":"unless","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":38},"end":{"line":1,"column":97}}})) != null ? stack1 : "")
    + "\">\n    <a class=\"gh-card-link\" href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"url") || (depth0 != null ? lookupProperty(depth0,"url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data,"loc":{"start":{"line":2,"column":34},"end":{"line":2,"column":41}}}) : helper)))
    + "\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"feature_image") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":3,"column":8},"end":{"line":18,"column":15}}})) != null ? stack1 : "")
    + "        <div class=\"gh-card-wrapper\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"primary_tag") : depth0),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":12},"end":{"line":22,"column":19}}})) != null ? stack1 : "")
    + "            <h3 class=\"gh-card-title is-title\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":23,"column":47},"end":{"line":23,"column":56}}}) : helper)))
    + "</h3>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":12},"end":{"line":26,"column":19}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(depth0 != null ? lookupProperty(depth0,"custom_excerpt") : depth0),{"name":"unless","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":27,"column":12},"end":{"line":31,"column":23}}})) != null ? stack1 : "")
    + "            <footer class=\"gh-card-meta\">\n"
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(depth0 != null ? lookupProperty(depth0,"access") : depth0),{"name":"unless","hash":{},"fn":container.program(21, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":16},"end":{"line":37,"column":27}}})) != null ? stack1 : "")
    + "<!--\n             -->"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_author")),{"name":"if","hash":{},"fn":container.program(24, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":38,"column":16},"end":{"line":40,"column":23}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"show_publish_date")),{"name":"if","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":41,"column":16},"end":{"line":43,"column":23}}})) != null ? stack1 : "")
    + "<!--\n         --></footer>\n        </div>\n    </a>\n</article>\n";
},"usePartial":true,"useData":true}),
    "search-toggle": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<button class=\"gh-search gh-icon-button\" aria-label=\"Search this site\" data-ghost-search>\n    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"icons/search"),depth0,{"name":"icons/search","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</button>";
},"usePartial":true,"useData":true}),
    "typography/fonts": Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"body_font")),"Elegant serif",{"name":"match","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":5,"column":4},"end":{"line":7,"column":14}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"typography/serif"),depth0,{"name":"typography/serif","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"title_font")),"Elegant serif",{"name":"match","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(7, data, 0),"data":data,"loc":{"start":{"line":8,"column":0},"end":{"line":15,"column":0}}})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"typography/serif"),depth0,{"name":"typography/serif","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + ((stack1 = container.invokePartial(lookupProperty(partials,"typography/mono"),depth0,{"name":"typography/mono","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"body_font")),"Elegant serif",{"name":"match","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":12,"column":4},"end":{"line":14,"column":14}}})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"typography/sans"),depth0,{"name":"typography/sans","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"match")||(depth0 && lookupProperty(depth0,"match"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (data && lookupProperty(data,"custom"))) && lookupProperty(stack1,"title_font")),"Modern sans-serif",{"name":"match","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":15,"column":10}}})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
    "typography/mono": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<link rel=\"preload\" as=\"font\" type=\"font/woff2\" href=\""
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/jetbrains-mono-roman.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":1,"column":54},"end":{"line":1,"column":98}}}))
    + "\" crossorigin=\"anonymous\">\n<link rel=\"preload\" as=\"font\" type=\"font/woff2\" href=\""
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/jetbrains-mono-italic.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":2,"column":54},"end":{"line":2,"column":99}}}))
    + "\" crossorigin=\"anonymous\">\n<style>\n    @font-face {\n        font-family: \"JetBrains Mono\";\n        font-style: normal;\n        font-weight: 100 800;\n        font-display: optional;\n        src: url("
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/jetbrains-mono-roman.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":9,"column":17},"end":{"line":9,"column":61}}}))
    + ") format(\"woff2\");\n        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n    }\n\n    @font-face {\n        font-family: \"JetBrains Mono\";\n        font-style: italic;\n        font-weight: 100 800;\n        font-display: optional;\n        src: url("
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/jetbrains-mono-italic.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":18,"column":17},"end":{"line":18,"column":62}}}))
    + ") format(\"woff2\");\n        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n    }\n</style>";
},"useData":true}),
    "typography/sans": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<link rel=\"preload\" as=\"font\" type=\"font/woff2\" href=\""
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/inter-roman.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":1,"column":54},"end":{"line":1,"column":89}}}))
    + "\" crossorigin=\"anonymous\">\n<style>\n    @font-face {\n        font-family: \"Inter\";\n        font-style: normal;\n        font-weight: 100 900;\n        font-display: optional;\n        src: url("
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/inter-roman.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":8,"column":17},"end":{"line":8,"column":52}}}))
    + ") format(\"woff2\");\n        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n    }\n</style>";
},"useData":true}),
    "typography/serif": Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<link rel=\"preload\" as=\"font\" type=\"font/woff2\" href=\""
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/eb-garamond-roman.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":1,"column":54},"end":{"line":1,"column":95}}}))
    + "\" crossorigin=\"anonymous\">\n<link rel=\"preload\" as=\"font\" type=\"font/woff2\" href=\""
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/eb-garamond-italic.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":2,"column":54},"end":{"line":2,"column":96}}}))
    + "\" crossorigin=\"anonymous\">\n<style>\n    @font-face {\n        font-family: \"EB Garamond\";\n        font-style: normal;\n        font-weight: 400 800;\n        font-display: optional;\n        src: url("
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/eb-garamond-roman.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":9,"column":17},"end":{"line":9,"column":58}}}))
    + ") format(\"woff2\");\n        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n    }\n\n    @font-face {\n        font-family: \"EB Garamond\";\n        font-style: italic;\n        font-weight: 400 800;\n        font-display: optional;\n        src: url("
    + alias3((lookupProperty(helpers,"asset")||(depth0 && lookupProperty(depth0,"asset"))||alias2).call(alias1,"fonts/eb-garamond-italic.woff2",{"name":"asset","hash":{},"data":data,"loc":{"start":{"line":18,"column":17},"end":{"line":18,"column":59}}}))
    + ") format(\"woff2\");\n        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n    }\n</style>";
},"useData":true})
};
export const theme = {
    "name": "source",
    "version": "1.5.0",
    "config": {
        "posts_per_page": 12,
        "image_sizes": {
            "xs": {
                "width": 160
            },
            "s": {
                "width": 320
            },
            "m": {
                "width": 600
            },
            "l": {
                "width": 960
            },
            "xl": {
                "width": 1200
            },
            "xxl": {
                "width": 2000
            }
        },
        "card_assets": true,
        "custom": {
            "navigation_layout": {
                "type": "select",
                "options": [
                    "Logo in the middle",
                    "Logo on the left",
                    "Stacked"
                ],
                "default": "Logo in the middle"
            },
            "site_background_color": {
                "type": "color",
                "default": "#ffffff"
            },
            "header_and_footer_color": {
                "type": "select",
                "options": [
                    "Background color",
                    "Accent color"
                ],
                "default": "Background color"
            },
            "title_font": {
                "type": "select",
                "options": [
                    "Modern sans-serif",
                    "Elegant serif",
                    "Consistent mono"
                ],
                "default": "Modern sans-serif"
            },
            "body_font": {
                "type": "select",
                "options": [
                    "Modern sans-serif",
                    "Elegant serif"
                ],
                "default": "Modern sans-serif"
            },
            "signup_heading": {
                "type": "text",
                "description": "Used in your footer across your theme, defaults to site title when empty"
            },
            "signup_subheading": {
                "type": "text",
                "description": "Defaults to site description when empty"
            },
            "header_style": {
                "type": "select",
                "options": [
                    "Landing",
                    "Highlight",
                    "Magazine",
                    "Search",
                    "Off"
                ],
                "description": "Landing is recommended for all sites, Highlight & Magazine for those with more content",
                "default": "Landing",
                "group": "homepage"
            },
            "header_text": {
                "type": "text",
                "group": "homepage",
                "description": "Defaults to site description when empty",
                "visibility": "header_style:[Landing, Search]"
            },
            "background_image": {
                "type": "boolean",
                "default": true,
                "description": "Use the publication cover set on the Brand tab as your background",
                "group": "homepage",
                "visibility": "header_style:[Landing, Search]"
            },
            "show_featured_posts": {
                "type": "boolean",
                "default": false,
                "group": "homepage",
                "visibility": "header_style:[Highlight, Magazine]"
            },
            "post_feed_style": {
                "type": "select",
                "options": [
                    "List",
                    "Grid"
                ],
                "default": "List",
                "group": "homepage"
            },
            "show_images_in_feed": {
                "type": "boolean",
                "default": true,
                "group": "homepage",
                "visibility": "post_feed_style:List"
            },
            "show_author": {
                "type": "boolean",
                "default": true,
                "group": "homepage"
            },
            "show_publish_date": {
                "type": "boolean",
                "default": true,
                "group": "homepage"
            },
            "show_publication_info_sidebar": {
                "type": "boolean",
                "default": false,
                "group": "homepage"
            },
            "show_post_metadata": {
                "type": "boolean",
                "default": true,
                "group": "post"
            },
            "enable_drop_caps_on_posts": {
                "type": "boolean",
                "default": false,
                "group": "post"
            },
            "show_related_articles": {
                "type": "boolean",
                "default": true,
                "group": "post"
            }
        }
    },
    "templates": [
        "author",
        "default",
        "home",
        "index",
        "page",
        "post",
        "tag"
    ],
    "customTemplates": [],
    "partials": [
        "components/cta",
        "components/featured",
        "components/footer",
        "components/header",
        "components/header-content",
        "components/navigation",
        "components/post-list",
        "email-subscription",
        "feature-image",
        "icons/arrow",
        "icons/avatar",
        "icons/bluesky",
        "icons/burger",
        "icons/checkmark",
        "icons/close",
        "icons/facebook",
        "icons/fire",
        "icons/instagram",
        "icons/linkedin",
        "icons/loader",
        "icons/lock",
        "icons/mastodon",
        "icons/rss",
        "icons/search",
        "icons/threads",
        "icons/tiktok",
        "icons/twitter",
        "icons/youtube",
        "lightbox",
        "post-card",
        "search-toggle",
        "typography/fonts",
        "typography/mono",
        "typography/sans",
        "typography/serif"
    ],
    "layouts": {
        "author": "default",
        "default": null,
        "home": "default",
        "index": "default",
        "page": "default",
        "post": "default",
        "tag": "default"
    }
};

export default {templates, partials, theme};
