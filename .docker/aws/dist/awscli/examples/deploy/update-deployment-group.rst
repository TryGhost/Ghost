**To change information about a deployment group**

The following ``update-deployment-group`` example changes the settings of a deployment group that is associated with the specified application. ::

    aws deploy update-deployment-group \
        --application-name WordPress_App \
        --auto-scaling-groups My_CodeDeployDemo_ASG \
        --current-deployment-group-name WordPress_DG \
        --deployment-config-name CodeDeployDefault.AllAtOnce \
        --ec2-tag-filters Key=Name,Type=KEY_AND_VALUE,Value=My_CodeDeployDemo \
        --new-deployment-group-name My_WordPress_DepGroup \
        --service-role-arn arn:aws:iam::80398EXAMPLE:role/CodeDeployDemo-2

This command produces no output.
