**To create an OpsItems**

The following ``create-ops-item`` example uses the /aws/resources key in OperationalData to create an OpsItem with an Amazon DynamoDB related resource. ::

    aws ssm create-ops-item \
        --title "EC2 instance disk full" \
        --description "Log clean up may have failed which caused the disk to be full" \
        --priority 2 \
        --source ec2 \
        --operational-data '{"/aws/resources":{"Value":"[{\"arn\": \"arn:aws:dynamodb:us-west-2:12345678:table/OpsItems\"}]","Type":"SearchableString"}}' \
        --notifications Arn="arn:aws:sns:us-west-2:12345678:TestUser"

Output::

    {
        "OpsItemId": "oi-1a2b3c4d5e6f"
    }

For more information, see `Creating OpsItems <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-creating-OpsItems.html>`__ in the *AWS Systems Manager User Guide*.
