The following command copies an object from ``bucket-1`` to ``bucket-2``::

  aws s3api copy-object --copy-source bucket-1/test.txt --key test.txt --bucket bucket-2

Output::

  {
      "CopyObjectResult": {
          "LastModified": "2015-11-10T01:07:25.000Z",
          "ETag": "\"589c8b79c230a6ecd5a7e1d040a9a030\""
      },
      "VersionId": "YdnYvTCVDqRRFA.NFJjy36p0hxifMlkA"
  }
