**To clear the default authorizer**

The following ``clear-default-authorizer`` example clears the currently configured default custom authorizer. After you run this command, there is no default authorizer. When you use a custom authorizer, you must specify it by name in the HTTP request headers. ::

    aws iot clear-default-authorizer

This command produces no output.

For more information, see `ClearDefaultAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_ClearDefaultAuthorizer.html>`__ in the *AWS IoT API Reference*.
