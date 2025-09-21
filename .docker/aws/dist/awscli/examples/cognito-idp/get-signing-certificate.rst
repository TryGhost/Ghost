**To display the SAML signing certificate**

The following ``get-signing-certificate`` example displays the SAML 2.0 signing certificate for the request user pool. ::

    aws cognito-idp get-signing-certificate \
        --user-pool-id us-west-2_EXAMPLE

Output::

    {
        "Certificate": "[Certificate content]"
    }

For more information, see `SAML signing and encryption <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-SAML-signing-encryption.html>`__ in the *Amazon Cognito Developer Guide*.
