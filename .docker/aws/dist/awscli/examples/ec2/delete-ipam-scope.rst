**To delete an IPAM scope**

The following ``delete-ipam-scope`` example deletes an IPAM. ::

    aws ec2 delete-ipam-scope \
        --ipam-scope-id ipam-scope-01c1ebab2b63bd7e4

Output::

    {
        "IpamScope": {
            "OwnerId": "123456789012",
            "IpamScopeId": "ipam-scope-01c1ebab2b63bd7e4",
            "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-01c1ebab2b63bd7e4",
            "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
            "IpamRegion": "us-east-1",
            "IpamScopeType": "private",
            "IsDefault": false,
            "Description": "Example description",
            "PoolCount": 0,
            "State": "delete-in-progress"
        }
    }

For more information, see `Delete a scope <https://docs.aws.amazon.com/vpc/latest/ipam/delete-scope-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 