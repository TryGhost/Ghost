The following command retrieves the versioning configuration for a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-bucket-versioning --bucket amzn-s3-demo-bucket

Output::

  {
      "Status": "Enabled"
  }
