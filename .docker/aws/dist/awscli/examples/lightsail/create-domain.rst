**To create a domain (DNS zone)**

The following ``create-domain`` example creates a DNS zone for the specified domain.

**Note:** Lightsail's domain-related API operations are available in only the ``us-east-1`` Region. If your CLI profile is configured to use a different Region, you must include the ``--region us-east-1`` parameter or the command fails. ::

    aws lightsail create-domain \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "operation": {
            "id": "64e522c8-9ae1-4c05-9b65-3f237324dc34",
            "resourceName": "example.com",
            "resourceType": "Domain",
            "createdAt": 1569864291.92,
            "location": {
                "availabilityZone": "all",
                "regionName": "global"
            },
            "isTerminal": true,
            "operationType": "CreateDomain",
            "status": "Succeeded",
            "statusChangedAt": 1569864292.109
        }
    }

For more information, see `DNS in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/understanding-dns-in-amazon-lightsail>`__ and `Creating a DNS zone to manage your domain's DNS records in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/lightsail-how-to-create-dns-entry>`__ in the *Lightsail Developer Guide*.
