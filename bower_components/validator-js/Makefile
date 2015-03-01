NPM=./node_modules/.bin

test: dependencies
	@$(NPM)/_mocha \
		--reporter $(if $(or $(TEST),$(V)),spec,dot) \
		--slow 600 --timeout 2000 \
		--grep '$(TEST)'

lint: dependencies
	@$(NPM)/jshint --config .jshintrc \
		validator.js test/*.js

dependencies: node_modules

node_modules:
	@echo "Installing dependencies.."
	@npm install

coverage: dependencies
	@$(NPM)/istanbul cover $(NPM)/_mocha -- --reporter spec
	@open coverage/lcov-report/validator.js/validator.js.html

clean:
	@rm -rf coverage

distclean: clean
	@rm -rf node_modules

min: validator.min.js

%.min.js: %.js dependencies
	@$(NPM)/uglifyjs --compress --mangle --comments '/Copyright/' $< > $@

check: test
deps: dependencies
