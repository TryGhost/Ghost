**To delete an automatic snapshot**

The following ``delete-auto-snapshot`` example deletes the automatic snapshot ``2019-10-10`` of instance ``WordPress-1``. ::

    aws lightsail delete-auto-snapshot \
        --resource-name WordPress-1 \
        --date 2019-10-10

Output::

    {
        "operations": [
            {
                "id": "31c36e09-3d52-46d5-b6d8-7EXAMPLE534a",
                "resourceName": "WordPress-1",
                "resourceType": "Instance",
                "createdAt": 1571088141.501,
                "location": {
                    "availabilityZone": "us-west-2",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "DeleteAutoSnapshot-2019-10-10",
                "operationType": "DeleteAutoSnapshot",
                "status": "Succeeded"
            }
        ]
    }

For more information, see `Deleting automatic snapshots of instances or disks in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-deleting-automatic-snapshots>`__ in the *Lightsail Dev Guide*.
