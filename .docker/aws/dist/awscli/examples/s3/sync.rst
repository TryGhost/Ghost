**Example 1: Sync all local objects to the specified bucket**

The following ``sync`` command syncs objects from a local directory to the specified prefix and bucket by
uploading the local files to S3.  A local file will require uploading if the size of the local file is different than
the size of the S3 object, the last modified time of the local file is newer than the last modified time of the S3
object, or the local file does not exist under the specified bucket and prefix.  In this example, the user syncs the
bucket ``amzn-s3-demo-bucket`` to the local current directory.  The local current directory contains the files ``test.txt`` and
``test2.txt``.  The bucket ``amzn-s3-demo-bucket`` contains no objects. ::

    aws s3 sync . s3://amzn-s3-demo-bucket

Output::

    upload: test.txt to s3://amzn-s3-demo-bucket/test.txt
    upload: test2.txt to s3://amzn-s3-demo-bucket/test2.txt

**Example 2: Sync all S3 objects from the specified S3 bucket to another bucket**

The following ``sync`` command syncs objects under a specified prefix and bucket to objects under another specified
prefix and bucket by copying S3 objects. An S3 object will require copying if the sizes of the two S3 objects differ,
the last modified time of the source is newer than the last modified time of the destination, or the S3 object does not
exist under the specified bucket and prefix destination. 

In this example, the user syncs the bucket ``amzn-s3-demo-bucket`` to the bucket ``amzn-s3-demo-bucket2``. The bucket ``amzn-s3-demo-bucket`` contains the objects ``test.txt`` and ``test2.txt``. The bucket
``amzn-s3-demo-bucket2`` contains no objects::

    aws s3 sync s3://amzn-s3-demo-bucket s3://amzn-s3-demo-bucket2

Output::

    copy: s3://amzn-s3-demo-bucket/test.txt to s3://amzn-s3-demo-bucket2/test.txt
    copy: s3://amzn-s3-demo-bucket/test2.txt to s3://amzn-s3-demo-bucket2/test2.txt

**Example 3: Sync all S3 objects from the specified S3 bucket to the local directory**

The following ``sync`` command syncs files from the specified S3 bucket to the local directory by
downloading S3 objects. An S3 object will require downloading if the size of the S3 object differs from the size of the
local file, the last modified time of the S3 object is newer than the last modified time of the local file, or the S3
object does not exist in the local directory. Take note that when objects are downloaded from S3, the last modified
time of the local file is changed to the last modified time of the S3 object. In this example, the user syncs the
bucket ``amzn-s3-demo-bucket`` to the current local directory. The bucket ``amzn-s3-demo-bucket`` contains the objects ``test.txt`` and
``test2.txt``.  The current local directory has no files::

    aws s3 sync s3://amzn-s3-demo-bucket .

Output::

    download: s3://amzn-s3-demo-bucket/test.txt to test.txt
    download: s3://amzn-s3-demo-bucket/test2.txt to test2.txt

**Example 4: Sync all local objects to the specified bucket and delete all files that do not match**

The following ``sync`` command syncs objects under a specified prefix and bucket to files in a local directory by
uploading the local files to S3.  Because of the ``--delete`` parameter, any files existing under the
specified prefix and bucket but not existing in the local directory will be deleted.  In this example, the user syncs
the bucket ``amzn-s3-demo-bucket`` to the local current directory.  The local current directory contains the files ``test.txt`` and
``test2.txt``.  The bucket ``amzn-s3-demo-bucket`` contains the object ``test3.txt``::

    aws s3 sync . s3://amzn-s3-demo-bucket \
        --delete

Output::

    upload: test.txt to s3://amzn-s3-demo-bucket/test.txt
    upload: test2.txt to s3://amzn-s3-demo-bucket/test2.txt
    delete: s3://amzn-s3-demo-bucket/test3.txt

**Example 5: Sync all local objects to the specified bucket except ``.jpg`` files**

The following ``sync`` command syncs objects under a specified prefix and bucket to files in a local directory by
uploading the local files to S3. Because of the ``--exclude`` parameter, all files matching the pattern
existing both in S3 and locally will be excluded from the sync. In this example, the user syncs the bucket ``amzn-s3-demo-bucket``
to the local current directory.  The local current directory contains the files ``test.jpg`` and ``test2.txt``.  The
bucket ``amzn-s3-demo-bucket`` contains the object ``test.jpg`` of a different size than the local ``test.jpg``::

    aws s3 sync . s3://amzn-s3-demo-bucket \
        --exclude "*.jpg"

Output::

    upload: test2.txt to s3://amzn-s3-demo-bucket/test2.txt

**Example 6: Sync all local objects to the specified bucket except specified directory files**

The following ``sync`` command syncs files under a local directory to objects under a specified prefix and bucket by
downloading S3 objects.  This example uses the ``--exclude`` parameter flag to exclude a specified directory
and S3 prefix from the ``sync`` command.  In this example, the user syncs the local current directory to the bucket
``amzn-s3-demo-bucket``.  The local current directory contains the files ``test.txt`` and ``another/test2.txt``.  The bucket
``amzn-s3-demo-bucket`` contains the objects ``another/test5.txt`` and ``test1.txt``::

    aws s3 sync s3://amzn-s3-demo-bucket/ . \
        --exclude "*another/*"

Output::

    download: s3://amzn-s3-demo-bucket/test1.txt to test1.txt

**Example 7: Sync all objects between buckets in different regions**

The following ``sync`` command syncs files between two buckets in different regions::

    aws s3 sync s3://my-us-west-2-bucket s3://my-us-east-1-bucket \
        --source-region us-west-2 \
        --region us-east-1

Output::

    download: s3://my-us-west-2-bucket/test1.txt to s3://my-us-east-1-bucket/test1.txt

**Example 8: Sync to an S3 access point**

The following ``sync`` command syncs the current directory to the access point (``myaccesspoint``)::

    aws s3 sync . s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/

Output::

    upload: test.txt to s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/test.txt
    upload: test2.txt to s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/test2.txt
