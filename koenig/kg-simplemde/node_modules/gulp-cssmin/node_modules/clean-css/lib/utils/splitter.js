function Splitter(separator) {
  this.separator = separator;
  this.withRegex = typeof separator != 'string';
}

Splitter.prototype.split = function (value, withSeparator) {
  var hasSeparator = this.withRegex ?
    this.separator.test(value) :
    value.indexOf(this.separator);
  if (!hasSeparator)
    return [value];

  if (value.indexOf('(') === -1 && !withSeparator)
    return value.split(this.separator);

  var level = 0;
  var cursor = 0;
  var lastStart = 0;
  var len = value.length;
  var tokens = [];

  while (cursor++ < len) {
    if (value[cursor] == '(') {
      level++;
    } else if (value[cursor] == ')') {
      level--;
    } else if ((this.withRegex ? this.separator.test(value[cursor]) : value[cursor] == this.separator) && level === 0) {
      tokens.push(value.substring(lastStart, cursor + (withSeparator ? 1 : 0)));
      lastStart = cursor + 1;
    }
  }

  if (lastStart < cursor + 1)
    tokens.push(value.substring(lastStart));

  return tokens;
};

module.exports = Splitter;
