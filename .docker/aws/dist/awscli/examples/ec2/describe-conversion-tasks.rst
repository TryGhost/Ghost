**To view the status of a conversion task**

This example returns the status of a conversion task with the ID import-i-ffvko9js.

Command::

  aws ec2 describe-conversion-tasks --conversion-task-ids import-i-ffvko9js

Output::

  {
      "ConversionTasks": [
          {
              "ConversionTaskId": "import-i-ffvko9js",
              "ImportInstance": {
                  "InstanceId": "i-1234567890abcdef0",
                  "Volumes": [
                      {
                          "Volume": {
                              "Id": "vol-049df61146c4d7901",
                              "Size": 16
                          },
                          "Status": "completed",
                          "Image": {
                              "Size": 1300687360,
                              "ImportManifestUrl": "https://s3.amazonaws.com/myimportbucket/411443cd-d620-4f1c-9d66-13144EXAMPLE/RHEL5.vmdkmanifest.xml?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Expires=140EXAMPLE&Signature=XYNhznHNgCqsjDxL9wRL%2FJvEXAMPLE",
                              "Format": "VMDK"
                          },
                          "BytesConverted": 1300682960,
                          "AvailabilityZone": "us-east-1d"
                      }
                  ]
              },
              "ExpirationTime": "2014-05-14T22:06:23Z",
              "State": "completed"
          }
      ]
  }
