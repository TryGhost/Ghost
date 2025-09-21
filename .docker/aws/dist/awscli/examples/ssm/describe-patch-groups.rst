**To display patch group registrations**

The following ``describe-patch-groups`` example lists the patch group registrations. ::

  aws ssm describe-patch-groups

Output::

    {
        "Mappings": [
            {
                "PatchGroup": "Production",
                "BaselineIdentity": {
                    "BaselineId": "pb-0123456789abcdef0",
                    "BaselineName": "ProdPatching",
                    "OperatingSystem": "WINDOWS",
                    "BaselineDescription": "Patches for Production",
                    "DefaultBaseline": false
                }
            },
            {
                "PatchGroup": "Development",
                "BaselineIdentity": {
                    "BaselineId": "pb-0713accee01234567",
                    "BaselineName": "DevPatching",
                    "OperatingSystem": "WINDOWS",
                    "BaselineDescription": "Patches for Development",
                    "DefaultBaseline": true
                }
            },
            ...
        ]
    }

For more information, see `Create a Patch Group` <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-tagging.html>__ and `Add a Patch Group to a Patch Baseline <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-patchbaseline.html>`__ in the *AWS Systems Manager User Guide*.
