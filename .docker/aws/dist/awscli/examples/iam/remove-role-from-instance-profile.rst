**To remove a role from an instance profile**

The following ``remove-role-from-instance-profile`` command removes the role named ``Test-Role`` from the instance
profile named ``ExampleInstanceProfile``. ::

    aws iam remove-role-from-instance-profile \
        --instance-profile-name ExampleInstanceProfile \
        --role-name Test-Role

For more information, see `Using instance profiles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html>`__ in the *AWS IAM User Guide*.