**To create a deployment group**

The following ``create-deployment-group`` example creates a deployment group and associates it with the specified application and the user's AWS account. ::

    aws deploy create-deployment-group \
        --application-name WordPress_App \
        --auto-scaling-groups CodeDeployDemo-ASG \
        --deployment-config-name CodeDeployDefault.OneAtATime \
        --deployment-group-name WordPress_DG \
        --ec2-tag-filters Key=Name,Value=CodeDeployDemo,Type=KEY_AND_VALUE \
        --service-role-arn arn:aws:iam::123456789012:role/CodeDeployDemoRole

Output::

    {
        "deploymentGroupId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
    }
