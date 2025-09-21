**To delete a domain (DNS zone)**

The following ``delete-domain`` example deletes the specified domain and all of the entries in the domain (DNS records). 

**Note:** Lightsail's domain-related API operations are available in only the ``us-east-1`` Region. If your CLI profile is configured to use a different Region, you must include the ``--region us-east-1`` parameter or the command fails. ::

    aws lightsail delete-domain \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "operation": {
            "id": "fcef5265-5af1-4a46-a3d7-90b5e18b9b32",
            "resourceName": "example.com",
            "resourceType": "Domain",
            "createdAt": 1569873788.13,
            "location": {
                "availabilityZone": "all",
                "regionName": "global"
            },
            "isTerminal": true,
            "operationType": "DeleteDomain",
            "status": "Succeeded",
            "statusChangedAt": 1569873788.13
        }
    }
