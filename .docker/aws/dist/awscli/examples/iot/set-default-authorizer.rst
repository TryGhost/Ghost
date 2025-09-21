**To set a default authorizer**

The following ``set-default-authorizer`` example sets the custom authorizer named ``CustomAuthorizer`` as the default authorizer. ::

    aws iot set-default-authorizer \
        --authorizer-name CustomAuthorizer

Output::

    {
        "authorizerName": "CustomAuthorizer",
        "authorizerArn": "arn:aws:iot:us-west-2:123456789012:authorizer/CustomAuthorizer"
    }

For more information, see `CreateDefaultAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_CreateDefaultAuthorizer.html>`__ in the *AWS IoT API Reference*.
