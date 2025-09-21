**Example 1: To describe all of your enabled Regions**

The following ``describe-regions`` example describes all of the Regions that are enabled for your account. ::

    aws ec2 describe-regions

Output::

    {
        "Regions": [
            {
                "Endpoint": "ec2.eu-north-1.amazonaws.com",
                "RegionName": "eu-north-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-south-1.amazonaws.com",
                "RegionName": "ap-south-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-west-3.amazonaws.com",
                "RegionName": "eu-west-3",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-west-2.amazonaws.com",
                "RegionName": "eu-west-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-west-1.amazonaws.com",
                "RegionName": "eu-west-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-northeast-3.amazonaws.com",
                "RegionName": "ap-northeast-3",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-northeast-2.amazonaws.com",
                "RegionName": "ap-northeast-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-northeast-1.amazonaws.com",
                "RegionName": "ap-northeast-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.sa-east-1.amazonaws.com",
                "RegionName": "sa-east-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ca-central-1.amazonaws.com",
                "RegionName": "ca-central-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-southeast-1.amazonaws.com",
                "RegionName": "ap-southeast-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-southeast-2.amazonaws.com",
                "RegionName": "ap-southeast-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-central-1.amazonaws.com",
                "RegionName": "eu-central-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-east-1.amazonaws.com",
                "RegionName": "us-east-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-east-2.amazonaws.com",
                "RegionName": "us-east-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-west-1.amazonaws.com",
                "RegionName": "us-west-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-west-2.amazonaws.com",
                "RegionName": "us-west-2",
                "OptInStatus": "opt-in-not-required"
            }
        ]
    }

For more information, see `Regions and Zones <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To describe enabled Regions with an endpoint whose name contains a specific string**

The following ``describe-regions`` example describes all Regions that you have enabled that have the string "us" in the endpoint. ::

    aws ec2 describe-regions \
        --filters "Name=endpoint,Values=*us*"

Output::

    {
        "Regions": [
            {
                "Endpoint": "ec2.us-east-1.amazonaws.com",
                "RegionName": "us-east-1"
            },
            {
                "Endpoint": "ec2.us-east-2.amazonaws.com",
                "RegionName": "us-east-2"
            },
            {
                "Endpoint": "ec2.us-west-1.amazonaws.com",
                "RegionName": "us-west-1"
            },
            {
                "Endpoint": "ec2.us-west-2.amazonaws.com",
                "RegionName": "us-west-2"
            }
        ]
    }

For more information, see `Regions and Zones <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html>`__ in the *Amazon EC2 User Guide*.

**Example 3: To describe all Regions**

The following ``describe-regions`` example describes all available Regions, including Regions that are disabled. ::

    aws ec2 describe-regions \
        --all-regions

Output::

    {
        "Regions": [
            {
                "Endpoint": "ec2.eu-north-1.amazonaws.com",
                "RegionName": "eu-north-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-south-1.amazonaws.com",
                "RegionName": "ap-south-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-west-3.amazonaws.com",
                "RegionName": "eu-west-3",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-west-2.amazonaws.com",
                "RegionName": "eu-west-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-west-1.amazonaws.com",
                "RegionName": "eu-west-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-northeast-3.amazonaws.com",
                "RegionName": "ap-northeast-3",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.me-south-1.amazonaws.com",
                "RegionName": "me-south-1",
                "OptInStatus": "not-opted-in"
            },
            {
                "Endpoint": "ec2.ap-northeast-2.amazonaws.com",
                "RegionName": "ap-northeast-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-northeast-1.amazonaws.com",
                "RegionName": "ap-northeast-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.sa-east-1.amazonaws.com",
                "RegionName": "sa-east-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ca-central-1.amazonaws.com",
                "RegionName": "ca-central-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-east-1.amazonaws.com",
                "RegionName": "ap-east-1",
                "OptInStatus": "not-opted-in"
            },
            {
                "Endpoint": "ec2.ap-southeast-1.amazonaws.com",
                "RegionName": "ap-southeast-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.ap-southeast-2.amazonaws.com",
                "RegionName": "ap-southeast-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.eu-central-1.amazonaws.com",
                "RegionName": "eu-central-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-east-1.amazonaws.com",
                "RegionName": "us-east-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-east-2.amazonaws.com",
                "RegionName": "us-east-2",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-west-1.amazonaws.com",
                "RegionName": "us-west-1",
                "OptInStatus": "opt-in-not-required"
            },
            {
                "Endpoint": "ec2.us-west-2.amazonaws.com",
                "RegionName": "us-west-2",
                "OptInStatus": "opt-in-not-required"
            }
        ]
    }

For more information, see `Regions and Zones <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html>`__ in the *Amazon EC2 User Guide*.

**Example 4: To list the Region names only**

The following ``describe-regions`` example uses the ``--query`` parameter to filter the output and return only the names of the Regions as text. ::

    aws ec2 describe-regions \
        --all-regions \
        --query "Regions[].{Name:RegionName}" \
        --output text

Output::

    eu-north-1
    ap-south-1
    eu-west-3
    eu-west-2
    eu-west-1
    ap-northeast-3
    ap-northeast-2
    me-south-1
    ap-northeast-1
    sa-east-1
    ca-central-1
    ap-east-1
    ap-southeast-1
    ap-southeast-2
    eu-central-1
    us-east-1
    us-east-2
    us-west-1
    us-west-2

For more information, see `Regions and Zones <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html>`__ in the *Amazon EC2 User Guide*.
