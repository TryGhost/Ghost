**Example 1: To copy a snapshot within the same AWS Region**

The following ``copy-snapshot`` example copies instance snapshot ``MEAN-1-1571075291`` as instance snapshot ``MEAN-1-Copy`` within the same AWS Region ``us-west-2``. ::

    aws lightsail copy-snapshot \
        --source-snapshot-name MEAN-1-1571075291 \
        --target-snapshot-name MEAN-1-Copy \
        --source-region us-west-2

Output::

    {
        "operations": [
            {
                "id": "ced16fc1-f401-4556-8d82-1EXAMPLEb982",
                "resourceName": "MEAN-1-Copy",
                "resourceType": "InstanceSnapshot",
                "createdAt": 1571075581.498,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "us-west-2:MEAN-1-1571075291",
                "operationType": "CopySnapshot",
                "status": "Started",
                "statusChangedAt": 1571075581.498
            }
        ]
    }

For more information, see `Copying snapshots from one AWS Region to another in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-copying-snapshots-from-one-region-to-another>`__ in the *Lightsail Dev Guide*.

**Example 2: To copy a snapshot from one AWS Region to another**

The following ``copy-snapshot`` example copies instance snapshot ``MEAN-1-1571075291`` as instance snapshot ``MEAN-1-1571075291-Copy`` from AWS Region ``us-west-2`` to ``us-east-1``. ::

    aws lightsail copy-snapshot \
        --source-snapshot-name MEAN-1-1571075291 \
        --target-snapshot-name MEAN-1-1571075291-Copy \
        --source-region us-west-2 \
        --region us-east-1

Output::

    {
        "operations": [
            {
                "id": "91116b79-119c-4451-b44a-dEXAMPLEd97b",
                "resourceName": "MEAN-1-1571075291-Copy",
                "resourceType": "InstanceSnapshot",
                "createdAt": 1571075695.069,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-east-1"
                },
                "isTerminal": false,
                "operationDetails": "us-west-2:MEAN-1-1571075291",
                "operationType": "CopySnapshot",
                "status": "Started",
                "statusChangedAt": 1571075695.069
            }
        ]
    }

For more information, see `Copying snapshots from one AWS Region to another in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-copying-snapshots-from-one-region-to-another>`__ in the *Lightsail Dev Guide*.

**Example 3: To copy an automatic snapshot within the same AWS Region**

The following ``copy-snapshot`` example copies automatic snapshot ``2019-10-14`` of instance ``WordPress-1`` as a manual snapshot ``WordPress-1-10142019`` in the AWS Region ``us-west-2``. ::

    aws lightsail copy-snapshot \
        --source-resource-name WordPress-1 \
        --restore-date 2019-10-14 \
        --target-snapshot-name WordPress-1-10142019 \
        --source-region us-west-2

Output::

    {
        "operations": [
            {
                "id": "be3e6754-cd1d-48e6-ad9f-2EXAMPLE1805",
                "resourceName": "WordPress-1-10142019",
                "resourceType": "InstanceSnapshot",
                "createdAt": 1571082412.311,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "us-west-2:WordPress-1",
                "operationType": "CopySnapshot",
                "status": "Started",
                "statusChangedAt": 1571082412.311
            }
        ]
    }

For more information, see `Keeping automatic snapshots of instances or disks in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-keeping-automatic-snapshots>`__ in the *Lightsail Dev Guide*.

**Example 4: To copy an automatic snapshot from one AWS Region to another**

The following ``copy-snapshot`` example copies automatic snapshot ``2019-10-14`` of instance ``WordPress-1`` as a manual snapshot ``WordPress-1-10142019`` from the AWS Region ``us-west-2`` to ``us-east-1``. ::

    aws lightsail copy-snapshot \
        --source-resource-name WordPress-1 \
        --restore-date 2019-10-14 \
        --target-snapshot-name WordPress-1-10142019 \
        --source-region us-west-2 \
        --region us-east-1

Output::

    {
        "operations": [
            {
                "id": "dffa128b-0b07-476e-b390-bEXAMPLE3775",
                "resourceName": "WordPress-1-10142019",
                "resourceType": "InstanceSnapshot",
                "createdAt": 1571082493.422,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-east-1"
                },
                "isTerminal": false,
                "operationDetails": "us-west-2:WordPress-1",
                "operationType": "CopySnapshot",
                "status": "Started",
                "statusChangedAt": 1571082493.422
            }
        ]
    }

For more information, see `Keeping automatic snapshots of instances or disks in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-keeping-automatic-snapshots>`__ in the *Lightsail Dev Guide*.
