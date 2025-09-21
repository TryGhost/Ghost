**Example 1: To enable IMDSv2**

The following ``modify-instance-metadata-options`` example configures the use of IMDSv2 on the specified instance. ::

    aws ec2 modify-instance-metadata-options \
        --instance-id i-1234567898abcdef0 \
        --http-tokens required \
        --http-endpoint enabled

Output::

    {
        "InstanceId": "i-1234567898abcdef0",
        "InstanceMetadataOptions": {
            "State": "pending",
            "HttpTokens": "required",
            "HttpPutResponseHopLimit": 1,
            "HttpEndpoint": "enabled"
        }
    }

For more information, see `Instance metadata <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To disable instance metadata**

The following ``modify-instance-metadata-options`` example disables the use of all versions of instance metadata on the specified instance. ::

    aws ec2 modify-instance-metadata-options \
        --instance-id i-1234567898abcdef0 \
        --http-endpoint disabled

Output::

    {
        "InstanceId": "i-1234567898abcdef0",
        "InstanceMetadataOptions": {
            "State": "pending",
            "HttpTokens": "required",
            "HttpPutResponseHopLimit": 1,
            "HttpEndpoint": "disabled"
        }
    }

For more information, see `Instance metadata <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html>`__ in the *Amazon EC2 User Guide*.

**Example 3: To enable instance metadata IPv6 endpoint for your instance**

The following ``modify-instance-metadata-options`` example shows you how to turn on the IPv6 endpoint for the instance metadata service. By default, the IPv6 endpoint is disabled. This is true even if you have launched an instance into an IPv6-only subnet. The IPv6 endpoint for IMDS is only accessible on instances built on the Nitro System.  ::

    aws ec2 modify-instance-metadata-options \
        --instance-id i-1234567898abcdef0 \
        --http-protocol-ipv6 enabled \
        --http-endpoint enabled

Output::

    {
        "InstanceId": "i-1234567898abcdef0",
        "InstanceMetadataOptions": {
            "State": "pending",
            "HttpTokens": "required",
            "HttpPutResponseHopLimit": 1,
            "HttpEndpoint": "enabled",
            HttpProtocolIpv6": "enabled"
        }
    }

For more information, see `Instance metadata <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html>`__ in the *Amazon EC2 User Guide*.
