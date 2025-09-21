This section explains prominent concepts and notations in the set of high-level S3 commands provided.

If you are looking for the low level S3 commands for the CLI, please see the
``s3api`` command `reference page
<https://docs.aws.amazon.com/cli/latest/reference/s3api/index.html>`_.

Path Argument Type
++++++++++++++++++

Whenever using a command, at least one path argument must be specified.  There
are two types of path arguments: ``LocalPath`` and ``S3Uri``.

``LocalPath``: represents the path of a local file or directory.  It can be
written as an absolute path or relative path.

``S3Uri``: represents the location of a S3 object, prefix, or bucket.  This
must be written in the form ``s3://amzn-s3-demo-bucket/mykey`` where ``amzn-s3-demo-bucket`` is
the specified S3 bucket, ``mykey`` is the specified S3 key.  The path argument
must begin with ``s3://`` in order to denote that the path argument refers to
a S3 object. Note that prefixes are separated by forward slashes. For
example, if the S3 object ``myobject`` had the prefix ``myprefix``, the
S3 key would be ``myprefix/myobject``, and if the object was in the bucket
``amzn-s3-demo-bucket``, the ``S3Uri`` would be ``s3://amzn-s3-demo-bucket/myprefix/myobject``.

``S3Uri`` also supports S3 access points. To specify an access point, this
value must be of the form ``s3://<access-point-arn>/<key>``. For example if
the access point ``myaccesspoint`` to be used has the ARN:
``arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint`` and the object
being accessed has the key ``mykey``, then the ``S3URI`` used must be:
``s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/mykey``.
Similar to bucket names, you can also use prefixes with access point ARNs for
the ``S3Uri``. For example:
``s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/myprefix/``



Order of Path Arguments
+++++++++++++++++++++++

Every command takes one or two positional path arguments.  The first path
argument represents the source, which is the local file/directory or S3
object/prefix/bucket that is being referenced.  If there is a second path
argument, it represents the destination, which is the local file/directory
or S3 object/prefix/bucket that is being operated on.  Commands with only
one path argument do not have a destination because the operation is being
performed only on the source.


Single Local File and S3 Object Operations
++++++++++++++++++++++++++++++++++++++++++

Some commands perform operations only on single files and S3 objects.  The
following commands are single file/object operations if no ``--recursive``
flag is provided.

    * ``cp``
    * ``mv``
    * ``rm``

For this type of operation, the first path argument, the source, must exist
and be a local file or S3 object.  The second path argument, the destination,
can be the name of a local file, local directory, S3 object, S3 prefix,
or S3 bucket.

The destination is indicated as a local directory, S3 prefix, or S3 bucket
if it ends with a forward slash or back slash.  The use of slash depends
on the path argument type.  If the path argument is a ``LocalPath``,
the type of slash is the separator used by the operating system.  If the
path is a ``S3Uri``, the forward slash must always be used.  If a slash
is at the end of the destination, the destination file or object will
adopt the name of the source file or object.  Otherwise, if there is no
slash at the end, the file or object will be saved under the name provided.
See examples in ``cp`` and ``mv`` to illustrate this description.


Directory and S3 Prefix Operations
++++++++++++++++++++++++++++++++++

Some commands only perform operations on the contents of a local directory
or S3 prefix/bucket.  Adding or omitting a forward slash or back slash to
the end of any path argument, depending on its type, does not affect the
results of the operation.  The following commands will always result in
a directory or S3 prefix/bucket operation:

* ``sync``
* ``mb``
* ``rb``
* ``ls``


Use of Exclude and Include Filters
++++++++++++++++++++++++++++++++++

Currently, there is no support for the use of UNIX style wildcards in
a command's path arguments.  However, most commands have ``--exclude "<value>"``
and ``--include "<value>"`` parameters that can achieve the desired result.
These parameters perform pattern matching to either exclude or include
a particular file or object.  The following pattern symbols are supported.

    * ``*``: Matches everything
    * ``?``: Matches any single character
    * ``[sequence]``: Matches any character in ``sequence``
    * ``[!sequence]``: Matches any character not in ``sequence``

Any number of these parameters can be passed to a command.  You can do this by
providing an ``--exclude`` or ``--include`` argument multiple times, e.g.
``--include "*.txt" --include "*.png"``.
When there are multiple filters, the rule is the filters that appear later in
the command take precedence over filters that appear earlier in the command.
For example, if the filter parameters passed to the command were

::

    --exclude "*" --include "*.txt"

All files will be excluded from the command except for files ending with
``.txt``  However, if the order of the filter parameters was changed to

::

    --include "*.txt" --exclude "*"

All files will be excluded from the command.

Each filter is evaluated against the **source directory**.  If the source
location is a file instead of a directory, the directory containing the file is
used as the source directory.  For example, suppose you had the following
directory structure::

    /tmp/foo/
      .git/
      |---config
      |---description
      foo.txt
      bar.txt
      baz.jpg

In the command ``aws s3 sync /tmp/foo s3://bucket/`` the source directory is
``/tmp/foo``.  Any include/exclude filters will be evaluated with the source
directory prepended.  Below are several examples to demonstrate this.

Given the directory structure above and the command
``aws s3 cp /tmp/foo s3://bucket/ --recursive --exclude ".git/*"``, the
files ``.git/config`` and ``.git/description`` will be excluded from the
files to upload because the exclude filter ``.git/*`` will have the source
prepended to the filter.  This means that::

    /tmp/foo/.git/* -> /tmp/foo/.git/config       (matches, should exclude)
    /tmp/foo/.git/* -> /tmp/foo/.git/description  (matches, should exclude)
    /tmp/foo/.git/* -> /tmp/foo/foo.txt  (does not match, should include)
    /tmp/foo/.git/* -> /tmp/foo/bar.txt  (does not match, should include)
    /tmp/foo/.git/* -> /tmp/foo/baz.jpg  (does not match, should include)

The command ``aws s3 cp /tmp/foo/ s3://bucket/ --recursive --exclude "ba*"``
will exclude ``/tmp/foo/bar.txt`` and ``/tmp/foo/baz.jpg``::

    /tmp/foo/ba* -> /tmp/foo/.git/config      (does not match, should include)
    /tmp/foo/ba* -> /tmp/foo/.git/description (does not match, should include)
    /tmp/foo/ba* -> /tmp/foo/foo.txt          (does not match, should include)
    /tmp/foo/ba* -> /tmp/foo/bar.txt  (matches, should exclude)
    /tmp/foo/ba* -> /tmp/foo/baz.jpg  (matches, should exclude)


Note that, by default, *all files are included*.  This means that
providing **only** an ``--include`` filter will not change what
files are transferred.  ``--include`` will only re-include files that
have been excluded from an ``--exclude`` filter.  If you only want
to upload files with a particular extension, you need to first exclude
all files, then re-include the files with the particular extension.
This command will upload **only** files ending with ``.jpg``::

    aws s3 cp /tmp/foo/ s3://bucket/ --recursive --exclude "*" --include "*.jpg"

If you wanted to include both ``.jpg`` files as well as ``.txt`` files you
can run::

    aws s3 cp /tmp/foo/ s3://bucket/ --recursive \
        --exclude "*" --include "*.jpg" --include "*.txt"
