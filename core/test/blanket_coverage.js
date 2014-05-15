// Posts
var blanket = require("blanket")({
    "pattern": ["/core/server/", "/core/clientold/", "/core/shared/"],
    "data-cover-only": ["/core/server/", "/core/clientold/", "/core/shared/"]
}),
    requireDir = require("require-dir");


requireDir("./unit");
requireDir("./integration");
requireDir("./functional/routes");
