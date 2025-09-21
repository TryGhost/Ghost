**To remove tags from an App Runner service**

The following ``untag-resource`` example removes two tags from an App Runner service. ::

    aws apprunner untag-resource \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ResourceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa",
        "TagKeys": [
            "Department", 
            "CustomerId"
        ]
    }

This command produces no output.