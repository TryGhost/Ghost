**To describe a WorkSpace**

The following ``describe-workspaces`` example describes the specified WorkSpace. ::

    aws workspaces describe-workspaces \
        --workspace-ids ws-dk1xzr417

Output::

    {
        "Workspaces": [
            {
                "WorkspaceId": "ws-dk1xzr417",
                "DirectoryId": "d-926722edaf",
                "UserName": "Mary",
                "IpAddress": "172.16.0.175",
                "State": "STOPPED",
                "BundleId": "wsb-0zsvgp8fc",
                "SubnetId": "subnet-500d5819",
                "ComputerName": "WSAMZN-RBSLTTD9",
                "WorkspaceProperties": {
                    "RunningMode": "AUTO_STOP",
                    "RunningModeAutoStopTimeoutInMinutes": 60,
                    "RootVolumeSizeGib": 80,
                    "UserVolumeSizeGib": 10,
                    "ComputeTypeName": "VALUE"
                },
                "ModificationStates": []
            }
        ]
    }

For more information, see `Administer your WorkSpaces <https://docs.aws.amazon.com/workspaces/latest/adminguide/administer-workspaces.html>`__ in the *Amazon WorkSpaces Administration Guide*.
