**To display details about a signing profile**

The following ``get-signing-profile`` example displays details about the specified signing profile. ::

    aws signer get-signing-profile \ 
        --profile-name MyProfile3

Output::

    {
        "platformId": "AmazonFreeRTOS-TI-CC3220SF",
        "profileName": "MyProfile3",
        "status": "Active",
        "signingMaterial": {
            "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc"
        }
    }
