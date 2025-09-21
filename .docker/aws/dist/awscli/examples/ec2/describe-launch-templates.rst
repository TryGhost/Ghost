**To describe launch templates**

This example describes your launch templates.

Command::

  aws ec2 describe-launch-templates

Output::

  {
    "LaunchTemplates": [
        {
            "LatestVersionNumber": 2, 
            "LaunchTemplateId": "lt-0e06d290751193123", 
            "LaunchTemplateName": "TemplateForWebServer", 
            "DefaultVersionNumber": 2, 
            "CreatedBy": "arn:aws:iam::123456789012:root", 
            "CreateTime": "2017-11-27T09:30:23.000Z"
        }, 
        {
            "LatestVersionNumber": 6, 
            "LaunchTemplateId": "lt-0c45b5e061ec98456", 
            "LaunchTemplateName": "DBServersTemplate", 
            "DefaultVersionNumber": 1, 
            "CreatedBy": "arn:aws:iam::123456789012:root", 
            "CreateTime": "2017-11-20T09:25:22.000Z"
        }, 
        {
            "LatestVersionNumber": 1, 
            "LaunchTemplateId": "lt-0d47d774e8e52dabc", 
            "LaunchTemplateName": "MyLaunchTemplate2", 
            "DefaultVersionNumber": 1, 
            "CreatedBy": "arn:aws:iam::123456789012:root", 
            "CreateTime": "2017-11-02T12:06:21.000Z"
        },
        {
            "LatestVersionNumber": 3, 
            "LaunchTemplateId": "lt-01e5f948eb4f589d6", 
            "LaunchTemplateName": "testingtemplate2", 
            "DefaultVersionNumber": 1, 
            "CreatedBy": "arn:aws:sts::123456789012:assumed-role/AdminRole/i-03ee35176e2e5aabc", 
            "CreateTime": "2017-12-01T08:19:48.000Z"
        }, 
    ]
  }