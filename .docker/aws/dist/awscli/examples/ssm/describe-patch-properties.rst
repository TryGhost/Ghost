**To list the Amazon Linux patch availability**

The following ``describe-patch-properties`` example displays a list of the Amazon Linux products for which patches are available in your AWS account. ::

    aws ssm describe-patch-properties \
        --operating-system AMAZON_LINUX \
        --property PRODUCT

Output::

    {
        "Properties": [
            {
                "Name": "AmazonLinux2012.03"
            },
            {
                "Name": "AmazonLinux2012.09"
            },
            {
                "Name": "AmazonLinux2013.03"
            },
            {
                "Name": "AmazonLinux2013.09"
            },
            {
                "Name": "AmazonLinux2014.03"
            },
            {
                "Name": "AmazonLinux2014.09"
            },
            {
                "Name": "AmazonLinux2015.03"
            },
            {
                "Name": "AmazonLinux2015.09"
            },
            {
                "Name": "AmazonLinux2016.03"
            },
            {
                "Name": "AmazonLinux2016.09"
            },
            {
                "Name": "AmazonLinux2017.03"
            },
            {
                "Name": "AmazonLinux2017.09"
            },
            {
                "Name": "AmazonLinux2018.03"
            }
        ]
    }

For more information, see `About Patch Baselines <https://docs.aws.amazon.com/systems-manager/latest/userguide/about-patch-baselines.html>`__ in the *AWS Systems Manager User Guide*.
