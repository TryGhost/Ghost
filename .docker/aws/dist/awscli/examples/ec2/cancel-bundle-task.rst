**To cancel a bundle task**

This example cancels bundle task ``bun-2a4e041c``.

Command::

  aws ec2 cancel-bundle-task --bundle-id bun-2a4e041c

Output::

  {
    "BundleTask": {
      "UpdateTime": "2015-09-15T13:27:40.000Z", 
      "InstanceId": "i-1234567890abcdef0", 
      "Storage": {
        "S3": {
          "Prefix": "winami", 
          "Bucket": "bundletasks"
        }
      }, 
      "State": "cancelling", 
      "StartTime": "2015-09-15T13:24:35.000Z", 
      "BundleId": "bun-2a4e041c"
    }
  }