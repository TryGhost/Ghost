The following command verifies access to a bucket named ``amzn-s3-demo-bucket``::

  aws s3api head-bucket --bucket amzn-s3-demo-bucket

If the bucket exists and you have access to it, no output is returned. Otherwise, an error message will be shown. For example::

  A client error (404) occurred when calling the HeadBucket operation: Not Found