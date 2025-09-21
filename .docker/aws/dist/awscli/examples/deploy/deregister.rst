**To deregister an on-premises instance**

The following ``deregister`` example deregisters an on-premises instance with AWS CodeDeploy. It does not delete the IAM user that is associated with the instance. It disassociates in AWS CodeDeploy the on-premises tags from the instance. It does not uninstall the AWS CodeDeploy Agent from the instance nor remove the on-premises configuration file from the instance. ::

    aws deploy deregister \
        --instance-name AssetTag12010298EX \
        --no-delete-iam-user \
        --region us-west-2

Output::

    Retrieving on-premises instance information... DONE
    IamUserArn: arn:aws:iam::80398EXAMPLE:user/AWS/CodeDeploy/AssetTag12010298EX
    Tags: Key=Name,Value=CodeDeployDemo-OnPrem
    Removing tags from the on-premises instance... DONE
    Deregistering the on-premises instance... DONE
    Run the following command on the on-premises instance to uninstall the codedeploy-agent:
    aws deploy uninstall
