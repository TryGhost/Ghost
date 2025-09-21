The following command lists all of the active multipart uploads for a bucket named ``amzn-s3-demo-bucket``::

  aws s3api list-multipart-uploads --bucket amzn-s3-demo-bucket

Output::

  {
      "Uploads": [
          {
              "Initiator": {
                  "DisplayName": "username",
                  "ID": "arn:aws:iam::0123456789012:user/username"
              },
              "Initiated": "2015-06-02T18:01:30.000Z",
              "UploadId": "dfRtDYU0WWCCcH43C3WFbkRONycyCpTJJvxu2i5GYkZljF.Yxwh6XG7WfS2vC4to6HiV6Yjlx.cph0gtNBtJ8P3URCSbB7rjxI5iEwVDmgaXZOGgkk5nVTW16HOQ5l0R",
              "StorageClass": "STANDARD",
              "Key": "multipart/01",
              "Owner": {
                  "DisplayName": "aws-account-name",
                  "ID": "100719349fc3b6dcd7c820a124bf7aecd408092c3d7b51b38494939801fc248b"
              }
          }
      ],
      "CommonPrefixes": []
  }

In progress multipart uploads incur storage costs in Amazon S3. Complete or abort an active multipart upload to remove its parts from your account.