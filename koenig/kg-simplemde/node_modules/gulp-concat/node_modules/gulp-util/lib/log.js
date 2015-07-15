var chalk = require('chalk');
var dateformat = require('dateformat');

module.exports = function(){
  var time = '['+chalk.grey(dateformat(new Date(), 'HH:MM:ss'))+']';
  process.stdout.write(time + ' ');
  console.log.apply(console, arguments);
  return this;
};
