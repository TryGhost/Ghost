**To install an on-premises instance**

The following ``install`` example copies the on-premises configuration file from the specified location on the instance to the location on the instance that the AWS CodeDeploy Agent expects to find it. It also installs the AWS CodeDeploy Agent on the instance. It does not create any IAM user, nor register the on-premises instance with AWS CodeDeploy, nor associate any on-premises instance tags in AWS CodeDeploy for the instance. ::

    aws deploy install \
        --override-config \
        --config-file C:\temp\codedeploy.onpremises.yml \
        --region us-west-2 \
        --agent-installer s3://aws-codedeploy-us-west-2/latest/codedeploy-agent.msi

Output::

    Creating the on-premises instance configuration file... DONE
    Installing the AWS CodeDeploy Agent... DONE
