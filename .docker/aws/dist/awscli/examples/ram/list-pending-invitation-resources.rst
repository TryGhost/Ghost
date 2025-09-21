**To list the resources that are available in a pending resource share**

The following ``list-pending-invitation-resources`` example lists all of the resources that are in the resource share associated with the specified invitation. ::

    aws ram list-pending-invitation-resources \
        --resource-share-invitation-arn arn:aws:ram:us-west-2:123456789012:resource-share-invitation/1e3477be-4a95-46b4-bbe0-c4001EXAMPLE

Output::

    {
       "resources": [ 
            {
                "arn": "arn:aws:ec2:us-west-2:123456789012:subnet/subnet-04a555b0e6EXAMPLE",
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7be8694e-095c-41ca-9ce8-7be4aEXAMPLE",
                "creationTime": 1634676051.269,
                "lastUpdatedTime": 1634676052.07,
                "status": "AVAILABLE",
                "type": "ec2:Subnet"
            },
            { 
                "arn": "arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-36be0485f5ae379cc74cf8e92EXAMPLE",
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE",
                "creationTime": 1624912434.431,
                "lastUpdatedTime": 1624912434.431,
                "status": "AVAILABLE",
                "type": "license-manager:LicenseConfiguration"
          }
       ]
    }
