**Example 1: Delete a bucket**

The following ``rb`` command removes a bucket.  In this example, the user's bucket is ``amzn-s3-demo-bucket``.  Note that the bucket must be empty in order to remove::

    aws s3 rb s3://amzn-s3-demo-bucket

Output::

    remove_bucket: amzn-s3-demo-bucket

**Example 2: Force delete a bucket**

The following ``rb`` command uses the ``--force`` parameter to first remove all of the objects in the bucket and then
remove the bucket itself.  In this example, the user's bucket is ``amzn-s3-demo-bucket`` and the objects in ``amzn-s3-demo-bucket`` are
``test1.txt`` and ``test2.txt``::

    aws s3 rb s3://amzn-s3-demo-bucket \
        --force

Output::

    delete: s3://amzn-s3-demo-bucket/test1.txt
    delete: s3://amzn-s3-demo-bucket/test2.txt
    remove_bucket: amzn-s3-demo-bucket