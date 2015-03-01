# -*- encoding: utf-8 -*-
require 'json'

package = JSON.parse(File.read('bower.json'))

Gem::Specification.new do |gem|
  gem.name          = "handlebars-source"
  gem.authors       = ["Yehuda Katz"]
  gem.email         = ["wycats@gmail.com"]
  gem.date          = Time.now.strftime("%Y-%m-%d")
  gem.description   = %q{Handlebars.js source code wrapper for (pre)compilation gems.}
  gem.summary       = %q{Handlebars.js source code wrapper}
  gem.homepage      = "https://github.com/wycats/handlebars.js/"
  gem.version       = package["version"].sub! "-", "."
  gem.license       = "MIT"

  gem.files = [
    'handlebars.js',
    'handlebars.runtime.js',
    'lib/handlebars/source.rb'
  ]
end
