**To update memory size**

The following ``update-service`` example updates the memory size of instances (scaling units) of an App Runner service to 2048 MiB.

When the call succeeds, App Runner starts an asynchronous update process.
The ``Service`` structure that's returned by the call reflects the new memory value that's being applied by this call.  ::

    aws apprunner update-service \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa",
        "InstanceConfiguration": {
            "Memory": "4 GB"
        }
    }

Output::

    {
        "OperationId": "17fe9f55-7e91-4097-b243-fcabbb69a4cf",
        "Service": {
            "CreatedAt": "2020-11-20T19:05:25Z",
            "UpdatedAt": "2020-11-23T12:41:37Z",
            "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa",
            "ServiceId": "8fe1e10304f84fd2b0df550fe98a71fa",
            "ServiceName": "python-app",
            "ServiceUrl": "psbqam834h.us-east-1.awsapprunner.com",
            "SourceConfiguration": {
                "AuthenticationConfiguration": {
                    "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection/e7656250f67242d7819feade6800f59e"
                },
                "AutoDeploymentsEnabled": true,
                "CodeRepository": {
                    "CodeConfiguration": {
                        "CodeConfigurationValues": {
                            "BuildCommand": "pip install -r requirements.txt",
                            "Port": "8080",
                            "Runtime": "PYTHON_3",
                            "RuntimeEnvironmentVariables": [
                                {
                                    "NAME": "Jane"
                                }
                            ],
                            "StartCommand": "python server.py"
                        },
                        "ConfigurationSource": "Api"
                    },
                    "RepositoryUrl": "https://github.com/my-account/python-hello",
                    "SourceCodeVersion": {
                        "Type": "BRANCH",
                        "Value": "main"
                    }
                }
            },
            "Status": "OPERATION_IN_PROGRESS",
            "InstanceConfiguration": {
                "CPU": "1 vCPU",
                "Memory": "4 GB"
            }
        }
    }
