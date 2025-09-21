The following command retrieves metadata for an object in a bucket named ``amzn-s3-demo-bucket``::

  aws s3api head-object --bucket amzn-s3-demo-bucket --key index.html

Output::

  {
      "AcceptRanges": "bytes",
      "ContentType": "text/html",
      "LastModified": "Thu, 16 Apr 2015 18:19:14 GMT",
      "ContentLength": 77,
      "VersionId": "null",
      "ETag": "\"30a6ec7e1a9ad79c203d05a589c8b400\"",
      "Metadata": {}
  }