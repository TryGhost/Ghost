**To register a resource type**

The following ``register-type`` example registers the specified resource type as a private resource type in the user's account. ::

    aws cloudformation register-type \
        --type-name My::Organization::ResourceName \
        --schema-handler-package s3://bucket_name/my-organization-resource_name.zip \
        --type RESOURCE

Output::

    {
        "RegistrationToken": "f5525280-104e-4d35-bef5-8f1f1example"
    }

For more information, see `Registering Resource Providers <https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-register.html>`__ in the *CloudFormation Command Line Interface User Guide for Type Development*.
