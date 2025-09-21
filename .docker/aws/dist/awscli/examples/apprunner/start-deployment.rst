**To initiate a manual deployment**

The following ``start-deployment`` example performs a manual deployment to an App Runner service. ::

    aws apprunner start-deployment \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa"
    }

Output::

    {
        "OperationId": "853a7d5b-fc9f-4730-831b-fd8037ab832a"
    }