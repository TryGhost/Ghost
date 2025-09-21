**To retrieve information about one or more deployment groups**

The following ``batch-get-deployment-groups`` example retrieves information about two of the deployment groups that are associated with the specified CodeDeploy application. ::

    aws deploy batch-get-deployment-groups \
        --application-name my-codedeploy-application \
        --deployment-group-names "[\"my-deployment-group-1\",\"my-deployment-group-2\"]"

Output::

    {
        "deploymentGroupsInfo": [
            {
                "deploymentStyle": {
                    "deploymentOption": "WITHOUT_TRAFFIC_CONTROL",
                    "deploymentType": "IN_PLACE"
                },
                "autoRollbackConfiguration": {
                    "enabled": false
                },
                "onPremisesTagSet": {
                    "onPremisesTagSetList": []
                },
                "serviceRoleArn": "arn:aws:iam::123456789012:role/CodeDeployServiceRole",
                "lastAttemptedDeployment": {
                    "endTime": 1556912366.415,
                    "status": "Failed",
                    "createTime": 1556912355.884,
                    "deploymentId": "d-A1B2C3111"
                },
                "autoScalingGroups": [],
                "deploymentGroupName": "my-deployment-group-1",
                "ec2TagSet": {
                    "ec2TagSetList": [
                        [
                            {
                                "Type": "KEY_AND_VALUE",
                                "Value": "my-EC2-instance",
                                "Key": "Name"
                            }
                        ]
                    ]
                },
                "deploymentGroupId": "a1b2c3d4-5678-90ab-cdef-11111example",
                "triggerConfigurations": [],
                "applicationName": "my-codedeploy-application",
                "computePlatform": "Server",
                "deploymentConfigName": "CodeDeployDefault.AllAtOnce"
            },
            {
                "deploymentStyle": {
                    "deploymentOption": "WITHOUT_TRAFFIC_CONTROL",
                    "deploymentType": "IN_PLACE"
                },
                "autoRollbackConfiguration": {
                    "enabled": false
                },
                "onPremisesTagSet": {
                    "onPremisesTagSetList": []
                },
                "serviceRoleArn": "arn:aws:iam::123456789012:role/CodeDeployServiceRole",
                "autoScalingGroups": [],
                "deploymentGroupName": "my-deployment-group-2",
                "ec2TagSet": {
                    "ec2TagSetList": [
                        [
                            {
                                "Type": "KEY_AND_VALUE",
                                "Value": "my-EC2-instance",
                                "Key": "Name"
                                }
                        ]
                    ]
                },
                "deploymentGroupId": "a1b2c3d4-5678-90ab-cdef-22222example",
                "triggerConfigurations": [],
                "applicationName": "my-codedeploy-application",
                "computePlatform": "Server",
                "deploymentConfigName": "CodeDeployDefault.AllAtOnce"
            }
        ],
        "errorMessage": ""
    }

For more information, see `BatchGetDeploymentGroups <https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_BatchGetDeploymentGroups.html>`_ in the *AWS CodeDeploy API Reference*.
    