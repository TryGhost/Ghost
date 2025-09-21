**To change the default launch template version**

This example specifies version 2 of the specified launch template as the default version.

Command::

  aws ec2 modify-launch-template --launch-template-id lt-0abcd290751193123 --default-version 2

Output::

  {
    "LaunchTemplate": {
        "LatestVersionNumber": 2, 
        "LaunchTemplateId": "lt-0abcd290751193123", 
        "LaunchTemplateName": "WebServers", 
        "DefaultVersionNumber": 2, 
        "CreatedBy": "arn:aws:iam::123456789012:root", 
        "CreateTime": "2017-12-01T13:35:46.000Z"
    }
  }