**To create an instance profile**

The following ``create-instance-profile`` command creates an instance profile named ``Webserver``. ::

    aws iam create-instance-profile \
        --instance-profile-name Webserver

Output::

    {
        "InstanceProfile": {
            "InstanceProfileId": "AIPAJMBYC7DLSPEXAMPLE",
            "Roles": [],
            "CreateDate": "2015-03-09T20:33:19.626Z",
            "InstanceProfileName": "Webserver",
            "Path": "/",
            "Arn": "arn:aws:iam::123456789012:instance-profile/Webserver"
        }
    }

To add a role to an instance profile, use the ``add-role-to-instance-profile`` command.

For more information, see `Using an IAM role to grant permissions to applications running on Amazon EC2 instances <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html>`__ in the *AWS IAM User Guide*.