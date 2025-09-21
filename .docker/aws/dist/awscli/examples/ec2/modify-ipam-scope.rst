**To modify the description of a scope**

In this scenario, you're an IPAM delegated admin who wants to modify the description of an IPAM scope. 

To complete this request, you'll need the scope ID, which you can get with `describe-ipam-scopes <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-ipam-scopes.html>`__.

The following ``modify-ipam-scope`` example updates the description of the scope. ::

    aws ec2 modify-ipam-scope \
        --ipam-scope-id ipam-scope-0d3539a30b57dcdd1 \
        --description example \
        --region us-east-1

Output::

    {
    "IpamScope": {
            "OwnerId": "320805250157",
            "IpamScopeId": "ipam-scope-0d3539a30b57dcdd1",
            "IpamScopeArn": "arn:aws:ec2::320805250157:ipam-scope/ipam-scope-0d3539a30b57dcdd1",
            "IpamArn": "arn:aws:ec2::320805250157:ipam/ipam-005f921c17ebd5107",
            "IpamRegion": "us-east-1",
            "IpamScopeType": "public",
            "IsDefault": true,
            "Description": "example",
            "PoolCount": 1,
            "State": "modify-in-progress"
        }
    }

For more information about scopes, see `How IPAM works <https://docs.aws.amazon.com/vpc/latest/ipam/how-it-works-ipam.html>`__ in the *Amazon VPC IPAM User Guide*.
