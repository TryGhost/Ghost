**Example 1: To associate a document using instance IDs**

This example associates a configuration document with an instance, using instance IDs. ::

    aws ssm create-association \
        --instance-id "i-0cb2b964d3e14fd9f" \
        --name "AWS-UpdateSSMAgent"

Output::

    {
        "AssociationDescription": {
            "Status": {
                "Date": 1487875500.33,
                "Message": "Associated with AWS-UpdateSSMAgent",
                "Name": "Associated"
            },
            "Name": "AWS-UpdateSSMAgent",
            "InstanceId": "i-0cb2b964d3e14fd9f",
            "Overview": {
                "Status": "Pending",
                "DetailedStatus": "Creating"
            },
            "AssociationId": "b7c3266e-a544-44db-877e-b20d3a108189",
            "DocumentVersion": "$DEFAULT",
            "LastUpdateAssociationDate": 1487875500.33,
            "Date": 1487875500.33,
            "Targets": [
                {
                    "Values": [
                        "i-0cb2b964d3e14fd9f"
                    ],
                    "Key": "InstanceIds"
                }
            ]
        }
    }

For more information, see `CreateAssociation <https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CreateAssociation.html>`__ in the *AWS Systems Manager API Reference*.

**Example 2: To associate a document using targets**

This example associates a configuration document with an instance, using targets. ::

    aws ssm create-association \
        --name "AWS-UpdateSSMAgent" \
        --targets "Key=instanceids,Values=i-0cb2b964d3e14fd9f"

Output::

    {
        "AssociationDescription": {
            "Status": {
                "Date": 1487875500.33,
                "Message": "Associated with AWS-UpdateSSMAgent",
                "Name": "Associated"
            },
            "Name": "AWS-UpdateSSMAgent",
            "InstanceId": "i-0cb2b964d3e14fd9f",
            "Overview": {
                "Status": "Pending",
                "DetailedStatus": "Creating"
            },
            "AssociationId": "b7c3266e-a544-44db-877e-b20d3a108189",
            "DocumentVersion": "$DEFAULT",
            "LastUpdateAssociationDate": 1487875500.33,
            "Date": 1487875500.33,
            "Targets": [
                {
                    "Values": [
                        "i-0cb2b964d3e14fd9f"
                    ],
                    "Key": "InstanceIds"
                }
            ]
        }
    }

For more information, see `CreateAssociation <https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CreateAssociation.html>`__ in the *AWS Systems Manager API Reference*.

**Example 3: To create an association that runs only once**

This example creates a new association that only runs once on the specified date and time. Associations created with a date in the past or present (by the time it is processed the date is in the past) run immediately. ::

    aws ssm create-association \
        --name "AWS-UpdateSSMAgent" \
        --targets "Key=instanceids,Values=i-0cb2b964d3e14fd9f" \
        --schedule-expression "at(2020-05-14T15:55:00)"  \
        --apply-only-at-cron-interval

Output::

    {
        "AssociationDescription": {
            "Status": {
                "Date": 1487875500.33,
                "Message": "Associated with AWS-UpdateSSMAgent",
                "Name": "Associated"
            },
            "Name": "AWS-UpdateSSMAgent",
            "InstanceId": "i-0cb2b964d3e14fd9f",
            "Overview": {
                "Status": "Pending",
                "DetailedStatus": "Creating"
            },
            "AssociationId": "b7c3266e-a544-44db-877e-b20d3a108189",
            "DocumentVersion": "$DEFAULT",
            "LastUpdateAssociationDate": 1487875500.33,
            "Date": 1487875500.33,
            "Targets": [
                {
                    "Values": [
                        "i-0cb2b964d3e14fd9f"
                    ],
                    "Key": "InstanceIds"
                }
            ]
        }
    }

For more information, see `CreateAssociation <https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CreateAssociation.html>`__ in the *AWS Systems Manager API Reference* or `Reference: Cron and rate expressions for Systems Manager <https://docs.aws.amazon.com/systems-manager/latest/userguide/reference-cron-and-rate-expressions.html>`__ in the *AWS Systems Manager User Guide*.