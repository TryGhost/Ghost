**To update a custom authorizer**

The following ``update-authorizer`` example he state of ``CustomAuthorizer2`` to ``INACTIVE``. ::

    aws iot update-authorizer \
        --authorizer-name CustomAuthorizer2 \
        --status INACTIVE

Output::

    {
        "authorizerName": "CustomAuthorizer2",
        "authorizerArn": "arn:aws:iot:us-west-2:123456789012:authorizer/CustomAuthorizer2"
    }

For more information, see `UpdateAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_UpdateAuthorizer.html>`__ in the *AWS IoT API Reference*.
