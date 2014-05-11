var blanket = require("blanket")({
    "pattern": ["/core/server/", "/core/client/", "/core/shared/"],
    "data-cover-only": ["/core/server/", "/core/client/", "/core/shared/"]
}),
    requireDir = require("require-dir");

requireDir("./unit");
requireDir("./integration");