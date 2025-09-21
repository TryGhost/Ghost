**To delete a launch template version**

This example deletes the specified launch template version.

Command::

  aws ec2 delete-launch-template-versions --launch-template-id lt-0abcd290751193123 --versions 1

Output::

  {
    "UnsuccessfullyDeletedLaunchTemplateVersions": [], 
    "SuccessfullyDeletedLaunchTemplateVersions": [
        {
            "LaunchTemplateName": "TestVersion", 
            "VersionNumber": 1, 
            "LaunchTemplateId": "lt-0abcd290751193123"
        }
    ]
  }