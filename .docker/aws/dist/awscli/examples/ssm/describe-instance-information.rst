**Example 1: To describe managed instance information**

The following ``describe-instance-information`` example retrieves details of each of your managed instances. ::

    aws ssm describe-instance-information

**Example 2: To describe information about a specific managed instance**

The following ``describe-instance-information`` example shows details of the managed instance ``i-028ea792daEXAMPLE``. ::

    aws ssm describe-instance-information \
        --filters "Key=InstanceIds,Values=i-028ea792daEXAMPLE"

**Example 3: To describe information about managed instances with a specific tag key**

The following ``describe-instance-information`` example shows details for managed instances that have the tag key ``DEV``. ::

    aws ssm describe-instance-information \
        --filters "Key=tag-key,Values=DEV"

Output::

    {
        "InstanceInformationList": [
            {
                "InstanceId": "i-028ea792daEXAMPLE",
                "PingStatus": "Online",
                "LastPingDateTime": 1582221233.421,
                "AgentVersion": "2.3.842.0",
                "IsLatestVersion": true,
                "PlatformType": "Linux",
                "PlatformName": "SLES",
                "PlatformVersion": "15.1",
                "ResourceType": "EC2Instance",
                "IPAddress": "192.0.2.0",
                "ComputerName": "ip-198.51.100.0.us-east-2.compute.internal",
                "AssociationStatus": "Success",
                "LastAssociationExecutionDate": 1582220806.0,
                "LastSuccessfulAssociationExecutionDate": 1582220806.0,
                "AssociationOverview": {
                    "DetailedStatus": "Success",
                    "InstanceAssociationStatusAggregatedCount": {
                        "Success": 2
                    }
                }
            }
        ]
    }

For more information, see `Managed Instances <https://docs.aws.amazon.com/systems-manager/latest/userguide/managed_instances.html>`__ in the *AWS Systems Manager User Guide*.
