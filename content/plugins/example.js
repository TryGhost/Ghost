// Minimal example plugin.
var example = function (ghost) {
    this.app = ghost;
};

example.prototype.install = function(ghost) {};

// Called when the server starts up.
example.prototype.activate = function(ghost) {
		console.log("Started example plugin");
		console.log("Current config:");
		console.log(ghost.config());
};

module.exports = example;