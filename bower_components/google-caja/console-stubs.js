// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview stubs out console in a way that allows us to get debugging
 * output from testcases run under Rhino.
 *
 * This replicates the firebug API documented at
 * <a href="http://www.getfirebug.com/console.html">Firebug Console API</a>.
 *
 * @author mikesamuel@gmail.com
 */

//// Firebug Debugging stubs ////
var console;
if (!console) {
  console = {
      indent_: 0,
      timers_: {},

      // Writes a message to the console with the visual "info" icon
      // and color coding and a hyperlink to the line where it was
      // called.
      log: function (printfFormatString, var_args) {
        var msg;
        try {
          var index = 0;
          var args = arguments;
          msg = printfFormatString.replace(
              /%(\w+|%)/g,
              function (x) { return x != '%' ? args[++index] : '%'; });
        } catch (e) {
          msg = printfFormatString;
        }

        var indentSpaces = '';
        for (var i = this.indent_; --i >= 0;) {
          indentSpaces += '  ';
        }
        msg = String(msg).replace(/^(.)/gm, indentSpaces + 'console: $1');

        stderr.println(msg);
      },

      // Tests that an expression is true. If not, it will write a
      // message to the console and throw an exception.
      assert: function (expression, var_args) {
        if (!expression) {
          throw [].slice.call(arguments, 1).join();
        }
      },

      // Prints an interactive listing of all properties of the
      // object. This looks identical to the view that you would see
      // in the DOM tab.
      dir: function (obj) {
        for (var k in obj) {
          console.log('%s=%s : %s', k, obj[k], typeof obj[k]);
        }
      },

      dirxml: function () { this.log('dirxml unsupported'); },

      // Prints an interactive stack trace of JavaScript execution at
      // the point where it is called.

      // The stack trace details the functions on the stack, as well
      // as the values that were passed as arguments to each
      // function. You can click each function to take you to its
      // source in the Script tab, and click each argument value to
      // inspect it in the DOM or HTML tabs.
      trace: function (obj) {
        var e = new java.lang.Throwable();
        e.printStackTrace(stderr);
      },

      // Writes a message to the console and opens a nested block to
      // indent all future messages sent to the console. Call
      // console.groupEnd() to close the block.
      group: function (printFormatString, var_args) {
        this.log.apply(console, arguments);
        ++this.indent_;
      },

      // Closes the most recently opened block created by a call to
      // console.group.
      groupEnd: function () {
        this.indent_ && --this.indent_;
      },

      // Creates a new timer under the given name. Call
      // console.timeEnd(name) with the same name to stop the timer
      // and print the time elapsed.
      time: function (name) {
        this.timers_[name] = Date.now();
      },

      // Stops a timer created by a call to console.time(name) and
      // writes the time elapsed.
      timeEnd: function (name) {
        var t1 = Date.now();
        var t0 = this.timers_[name];
        if (delete this.timers_[name]) {
          this.log('timer %s: %s ms', name, t1 - t0);
        } else {
          this.warn('no such timer %s', name);
        }
      },

      profile: function () { this.log('profile unsupported'); },
      profileEnd: function () { this.log('profileEnd unsupported'); },
      count: function () { this.log('count unsupported'); }
    };
  console.debug = console.info = console.warn = console.error = console.log;
}
