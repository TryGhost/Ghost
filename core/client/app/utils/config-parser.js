var isNumeric = function (num) {
        return !isNaN(num);
    },

    _mapType = function (val) {
        if (val === '') {
            return null;
        } else if (val === 'true') {
            return true;
        } else if (val === 'false') {
            return false;
        } else if (isNumeric(val)) {
            return +val;
        } else {
            return val;
        }
    },

    parseConfiguration = function () {
        var metaConfigTags = $('meta[name^="env-"]'),
            propertyName,
            config = {},
            value,
            key,
            i;

        for (i = 0; i < metaConfigTags.length; i += 1) {
            key = $(metaConfigTags[i]).prop('name');
            value = $(metaConfigTags[i]).prop('content');
            propertyName = key.substring(4);        // produce config name ignoring the initial 'env-'.
            config[propertyName] = _mapType(value); // map string values to types if possible
        }
        return config;
    };

export default parseConfiguration;
