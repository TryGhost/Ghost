:title: AWS CLI S3 FAQ
:description: Frequented Asked Questions for Amazon S3 in the AWS CLI
:category: S3
:related command: s3 cp, s3 sync, s3 mv, s3 rm


S3 FAQ
======

Below are common questions regarding the use of Amazon S3 in the AWS CLI.


Q: Does the AWS CLI validate checksums?
---------------------------------------

The AWS CLI will attempt to perform checksum validation for uploading and
downloading files, as described below.

Upload
~~~~~~

The AWS CLI v2 will calculate and auto-populate a ``x-amz-checksum-<algorithm>`` HTTP header by
default for each upload, where ``<algorithm>`` is the algorithm used to calculate the checksum.
By default, the Cyclic Redundancy Check 64 (CRC64NVME) algorithm
is used to calculate checksums, but an alternative algorithm can be specified by using the
``--checksum-algorithm`` argument on high-level ``aws s3`` commands. The checksum algorithms
supported by the AWS CLI v2 are:

- CRC64NVME (Recommended)
- CRC32
- CRC32C
- SHA1
- SHA256

Amazon S3 will use the algorithm specified in the header to calculate the checksum of the object. If it
does not match the checksum provided, the object will not be stored and an error message
will be returned. Otherwise, the checksum is stored in object metadata that you can use
later to verify data integrity of download operations (see Download section).

.. note::
    Note that the AWS CLI will perform the above checksum calculations for commands that perform uploads. This
    includes high-level commands like ``aws s3 cp``, ``aws s3 sync``, and ``aws s3 mv``, and low-level commands
    like ``aws s3api put-object`` and ``aws s3api upload-part``."

    For high-level command invocations that result in uploading multiple files (e.g. ``aws s3 sync``),
    the same checksum algorithm will be used for all file uploads included in the command execution.

For more information about verifying data integrity in Amazon S3, see
`Checking object integrity in Amazon S3
<https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html>`_ in the Amazon S3 User Guide.

Download
~~~~~~

The AWS CLI will attempt to verify the checksum of downloads when possible. If a non-MD5 checksum is returned
with a downloaded object, the CLI will use the same algorithm to recalculate the checksum and verify
it matches the one stored in Amazon S3. If checksum validation fails, an error is raised and the request will NOT be
retried.

.. note::
    Note that the AWS CLI will perform the above checksum calculations for commands that perform uploads. This
    includes high-level commands like ``aws s3 cp``, ``aws s3 sync``, and ``aws s3 mv``, and low-level commands
    like ``aws s3api get-object``"

For more information about verifying data integrity in Amazon S3, see
`Checking object integrity in Amazon S3
<https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html>`_ in the Amazon S3 User Guide.
