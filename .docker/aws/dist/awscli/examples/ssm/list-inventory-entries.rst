**Example 1: To view specific inventory type entries for an instance**

This following ``list-inventory-entries`` example lists the inventory entries for the AWS:Application inventory type on a specific instance. ::

    aws ssm list-inventory-entries \
        --instance-id "i-1234567890abcdef0" \
        --type-name "AWS:Application"

Output::

    {
      "TypeName": "AWS:Application",
      "InstanceId": "i-1234567890abcdef0",
      "SchemaVersion": "1.1",
      "CaptureTime": "2019-02-15T12:17:55Z",
      "Entries": [
        {
          "Architecture": "i386",
          "Name": "Amazon SSM Agent",
          "PackageId": "{88a60be2-89a1-4df8-812a-80863c2a2b68}",
          "Publisher": "Amazon Web Services",
          "Version": "2.3.274.0"
        },
        {
          "Architecture": "x86_64",
          "InstalledTime": "2018-05-03T13:42:34Z",
          "Name": "AmazonCloudWatchAgent",
          "Publisher": "",
          "Version": "1.200442.0"
        }
      ]
    }

**Example 2: To view custom inventory entries assigned to an instance**

The following ``list-inventory-entries`` example lists a custom inventory entry assigned to an instance. ::

    aws ssm list-inventory-entries \
        --instance-id "i-1234567890abcdef0" \
        --type-name "Custom:RackInfo"

Output::

    {
      "TypeName": "Custom:RackInfo",
      "InstanceId": "i-1234567890abcdef0",
      "SchemaVersion": "1.0",
      "CaptureTime": "2021-05-22T10:01:01Z",
      "Entries": [
        {
          "RackLocation": "Bay B/Row C/Rack D/Shelf E"
        }
      ]
    }