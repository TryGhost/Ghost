**To list all signing profiles**

The following ``list-signing-profiles`` example displays details about all signing profiles for the account. ::

    aws signer list-signing-profiles

Output::

    {
        "profiles": [
            {
                "platformId": "AmazonFreeRTOS-TI-CC3220SF",
                "profileName": "MyProfile4",
                "status": "Active",
                "signingMaterial": {
                    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc"
                }
            },
            {
                "platformId": "AWSIoTDeviceManagement-SHA256-ECDSA",
                "profileName": "MyProfile5",
                "status": "Active",
                "signingMaterial": {
                    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc"
                }
            }
        ]
    } 
