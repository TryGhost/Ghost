**To delete an instance profile**

The following ``delete-instance-profile`` command deletes the instance profile named ``ExampleInstanceProfile``. ::

    aws iam delete-instance-profile \
        --instance-profile-name ExampleInstanceProfile

This command produces no output.

For more information, see `Using instance profiles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html>`__ in the *AWS IAM User Guide*.