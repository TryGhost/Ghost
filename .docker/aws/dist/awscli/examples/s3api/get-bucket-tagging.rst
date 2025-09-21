The following command retrieves the tagging configuration for a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-bucket-tagging --bucket amzn-s3-demo-bucket

Output::

  {
      "TagSet": [
          {
              "Value": "marketing",
              "Key": "organization"
          }
      ]
  }
