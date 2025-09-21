**To delete a launch template**

This example deletes the specified launch template.

Command::

  aws ec2 delete-launch-template --launch-template-id lt-0abcd290751193123

Output::

  {
    "LaunchTemplate": {
        "LatestVersionNumber": 2, 
        "LaunchTemplateId": "lt-0abcd290751193123", 
        "LaunchTemplateName": "TestTemplate", 
        "DefaultVersionNumber": 2, 
        "CreatedBy": "arn:aws:iam::123456789012:root", 
        "CreateTime": "2017-11-23T16:46:25.000Z"
    }
  }