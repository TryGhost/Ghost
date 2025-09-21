The following command deletes an object named ``test.txt`` from a bucket named ``amzn-s3-demo-bucket``::

  aws s3api delete-object --bucket amzn-s3-demo-bucket --key test.txt

If bucket versioning is enabled, the output will contain the version ID of the delete marker::

  {
    "VersionId": "9_gKg5vG56F.TTEUdwkxGpJ3tNDlWlGq",
    "DeleteMarker": true
  }

For more information about deleting objects, see `Deleting Objects`_ in the *Amazon S3 Developer Guide*.

.. _`Deleting Objects`: http://docs.aws.amazon.com/AmazonS3/latest/dev/DeletingObjects.html
