**Example 1: Move a local file to the specified bucket**

The following ``mv`` command moves a single file to a specified bucket and key. ::

    aws s3 mv test.txt s3://amzn-s3-demo-bucket/test2.txt

Output::

    move: test.txt to s3://amzn-s3-demo-bucket/test2.txt

**Example 2: Move an object to the specified bucket and key**

The following ``mv`` command moves a single s3 object to a specified bucket and key. ::

    aws s3 mv s3://amzn-s3-demo-bucket/test.txt s3://amzn-s3-demo-bucket/test2.txt

Output::

    move: s3://amzn-s3-demo-bucket/test.txt to s3://amzn-s3-demo-bucket/test2.txt

**Example 3: Move an S3 object to the local directory**

The following ``mv`` command moves a single object to a specified file locally. ::

    aws s3 mv s3://amzn-s3-demo-bucket/test.txt test2.txt

Output::

    move: s3://amzn-s3-demo-bucket/test.txt to test2.txt

**Example 4: Move an object with it's original name to the specified bucket**

The following ``mv`` command moves a single object to a specified bucket while retaining its original name::

    aws s3 mv s3://amzn-s3-demo-bucket/test.txt s3://amzn-s3-demo-bucket2/

Output::

    move: s3://amzn-s3-demo-bucket/test.txt to s3://amzn-s3-demo-bucket2/test.txt

**Example 5: Move all objects and prefixes in a bucket to the local directory**

When passed with the parameter ``--recursive``, the following ``mv`` command recursively moves all objects under a
specified prefix and bucket to a specified directory.  In this example, the bucket ``amzn-s3-demo-bucket`` has the objects
``test1.txt`` and ``test2.txt``. ::

    aws s3 mv s3://amzn-s3-demo-bucket . \
        --recursive

Output::

    move: s3://amzn-s3-demo-bucket/test1.txt to test1.txt
    move: s3://amzn-s3-demo-bucket/test2.txt to test2.txt

**Example 6: Move all objects and prefixes in a bucket to the local directory, except ``.jpg`` files**

When passed with the parameter ``--recursive``, the following ``mv`` command recursively moves all files under a
specified directory to a specified bucket and prefix while excluding some files by using an ``--exclude`` parameter. In
this example, the directory ``myDir`` has the files ``test1.txt`` and ``test2.jpg``. ::

    aws s3 mv myDir s3://amzn-s3-demo-bucket/ \
        --recursive \
        --exclude "*.jpg"

Output::

    move: myDir/test1.txt to s3://amzn-s3-demo-bucket2/test1.txt

**Example 7: Move all objects and prefixes in a bucket to the local directory, except specified prefix**

When passed with the parameter ``--recursive``, the following ``mv`` command recursively moves all objects under a
specified bucket to another bucket while excluding some objects by using an ``--exclude`` parameter.  In this example,
the bucket ``amzn-s3-demo-bucket`` has the objects ``test1.txt`` and ``another/test1.txt``. ::

    aws s3 mv s3://amzn-s3-demo-bucket/ s3://amzn-s3-demo-bucket2/ \
        --recursive \
        --exclude "amzn-s3-demo-bucket/another/*"

Output::

    move: s3://amzn-s3-demo-bucket/test1.txt to s3://amzn-s3-demo-bucket2/test1.txt

**Example 8: Move an object to the specified bucket and set the ACL**

The following ``mv`` command moves a single object to a specified bucket and key while setting the ACL to
``public-read-write``. ::

    aws s3 mv s3://amzn-s3-demo-bucket/test.txt s3://amzn-s3-demo-bucket/test2.txt \
        --acl public-read-write

Output::

    move: s3://amzn-s3-demo-bucket/test.txt to s3://amzn-s3-demo-bucket/test2.txt

**Example 9: Move a local file to the specified bucket and grant permissions**

The following ``mv`` command illustrates the use of the ``--grants`` option to grant read access to all users and full
control to a specific user identified by their email address. ::

    aws s3 mv file.txt s3://amzn-s3-demo-bucket/ \
        --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers full=emailaddress=user@example.com

Output::

    move: file.txt to s3://amzn-s3-demo-bucket/file.txt

**Example 10: Move a file to an S3 access point**

The following ``mv`` command moves a single file named ``mydoc.txt`` to the access point named ``myaccesspoint`` at the key named ``mykey``. ::

    aws s3 mv mydoc.txt s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/mykey

Output::

    move: mydoc.txt to s3://arn:aws:s3:us-west-2:123456789012:accesspoint/myaccesspoint/mykey