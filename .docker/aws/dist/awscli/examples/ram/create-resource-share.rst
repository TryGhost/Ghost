**Example 1: To create a resource share**

The following ``create-resource-share`` example creates an empty resource share with the specified name. You must separately add resources, principals, and permissions to the share. ::

    aws ram create-resource-share \
        --name MyNewResourceShare

Output::

    {
        "resourceShare": {
            "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/4476c27d-8feb-4b21-afe9-7de23EXAMPLE",
            "name": "MyNewResourceShare",
            "owningAccountId": "123456789012",
            "allowExternalPrincipals": true,
            "status": "ACTIVE",
            "creationTime": 1634586271.302,
            "lastUpdatedTime": 1634586271.302
        }
    }

**Example 2: To create a resource share with AWS accounts as principals**

The following ``create-resource-share`` example creates a resource share and grants access to the specified AWS account (222222222222). If the specified principals are not part of the same AWS Organization, then invitations are sent and must be accepted before access is granted. ::

    aws ram create-resource-share \
        --name MyNewResourceShare \
        --principals 222222222222

**Example 3: To create a resource share restricted to your AWS Organization**

The following ``create-resource-share`` example creates a resource share that is restricted to accounts in the AWS Organization that your account is a member of, and adds the specified OU as a principal. All accounts in that OU can use the resources in the resource share. ::

     aws ram create-resource-share \
         --name MyNewResourceShare \
         --no-allow-external-principals \
         --principals arn:aws:organizations::123456789012:ou/o-63bEXAMPLE/ou-46xi-rEXAMPLE 

Output::

    {
        "resourceShare": {
            "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7be8694e-095c-41ca-9ce8-7be4aEXAMPLE",
            "name": "MyNewResourceShare",
            "owningAccountId": "123456789012",
            "allowExternalPrincipals": false,
            "status": "ACTIVE",
            "creationTime": 1634587042.49,
            "lastUpdatedTime": 1634587042.49
        }
    }