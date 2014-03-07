var when = require('when'),
    semver = require('semver'),
    fs = require('fs'),
    spawn = require('child_process').spawn;

module.exports = function(grunt) {

	/* Generate Changelog
	 * - Pulls changelog from git, excluding merges.
	 * - Uses first line of commit message. Includes committer name.
	 */
	grunt.registerTask('changelog', 'Generate changelog from Git', function () {
		// TODO: Break the contents of this task out into a separate module,
		// put on npm. (@cgiffard)

		var done = this.async();

		function git(args, callback, depth) {
			depth = depth || 0;

			if (!depth) {
				grunt.log.writeln('git ' + args.join(' '));
			}

			var buffer = [];
			spawn('git', args, {
				// We can reasonably assume the gruntfile will be in the root of the repo.
				cwd : __dirname,

				stdio : ['ignore', 'pipe', process.stderr]

			}).on('exit', function (code) {

				  // Process exited correctly but we got no output.
				  // Spawn again, but make sure we don't spiral out of control.
				  // Hack to work around an apparent node bug.
				  //
				  // Frustratingly, it's impossible to distinguish this
				  // bug from a genuine empty log.

				  if (!buffer.length && code === 0 && depth < 20) {
					  return setImmediate(function () {
						  git(args, callback, depth ? depth + 1 : 1);
					  });
				  }

				  if (code === 0) {
					  return callback(buffer.join(''));
				  }

				  // We failed. Git returned a non-standard exit code.
				  grunt.log.error('Git returned a non-zero exit code.');
				  done(false);

				  // Push returned data into the buffer
			  }).stdout.on('data', buffer.push.bind(buffer));
		}

		// Crazy function for getting around inconsistencies in tagging
		function sortTags(a, b) {
			a = a.tag;
			b = b.tag;

			// NOTE: Accounting for different tagging method for
			// 0.2.1 and up.

			// If we didn't have this issue I'd just pass rcompare
			// into sort directly. Could be something to think about
			// in future.

			if (semver.rcompare(a, '0.2.0') < 0 ||
			  semver.rcompare(b, '0.2.0') < 0) {

				return semver.rcompare(a, b);
			}

			a = a.split('-');
			b = b.split('-');

			if (semver.rcompare(a[0], b[0]) !== 0) {
				return semver.rcompare(a[0], b[0]);
			}

			// Using this janky looking integerising-method
			// because it's faster and doesn't result in NaN, which
			// breaks sorting
			/*jslint bitwise: true */
			return (+b[1] | 0) - (+a[1] | 0);
		}

		// Gets tags in master branch, sorts them with semver,
		function getTags(callback) {
			git(['show-ref', '--tags'], function (results) {
				results = results
				  .split(/\n+/)
				  .filter(function (tag) {
					  return tag.length && tag.match(/\/\d+\.\d+/);
				  })
				  .map(function (tag) {
					  return {
						  'tag': tag.split(/tags\//).pop().trim(),
						  'ref': tag.split(/\s+/).shift().trim()
					  };
				  })
				  .sort(sortTags);

				callback(results);
			});
		}

		// Parses log to extract commit data.
		function parseLog(data) {
			var commits = [],
			  commitRegex =
				new RegExp(
				  '\\n*[|\\*\\s]*commit\\s+([a-f0-9]+)' +
					'\\n[|\\*\\s]*Author:\\s+([^<\\n]+)<([^>\\n]+)>' +
					'\\n[|\\*\\s]*Date:\\s+([^\\n]+)' +
					'\\n+[|\\*\\s]*[ ]{4}([^\\n]+)',
				  'ig'
				);

			// Using String.prototype.replace as a kind of poor-man's substitute
			// for a streaming parser.
			data.replace(
			  commitRegex,
			  function (wholeCommit, hash, author, email, date, message) {
				  /*jslint unparam:true*/

				  // The author name and commit message may have trailing space.
				  author = author.trim();
				  message = message.trim();

				  // Reformat date to make it parse-able by JS
				  date =
					date.replace(
					  /^(\w+)\s(\w+)\s(\d+)\s([\d\:]+)\s(\d+)\s([\+\-\d]+)$/,
					  '$1, $2 $3 $5 $4 $6'
					);

				  commits.push({
					  'hash': hash,
					  'author': author,
					  'email': email,
					  'date': date,
					  'parsedDate': new Date(Date.parse(date)),
					  'message': message
				  });

				  return null;
			  }
			);

			return commits;
		}

		// Gets git log for specified range.
		function getLog(to, from, callback) {
			var range = from && to ? from + '..' + to : '',
			  args = [ 'log', 'master', '--no-color', '--no-merges', '--graph' ];

			if (range) {
				args.push(range);
			}

			git(args, function (data) {
				callback(parseLog(data));
			});
		}

		// Run the job
		getTags(function (tags) {
			var logPath = path.join(__dirname, 'CHANGELOG.md'),
			  log = fs.createWriteStream(logPath),
			  commitCache = {};

			function processTag(tag, callback) {
				var buffer = '',
				  peek = tag[1];

				tag = tag[0];

				getLog(tag.tag, peek.tag, function (commits) {

					// Use the comparison with HEAD to remove commits which
					// haven't been included in a build/release yet.

					if (tag.tag === 'HEAD') {
						commits.forEach(function (commit) {
							commitCache[commit.hash] = true;
						});

						return callback('');
					}

					buffer += '## Release ' + tag.tag + '\n';

					commits = commits
					  .filter(function (commit) {

						  // Get rid of jenkins' release tagging commits
						  // Remove commits we've already spat out
						  return (
							commit.author !== 'TryGhost-Jenkins' &&
							  !commitCache[commit.hash]
							);
					  })
					  .map(function (commit) {
						  buffer += '\n* ' + commit.message + ' (_' + commit.author + '_)';
						  commitCache[commit.hash] = true;
					  });

					if (!commits.length) {
						buffer += '\nNo changes were made in this build.\n';
					}

					callback(buffer + '\n');
				});
			}

			// Get two weeks' worth of tags
			tags.unshift({'tag': 'HEAD'});

			tags =
			  tags
				.slice(0, 14)
				.map(function (tag, index) {
					return [
						tag,
						tags[index + 1] || tags[index]
					];
				});

			log.write('# Ghost Changelog\n\n');
			log.write('_Showing ' + tags.length + ' releases._\n');

			when.reduce(tags,
			  function (prev, tag, idx) {
				  /*jslint unparam:true*/
				  return when.promise(function (resolve) {
					  processTag(tag, function (releaseData) {
						  resolve(prev + '\n' + releaseData);
					  });
				  });
			  }, '')
			  .then(function (reducedChangelog) {
				  log.write(reducedChangelog);
				  log.close();
				  done(true);
			  });
		});
	});

};