**To add a role to an instance profile**

The following ``add-role-to-instance-profile`` command adds the role named ``S3Access`` to the instance profile named ``Webserver``. ::

    aws iam add-role-to-instance-profile \
        --role-name S3Access \
        --instance-profile-name Webserver

This command produces no output.

To create an instance profile, use the ``create-instance-profile`` command.

For more information, see `Using an IAM role to grant permissions to applications running on Amazon EC2 instances <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html>`__ in the *AWS IAM User Guide*.