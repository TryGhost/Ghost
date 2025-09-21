**To get information about an auth policy**

The following ``get-auth-policy`` example gets information about the auth policy for the specified service. ::

    aws vpc-lattice get-auth-policy \
        --resource-identifier svc-0285b53b2eEXAMPLE

Output::

    {
        "createdAt": "2023-06-07T03:51:20.266Z",
        "lastUpdatedAt": "2023-06-07T04:39:27.082Z",
        "policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::123456789012:role/my-clients\"},\"Action\":\"vpc-lattice-svcs:Invoke\",\"Resource\":\"arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE\"}]}",
        "state": "Active"
    }

For more information, see `Auth policies <https://docs.aws.amazon.com/vpc-lattice/latest/ug/auth-policies.html>`__ in the *Amazon VPC Lattice User Guide*.