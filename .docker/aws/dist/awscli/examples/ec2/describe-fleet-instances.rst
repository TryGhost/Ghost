**To describe the running instances for an EC2 Fleet**

The following ``describe-fleet-instances`` example describes the running instances for the specified EC2 Fleet. ::

    aws ec2 describe-fleet-instances \
        --fleet-id 12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE

Output::

    {
        "ActiveInstances": [
            {
                "InstanceId": "i-090db02406cc3c2d6",
                "InstanceType": "t2.small",
                "SpotInstanceRequestId": "sir-a43gtpfk",
                "InstanceHealth": "healthy"
            },
            {
                "InstanceId": "i-083a1c446e66085d2",
                "InstanceType": "t2.small",
                "SpotInstanceRequestId": "sir-iwcit2nj",
                "InstanceHealth": "healthy"
            }
        ],
        "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
    }

For more information, see `Managing an EC2 Fleet <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-ec2-fleet.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.