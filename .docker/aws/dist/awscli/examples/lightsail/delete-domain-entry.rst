**To delete a domain entry (DNS record)**

The following ``delete-domain-entry`` example deletes the specified domain entry from an existing domain.

**Note:** Lightsail's domain-related API operations are available in only the ``us-east-1`` Region. If your CLI profile is configured to use a different Region, you must include the ``--region us-east-1`` parameter or the command fails. ::

    aws lightsail delete-domain-entry \
        --region us-east-1 \
        --domain-name example.com \
        --domain-entry name=123.example.com,target=192.0.2.0,type=A

Output::

    {
        "operation": {
            "id": "06eacd01-d785-420e-8daa-823150c7dca1",
            "resourceName": "example.com ",
            "resourceType": "Domain",
            "createdAt": 1569874157.005,
            "location": {
                "availabilityZone": "all",
                "regionName": "global"
            },
            "isTerminal": true,
            "operationType": "DeleteDomainEntry",
            "status": "Succeeded",
            "statusChangedAt": 1569874157.005
        }
    }
