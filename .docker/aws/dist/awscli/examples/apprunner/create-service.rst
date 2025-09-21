**Example 1: To create a source code repository service**

The following ``create-service`` example creates an App Runner service based on a Python source code repository. ::

    aws apprunner create-service \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceName": "python-app",
        "SourceConfiguration": {
            "AuthenticationConfiguration": {
                "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection/e7656250f67242d7819feade6800f59e"
            },
            "AutoDeploymentsEnabled": true,
            "CodeRepository": {
                "RepositoryUrl": "https://github.com/my-account/python-hello",
                "SourceCodeVersion": {
                    "Type": "BRANCH",
                    "Value": "main"
                },
                "CodeConfiguration": {
                    "ConfigurationSource": "API",
                    "CodeConfigurationValues": {
                        "Runtime": "PYTHON_3",
                        "BuildCommand": "pip install -r requirements.txt",
                        "StartCommand": "python server.py",
                        "Port": "8080",
                        "RuntimeEnvironmentVariables": [
                            {
                                "NAME": "Jane"
                            }
                        ]
                    }
                }
            }
        },
        "InstanceConfiguration": {
            "CPU": "1 vCPU",
            "Memory": "3 GB"
        }
    }

Output::

    {
        "OperationId": "17fe9f55-7e91-4097-b243-fcabbb69a4cf",
        "Service": {
            "CreatedAt": "2020-11-20T19:05:25Z",
            "UpdatedAt": "2020-11-20T19:05:25Z",
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
                "Memory": "3 GB"
            }
        }
    }

**Example 2: To create a source code repository service**

The following ``create-service`` example creates an App Runner service based on a Python source code repository. ::

    aws apprunner create-service \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceName": "python-app",
        "SourceConfiguration": {
            "AuthenticationConfiguration": {
                "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection/e7656250f67242d7819feade6800f59e"
            },
            "AutoDeploymentsEnabled": true,
            "CodeRepository": {
                "RepositoryUrl": "https://github.com/my-account/python-hello",
                "SourceCodeVersion": {
                    "Type": "BRANCH",
                    "Value": "main"
                },
                "CodeConfiguration": {
                    "ConfigurationSource": "API",
                    "CodeConfigurationValues": {
                        "Runtime": "PYTHON_3",
                        "BuildCommand": "pip install -r requirements.txt",
                        "StartCommand": "python server.py",
                        "Port": "8080",
                        "RuntimeEnvironmentVariables": [
                            {
                                "NAME": "Jane"
                            }
                        ]
                    }
                }
            }
        },
        "InstanceConfiguration": {
            "CPU": "1 vCPU",
            "Memory": "3 GB"
        }
    }

Output::

    {
        "OperationId": "17fe9f55-7e91-4097-b243-fcabbb69a4cf",
        "Service": {
            "CreatedAt": "2020-11-20T19:05:25Z",
            "UpdatedAt": "2020-11-20T19:05:25Z",
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
                "Memory": "3 GB"
            }
        }
    }

**Example 3: To create a source image repository service**

The following ``create-service`` example creates an App Runner service based on an image stored in Elastic Container Registry (ECR). ::

    aws apprunner create-service \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceName": "golang-container-app",
        "SourceConfiguration": {
            "AuthenticationConfiguration": {
                "AccessRoleArn": "arn:aws:iam::123456789012:role/my-ecr-role"
            },
            "AutoDeploymentsEnabled": true,
            "ImageRepository": {
                "ImageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/golang-app:latest",
                "ImageConfiguration": {
                    "Port": "8080",
                    "RuntimeEnvironmentVariables": [
                        {
                            "NAME": "Jane"
                        }
                    ]
                },
                "ImageRepositoryType": "ECR"
            }
        },
        "InstanceConfiguration": {
            "CPU": "1 vCPU",
            "Memory": "3 GB"
        }
    }

Output::

    {
        "OperationId": "17fe9f55-7e91-4097-b243-fcabbb69a4cf",
        "Service": {
            "CreatedAt": "2020-11-06T23:15:30Z",
            "UpdatedAt": "2020-11-06T23:15:30Z",
            "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/golang-container-app/51728f8a20ce46d39b25398a6c8e9d1a",
            "ServiceId": "51728f8a20ce46d39b25398a6c8e9d1a",
            "ServiceName": "golang-container-app",
            "ServiceUrl": "psbqam834h.us-east-1.awsapprunner.com",
            "SourceConfiguration": {
                "AuthenticationConfiguration": {
                    "AccessRoleArn": "arn:aws:iam::123456789012:role/my-ecr-role"
                },
                "AutoDeploymentsEnabled": true,
                "ImageRepository": {
                    "ImageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/golang-app:latest",
                    "ImageConfiguration": {
                        "Port": "8080",
                        "RuntimeEnvironmentVariables": [
                            {
                                "NAME": "Jane"
                            }
                        ]
                    },
                    "ImageRepositoryType": "ECR"
                }
            },
            "Status": "OPERATION_IN_PROGRESS",
            "InstanceConfiguration": {
                "CPU": "1 vCPU",
                "Memory": "3 GB"
            }
        }
    }
