**To register an on-premises instance**

The following ``register`` example registers an on-premises instance with AWS CodeDeploy, associates in AWS CodeDeploy the specified on-premises instance tag with the registered instance, and creates an on-premises configuration file that can be copied to the instance. It does not create the IAM user, nor does it install the AWS CodeDeploy Agent on the instance. ::

    aws deploy register \
        --instance-name AssetTag12010298EX \
        --iam-user-arn arn:aws:iam::80398EXAMPLE:user/CodeDeployUser-OnPrem \
        --tags Key=Name,Value=CodeDeployDemo-OnPrem \
        --region us-west-2

Output::

    Registering the on-premises instance... DONE
    Adding tags to the on-premises instance... DONE
    Copy the on-premises configuration file named codedeploy.onpremises.yml to the on-premises instance, and run the following command on the on-premises instance to install and configure the AWS CodeDeploy Agent:
    aws deploy install --config-file codedeploy.onpremises.yml
