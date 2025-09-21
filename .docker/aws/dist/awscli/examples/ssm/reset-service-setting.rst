**To reset the service setting for Parameter Store throughput**

The following ``reset-service-setting`` example resets the service setting for Parameter Store throughput in the specified region to no longer use increased throughput. ::

    aws ssm reset-service-setting \
        --setting-id arn:aws:ssm:us-east-1:123456789012:servicesetting/ssm/parameter-store/high-throughput-enabled

Output::

    {
        "ServiceSetting": {
            "SettingId": "/ssm/parameter-store/high-throughput-enabled",
            "SettingValue": "false",
            "LastModifiedDate": 1555532818.578,
            "LastModifiedUser": "System",
            "ARN": "arn:aws:ssm:us-east-1:123456789012:servicesetting/ssm/parameter-store/high-throughput-enabled",
            "Status": "Default"
        }
    }

For more information, see `Increasing Parameter Store Throughput <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-throughput.html>`_ in the *AWS Systems Manager User Guide*.

