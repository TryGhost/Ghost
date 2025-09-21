**To add tags to an App Runner service**

The following ``tag-resource`` example adds two tags to an App Runner service. ::

    aws apprunner tag-resource \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ResourceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa",
        "Tags": [
            {
                "Key": "Department", 
                "Value": "Retail"
            },
            {
                "Key": "CustomerId", 
                "Value": "56439872357912"
            }
        ]
    }

This command produces no output.