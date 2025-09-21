The following example uses the ``list-objects`` command to display the names of all the objects in the specified bucket::

  aws s3api list-objects --bucket text-content --query 'Contents[].{Key: Key, Size: Size}'

The example uses the ``--query`` argument to filter the output of
``list-objects`` down to the key value and size for each object

For more information about objects, see `Working with Amazon S3 Objects`_ in the *Amazon S3 Developer Guide*.

.. _`Working with Amazon S3 Objects`: http://docs.aws.amazon.com/AmazonS3/latest/dev/UsingObjects.html
