:title: AWS CLI S3 Configuration
:description: Advanced configuration for AWS S3 Commands
:category: S3
:related command: s3 cp, s3 sync, s3 mv, s3 rm

The ``aws s3`` transfer commands, which include the ``cp``, ``sync``, ``mv``,
and ``rm`` commands, have additional configuration values you can use to
control S3 transfers.  This topic guide discusses these parameters as well as
best practices and guidelines for setting these values.

Before discussing the specifics of these values, note that these values are
entirely optional.  You should be able to use the ``aws s3`` transfer commands
without having to configure any of these values.  These configuration values
are provided in the case where you need to modify one of these values, either
for performance reasons or to account for the specific environment where these
``aws s3`` commands are being run.


Configuration Values
====================

These are the configuration values you can set specifically for the ``aws s3``
command set:

* ``max_concurrent_requests`` - The maximum number of concurrent requests.
* ``max_queue_size`` - The maximum number of tasks in the task queue.
* ``multipart_threshold`` - The size threshold the CLI uses for multipart
  transfers of individual files.
* ``multipart_chunksize`` - When using multipart transfers, this is the chunk
  size that the CLI uses for multipart transfers of individual files.
* ``max_bandwidth`` - The maximum bandwidth that will be consumed for uploading
  and downloading data to and from Amazon S3.
* ``io_chunksize`` - The maximum size of read parts that can be queued in-memory
  to be written for a download.

For experimental ``s3`` configuration values, see the the
`Experimental Configuration Values <#experimental-configuration-values>`__
section.

These are the configuration values that can be set for both ``aws s3``
and ``aws s3api``:

* ``use_accelerate_endpoint`` - Use the Amazon S3 Accelerate endpoint for
  all ``s3`` and ``s3api`` commands. You **must** first enable S3 Accelerate
  on your bucket before attempting to use the endpoint. This is mutually
  exclusive with the ``use_dualstack_endpoint`` option.
* ``use_dualstack_endpoint`` - Use the Amazon S3 dual IPv4 / IPv6 endpoint for
  all ``s3`` and ``s3api`` commands.  This is mutually exclusive with the
  ``use_accelerate_endpoint`` option.
* ``addressing_style`` - Specifies which addressing style to use. This controls
  if the bucket name is in the hostname or part of the URL. Value values are:
  ``path``, ``virtual``, and ``auto``.  The default value is ``auto``.
* ``payload_signing_enabled`` - Refers to whether or not to SHA256 sign sigv4
  payloads. By default, this is disabled for streaming uploads (UploadPart
  and PutObject) when using https.


These values must be set under the top level ``s3`` key in the AWS Config File,
which has a default location of ``~/.aws/config``.  Below is an example
configuration::

    [profile development]
    aws_access_key_id=foo
    aws_secret_access_key=bar
    s3 =
      max_concurrent_requests = 20
      max_queue_size = 10000
      multipart_threshold = 64MB
      multipart_chunksize = 16MB
      max_bandwidth = 50MB/s
      use_accelerate_endpoint = true
      addressing_style = path


Note that all the S3 configuration values are indented and nested under the top
level ``s3`` key.

You can also set these values programmatically using the ``aws configure set``
command.  For example, to set the above values for the default profile, you
could instead run these commands::

    $ aws configure set default.s3.max_concurrent_requests 20
    $ aws configure set default.s3.max_queue_size 10000
    $ aws configure set default.s3.multipart_threshold 64MB
    $ aws configure set default.s3.multipart_chunksize 16MB
    $ aws configure set default.s3.max_bandwidth 50MB/s
    $ aws configure set default.s3.use_accelerate_endpoint true
    $ aws configure set default.s3.addressing_style path

To programmatically set these values for a profile other than the default
profile the ``--profile`` flag can be provided. For example, to set
configuration for a profile named ``test-profile`` you could run a command like
this one::

    $ aws configure set s3.max_concurrent_requests 20 --profile test-profile

max_concurrent_requests
-----------------------

**Default** - ``10``

The ``aws s3`` transfer commands are multithreaded.  At any given time,
multiple requests to Amazon S3 are in flight.  For example, if you are
uploading a directory via ``aws s3 cp localdir s3://bucket/ --recursive``, the
AWS CLI could be uploading the local files ``localdir/file1``,
``localdir/file2``, and ``localdir/file3`` in parallel.  The
``max_concurrent_requests`` specifies the maximum number of transfer commands
that are allowed at any given time.

You may need to change this value for a few reasons:

* Decreasing this value - On some environments, the default of 10 concurrent
  requests can overwhelm a system.  This may cause connection timeouts or
  slow the responsiveness of the system.  Lowering this value will make the
  S3 transfer commands less resource intensive.  The tradeoff is that
  S3 transfers may take longer to complete. Lowering this value may be
  necessary if using a tool such as ``trickle`` to limit bandwidth.
* Increasing this value - In some scenarios, you may want the S3 transfers
  to complete as quickly as possible, using as much network bandwidth
  as necessary.  In this scenario, the default number of concurrent requests
  may not be sufficient to utilize all the network bandwidth available.
  Increasing this value may improve the time it takes to complete an
  S3 transfer.


max_queue_size
--------------

**Default** - ``1000``

The AWS CLI internally uses a producer consumer model, where we queue up S3
tasks that are then executed by consumers, which in this case utilize a bound
thread pool, controlled by ``max_concurrent_requests``.  A task generally maps
to a single S3 operation.  For example, as task could be a ``PutObjectTask``,
or a ``GetObjectTask``, or an ``UploadPartTask``.  The enqueuing rate can be
much faster than the rate at which consumers are executing tasks.  To avoid
unbounded growth, the task queue size is capped to a specific size.  This
configuration value changes the value of that maximum number.

You generally will not need to change this value.  This value also corresponds
to the number of tasks we are aware of that need to be executed.  This means
that by default we can only see 1000 tasks ahead.  Until the S3 command knows
the total number of tasks executed, the progress line will show a total of
``...``.  Increasing this value means that we will be able to more quickly know
the total number of tasks needed, assuming that the enqueuing rate is quicker
than the rate of task consumption.  The tradeoff is that a larger max queue
size will require more memory.


multipart_threshold
-------------------

**Default** - ``8MB``

When uploading, downloading, or copying a file, the S3 commands
will switch to multipart operations if the file reaches a given
size threshold.  The ``multipart_threshold`` controls this value.
You can specify this value in one of two ways:

* The file size in bytes.  For example, ``1048576``.
* The file size with a size suffix.  You can use ``KB``, ``MB``, ``GB``,
  ``TB``.  For example: ``10MB``, ``1GB``.  Note that S3 imposes
  constraints on valid values that can be used for multipart
  operations.


multipart_chunksize
-------------------

**Default** - ``8MB``

**Minimum For Uploads** - ``5MB``

Once the S3 commands have decided to use multipart operations, the
file is divided into chunks.  This configuration option specifies what
the chunk size (also referred to as the part size) should be.  This
value can specified using the same semantics as ``multipart_threshold``,
that is either as the number of bytes as an integer, or using a size
suffix. If the specified chunk size does not fit within the established
limits for S3 multipart uploads, the chunk size will be automatically 
adjusted to a valid value.


max_bandwidth
-------------

**Default** - None

This controls the maximum bandwidth that the S3 commands will
utilize when streaming content data to and from S3. Thus, this value only
applies for uploads and downloads. It does not apply to copies nor deletes
because those data transfers take place server side. The value can be
specified as:

* An integer in terms of **bytes** per second. For example, ``1048576`` would
  set the maximum bandwidth usage to 1 MB per second.
* A rate suffix. This can be expressed in terms of either bytes per second
  (``B/s``) or bits per second (``b/s``). You can specify rate suffixes
  using: ``KB/s``, ``MB/s``, ``GB/s``, ``Kb/s``, ``Mb/s``, ``Gb/s`` etc.
  For example: ``300KB/s``, ``10MB/s``, ``300Kb/s``, ``10Mb/s``.

In general, it is recommended to first use ``max_concurrent_requests`` to lower
transfers to the desired bandwidth consumption. The ``max_bandwidth`` setting
should then be used to further limit bandwidth consumption if setting
``max_concurrent_requests`` is unable to lower bandwidth consumption to the
desired rate. This is recommended because ``max_concurrent_requests`` controls
how many threads are currently running. So if a high ``max_concurrent_requests``
value is set and a low ``max_bandwidth`` value is set, it may result in
threads having to wait unnecessarily which can lead to excess resource
consumption and connection timeouts.


io_chunksize
------------

**Default** - ``256KB``

When a GET request is called for downloads, the response contains a file-like
object that streams data fetched from S3. Chunks are read from the stream and
queued in-memory for writes. ``io_chunksize`` configures the maximum size of
elements in the IO queue. This value can be specified using the same semantics
as ``multipart_threshold``, that is either as the number of bytes as an
integer, or using a size suffix.

Increasing this value may result in higher overall throughput by preventing
blocking in cases where large objects are downloaded in environments where
network speed exceeds disk write speed. It is recommended to only configure
``io_chunksize`` if overall download throughput is constrained by writes.
In cases where network IO is the bottleneck, it is recommended to configure
``max_concurrent_requests`` instead.


use_accelerate_endpoint
-----------------------

**Default** - ``false``

If set to ``true``, will direct all Amazon S3 requests to the S3 Accelerate
endpoint: ``s3-accelerate.amazonaws.com``. To use this endpoint, your bucket
must be enabled to use S3 Accelerate. All request will be sent using the
virtual style of bucket addressing: ``my-bucket.s3-accelerate.amazonaws.com``.
Any ``ListBuckets``, ``CreateBucket``, and ``DeleteBucket`` requests will not
be sent to the Accelerate endpoint as the endpoint does not support those
operations. This behavior can also be set if ``--endpoint-url`` parameter
is set to ``https://s3-accelerate.amazonaws.com`` or
``http://s3-accelerate.amazonaws.com`` for any ``s3`` or ``s3api`` command. This
option is mutually exclusive with the ``use_dualstack_endpoint`` option.


use_dualstack_endpoint
----------------------

**Default** - ``false``

If set to ``true``, will direct all Amazon S3 requests to the dual IPv4 / IPv6
endpoint for the configured region. This option is mutually exclusive with
the ``use_accelerate_endpoint`` option.


addressing_style
----------------

**Default** - ``auto``

There's two styles of constructing an S3 endpoint.  The first is with
the bucket included as part of the hostname.  This corresponds to the
addressing style of ``virtual``.  The second is with the bucket included
as part of the path of the URI, corresponding to the addressing style
of ``path``.  The default value in the CLI is to use ``auto``, which
will attempt to use ``virtual`` where possible, but will fall back to
``path`` style if necessary.  For example, if your bucket name is not
DNS compatible, the bucket name cannot be part of the hostname and
must be in the path.  With ``auto``, the CLI will detect this condition
and automatically switch to ``path`` style for you.  If you set the
addressing style to ``path``, you must ensure that the AWS region you
configured in the AWS CLI matches the same region of your bucket.


payload_signing_enabled
-----------------------

If set to ``true``, s3 payloads will receive additional content validation in
the form of a SHA256 checksum which will be calculated for you and included in
the request signature. If set to ``false``, the checksum will not be calculated.
Disabling this can be useful to save the performance overhead that the
checksum calculation would otherwise cause.

By default, this is disabled for streaming uploads (UploadPart and PutObject),
but only if a ContentMD5 is present (it is generated by default) and the
endpoint uses HTTPS.


preferred_transfer_client
-------------------------

**Default** - ``auto``

Determines the underlying Amazon S3 transfer client to use for transferring
files to and from S3. Valid choices are:

* ``auto`` - Auto resolve the Amazon S3 transfer client to use. Currently,
  it resolves to ``crt`` when all of the following criteria is met:

  * The ``s3`` command used is not an S3 to S3 copy transfer. The ``crt``
    transfer client currently only supports uploads to S3, downloads from
    S3, and deletion of S3 objects.

  * The host running the AWS CLI is optimized for the ``crt`` transfer client.
    Currently, the ``crt`` transfer client is optimized for Amazon EC2 instances
    that are running Linux as the operating system and are of any of these
    instance types:

    * ``p4d.24xlarge``
    * ``p4de.24xlarge``
    * ``p5.48xlarge``
    * ``trn1n.32xlarge``
    * ``trn1.32xlarge``

  * There are no other running processes of the AWS CLI using the CRT S3 transfer
    client. To force multiple concurrently running processes of the AWS CLI to use
    the CRT S3 transfer client, set the ``preferred_transfer_client`` configuration
    variable to ``crt``.

  Otherwise, it resolves to ``classic``. Between versions of the AWS CLI, auto
  resolution criteria may change. To guarantee use of a specific transfer client,
  set the ``preferred_transfer_client`` configuration variable to the
  appropriate transfer client listed below.

* ``classic`` -  Use the builtin, Python-based transfer client that supports
  all ``s3`` commands, parameters, and most configuration values.

* ``crt`` - Use the AWS Common Runtime (CRT) transfer client when
  possible. It is a C-based S3 transfer client that can improve transfer
  throughput. Currently, the CRT transfer client does not support all of the
  functionality available in the ``classic`` transfer client. The list below
  details what functionality is currently not supported by the ``crt``
  transfer client option and the corresponding behavior of the AWS CLI if it
  is configured to prefer the ``crt`` transfer client:

  * S3 to S3 copies - Falls back to using the ``classic`` transfer client

  * Region redirects - Transfers fail for requests sent to a region that does
    not match the region of the targeted S3 bucket.

  * ``max_concurrent_requests``, ``max_queue_size``, ``multipart_threshold``,
    and ``max_bandwidth`` configuration values - Ignores these configuration
    values.


target_bandwidth
----------------
.. note::
   This configuration option is only supported when the ``preferred_transfer_client``
   configuration value is set to or resolves to ``crt``. The ``classic`` transfer
   client does not support this configuration option.

**Default** - Automatically derived based on system

Controls the target bandwidth that the transfer client will try to reach
for S3 uploads and downloads. By default, the AWS CLI will automatically
attempt to choose a target bandwidth that matches the system's maximum
network bandwidth. Currently, if the AWS CLI is unable to determine the
maximum network bandwith, the AWS CLI falls back to a target bandwidth of
ten gigabits per second (i.e. equivalent to setting the ``target_bandwidth``
configuration option to ``10000000000b/s``). To set a specific target bandwith,
explicitly configure the ``target_bandwidth`` configuration option. Its
value can be specified as:

* An integer in terms of **bytes** per second. For example,
  ``1073741824`` would set the target bandwidth to 1 gibibyte per second.
* A rate suffix. This can be expressed in terms of either bytes per second
  (``B/s``) or bits per second (``b/s``). You can specify rate suffixes
  using: ``KB/s``, ``MB/s``, ``GB/s``, ``Kb/s``, ``Mb/s``, ``Gb/s`` etc.
  For example: ``200MB/s``, ``10GB/s``, ``200Mb/s``, ``10Gb/s``. When specifying
  rate suffixes, values are expanded using powers of 2 instead of 10. For example,
  specifying ``1KB/s`` is equivalent to specifying ``1024B/s`` instead of ``1000B/s``.

This difference between ``target_bandwidth`` and the ``max_bandwidth`` is that
``max_bandwidth`` is purely for rate limiting and makes no adjustments to
increase throughput. The ``target_bandwidth`` configuration may make
adjustments mid-transfer command in order to increase throughput and reach the
requested bandwidth.


Experimental Configuration Values
=================================

.. warning::
   All configuration values listed in this section are considered experimental
   and are **not** recommended for use in production. Furthermore, backwards
   compatibility or even existence of each configuration value is not
   guaranteed between versions of the AWS CLI.

There are currently no experimental configuration values.
