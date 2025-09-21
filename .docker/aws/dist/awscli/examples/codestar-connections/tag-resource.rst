**To tag a resource**

The following ``tag-resource`` example associates a set of provided tags with a connection. Use this command to add or edit tags. ::

    aws codestar-connections tag-resource \
        --resource-arn arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f \
        --tags Key=Project,Value=ProjectA Key=IscontainerBased,Value=true

This command produces no output.

For more information, see `Add tags to a connections resource <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-tag.html#connections-tag-add>`__ in the *Developer Tools console User Guide*.