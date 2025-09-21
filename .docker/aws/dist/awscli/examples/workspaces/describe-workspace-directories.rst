**To describe a registered directory**

The following ``describe-workspace-directories`` example describes the specified registered directory. ::

    aws workspaces describe-workspace-directories \
        --directory-ids d-926722edaf

Output::

    {
        "Directories": [
            {
                "DirectoryId": "d-926722edaf",
                "Alias": "d-926722edaf",
                "DirectoryName": "example.com",
                "RegistrationCode": "WSpdx+9RJ8JT",
                "SubnetIds": [
                    "subnet-9d19c4c6",
                    "subnet-500d5819"
                ],
                "DnsIpAddresses": [
                    "172.16.1.140",
                    "172.16.0.30"
                ],
                "CustomerUserName": "Administrator",
                "IamRoleId": "arn:aws:iam::123456789012:role/workspaces_DefaultRole",
                "DirectoryType": "SIMPLE_AD",
                "WorkspaceSecurityGroupId": "sg-0d89e927e5645d7c5",
                "State": "REGISTERED",
                "WorkspaceCreationProperties": {
                    "EnableInternetAccess": false,
                    "UserEnabledAsLocalAdministrator": true,
                    "EnableMaintenanceMode": true
                },
                "WorkspaceAccessProperties": {
                    "DeviceTypeWindows": "ALLOW",
                    "DeviceTypeOsx": "ALLOW",
                    "DeviceTypeWeb": "DENY",
                    "DeviceTypeIos": "ALLOW",
                    "DeviceTypeAndroid": "ALLOW",
                    "DeviceTypeChromeOs": "ALLOW",
                    "DeviceTypeZeroClient": "ALLOW",
                    "DeviceTypeLinux": "DENY"
                },
                "Tenancy": "SHARED",
                "SelfservicePermissions": {
                    "RestartWorkspace": "ENABLED",
                    "IncreaseVolumeSize": "DISABLED",
                    "ChangeComputeType": "DISABLED",
                    "SwitchRunningMode": "DISABLED",
                    "RebuildWorkspace": "DISABLED"
                }
            }
        ]
    }

For more information, see `Manage directories for WorkSpaces Personal <https://docs.aws.amazon.com/workspaces/latest/adminguide/manage-workspaces-directory.html>`__ in the *Amazon WorkSpaces Administration Guide*.
