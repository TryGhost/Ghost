**To create an OpenID Connect (OIDC) provider**

To create an OpenID Connect (OIDC) provider, we recommend using the ``--cli-input-json`` parameter to pass a JSON file that contains the required parameters. When you create an OIDC provider, you must pass the URL of the provider, and the URL must begin with ``https://``. It can be difficult to pass the URL as a command line parameter, because the colon (:) and forward slash (/) characters have special meaning in some command line environments. Using the ``--cli-input-json`` parameter gets around this limitation.

To use the ``--cli-input-json`` parameter, start by using the ``create-open-id-connect-provider`` command with the ``--generate-cli-skeleton`` parameter, as in the following example. ::

    aws iam create-open-id-connect-provider \
        --generate-cli-skeleton > create-open-id-connect-provider.json

The previous command creates a JSON file called create-open-id-connect-provider.json that you can use to fill in the information for a subsequent ``create-open-id-connect-provider`` command. For example::

    {
        "Url": "https://server.example.com",
        "ClientIDList": [
            "example-application-ID"
        ],
        "ThumbprintList": [
            "c3768084dfb3d2b68b7897bf5f565da8eEXAMPLE"
        ]
    }

Next, to create the OpenID Connect (OIDC) provider, use the ``create-open-id-connect-provider`` command again, this time passing the ``--cli-input-json`` parameter to specify your JSON file. The following ``create-open-id-connect-provider`` command uses the ``--cli-input-json`` parameter with a JSON file called create-open-id-connect-provider.json. ::

    aws iam create-open-id-connect-provider \
        --cli-input-json file://create-open-id-connect-provider.json

Output::

    {
        "OpenIDConnectProviderArn": "arn:aws:iam::123456789012:oidc-provider/server.example.com"
    }

For more information about OIDC providers, see `Creating OpenID Connect (OIDC) identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html>`__ in the *AWS IAM User Guide*. 

For more information about obtaining thumbprints for an OIDC provider, see `Obtaining the thumbprint for an OpenID Connect Identity Provider <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html>`__ in the *AWS IAM User Guide*.