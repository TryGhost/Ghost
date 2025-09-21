**To register an on-premises instance**

The following ``register-on-premises-instance`` example registers an on-premises instance with AWS CodeDeploy. It does not create the specified IAM user, nor does it associate in AWS CodeDeploy any on-premises instances tags with the registered instance. ::

    aws deploy register-on-premises-instance \
        --instance-name AssetTag12010298EX \
        --iam-user-arn arn:aws:iam::80398EXAMPLE:user/CodeDeployDemoUser-OnPrem

This command produces no output.
