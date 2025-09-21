The following command retrieves the location constraint for a bucket named ``amzn-s3-demo-bucket``, if a constraint exists::

  aws s3api get-bucket-location --bucket amzn-s3-demo-bucket

Output::

  {
      "LocationConstraint": "us-west-2"
  }