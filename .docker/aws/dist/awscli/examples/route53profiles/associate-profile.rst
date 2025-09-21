**To associate a Profile**

The following ``associate-profile`` example associates a Profile to a VPC. ::

    aws route53profiles associate-profile \
        --name test-association \
        --profile-id rp-4987774726example \
        --resource-id vpc-0af3b96b3example

Output::

    {
        "ProfileAssociation": {
            "CreationTime": 1710851336.527,
            "Id": "rpassoc-489ce212fexample",
            "ModificationTime": 1710851336.527,
            "Name": "test-association",
            "OwnerId": "123456789012",
            "ProfileId": "rp-4987774726example",
            "ResourceId": "vpc-0af3b96b3example",
            "Status": "CREATING",
            "StatusMessage": "Creating Profile Association"
        }
    }

For more information, see `Using Profiles <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-high-level-steps.html>`__ in the *Amazon Route 53 Developer Guide*.