**To create a connection**

The following ``create-connection`` example shows how to create a connection to a third-party repository. This example creates a connection where the third-party provider is Bitbucket. 

A connection created through the AWS CLI or AWS CloudFormation is in Pending status by default. After you create a connection with the CLI or AWS CloudFormation, use the console to edit the connection to make its status Available. ::

    aws codestar-connections create-connection \ 
        --provider-type Bitbucket \
        --connection-name MyConnection

Output::

    {
        "ConnectionArn": "arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f"
    }

For more information, see `Create a connection <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create.html>`__ in the *Developer Tools console User Guide*.