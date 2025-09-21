**To create an auth policy for a service**

The following ``put-auth-policy`` example grants access to requests from any authenticated principal that uses the specified IAM role. The resource is the ARN of the service to which the policy is attached. ::

    aws vpc-lattice put-auth-policy \
        --resource-identifier svc-0285b53b2eEXAMPLE \
        --policy file://auth-policy.json

Contents of ``auth-policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::123456789012:role/my-clients"
                },
                "Action": "vpc-lattice-svcs:Invoke",
                "Resource": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE"
            }
        ]
    }

Output::

    {
        "policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::123456789012:role/my-clients\"},\"Action\":\"vpc-lattice-svcs:Invoke\",\"Resource\":\"arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE\"}]}",
        "state": "Active"
    }

For more information, see `Auth policies <https://docs.aws.amazon.com/vpc-lattice/latest/ug/auth-policies.html>`__ in the *Amazon VPC Lattice User Guide*.