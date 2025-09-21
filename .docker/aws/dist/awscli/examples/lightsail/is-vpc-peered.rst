**To identify if your Amazon Lightsail virtual private cloud is peered**

The following ``is-vpc-peered`` example returns the peering status of the Amazon Lightsail virtual private cloud (VPC) for the specified AWS Region. ::

    aws lightsail is-vpc-peered \
        --region us-west-2

Output::

    {
        "isPeered": true
    }
