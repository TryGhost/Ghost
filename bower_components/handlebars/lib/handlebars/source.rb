module Handlebars
  module Source
    def self.bundled_path
      File.expand_path("../../../handlebars.js", __FILE__)
    end

    def self.runtime_bundled_path
      File.expand_path("../../../handlebars.runtime.js", __FILE__)
    end
  end
end
