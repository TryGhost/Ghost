**To get information about the default custom authorizer**

The following ``describe-default-authorizer`` example displays details for the default custom authorizer. ::

    aws iot describe-default-authorizer

Output::

    {
        "authorizerName": "CustomAuthorizer",
        "authorizerArn": "arn:aws:iot:us-west-2:123456789012:authorizer/CustomAuthorizer"
    }

For more information, see `DescribeDefaultAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_DescribeDefautAuthorizer.html>`__ in the *AWS IoT API Reference*.
