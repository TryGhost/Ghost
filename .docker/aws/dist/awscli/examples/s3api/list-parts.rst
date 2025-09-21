The following command lists all of the parts that have been uploaded for a multipart upload with key ``multipart/01`` in the bucket ``amzn-s3-demo-bucket``::

  aws s3api list-parts --bucket amzn-s3-demo-bucket --key 'multipart/01' --upload-id dfRtDYU0WWCCcH43C3WFbkRONycyCpTJJvxu2i5GYkZljF.Yxwh6XG7WfS2vC4to6HiV6Yjlx.cph0gtNBtJ8P3URCSbB7rjxI5iEwVDmgaXZOGgkk5nVTW16HOQ5l0R

Output::

  {
      "Owner": {
          "DisplayName": "aws-account-name",
          "ID": "100719349fc3b6dcd7c820a124bf7aecd408092c3d7b51b38494939801fc248b"
      },
      "Initiator": {
          "DisplayName": "username",
          "ID": "arn:aws:iam::0123456789012:user/username"
      },
      "Parts": [
          {
              "LastModified": "2015-06-02T18:07:35.000Z",
              "PartNumber": 1,
              "ETag": "\"e868e0f4719e394144ef36531ee6824c\"",
              "Size": 5242880
          },
          {
              "LastModified": "2015-06-02T18:07:42.000Z",
              "PartNumber": 2,
              "ETag": "\"6bb2b12753d66fe86da4998aa33fffb0\"",
              "Size": 5242880
          },
          {
              "LastModified": "2015-06-02T18:07:47.000Z",
              "PartNumber": 3,
              "ETag": "\"d0a0112e841abec9c9ec83406f0159c8\"",
              "Size": 5242880
          }
      ],
      "StorageClass": "STANDARD"
  }