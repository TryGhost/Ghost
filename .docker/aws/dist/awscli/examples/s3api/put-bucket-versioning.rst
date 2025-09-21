The following command enables versioning on a bucket named ``amzn-s3-demo-bucket``::

  aws s3api put-bucket-versioning --bucket amzn-s3-demo-bucket --versioning-configuration Status=Enabled

The following command enables versioning, and uses an mfa code ::

  aws s3api put-bucket-versioning --bucket amzn-s3-demo-bucket --versioning-configuration Status=Enabled --mfa "SERIAL 123456"
