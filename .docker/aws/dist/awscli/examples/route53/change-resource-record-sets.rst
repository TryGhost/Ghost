**To create, update, or delete a resource record set**

The following ``change-resource-record-sets`` command creates a resource record set using the ``hosted-zone-id`` ``Z1R8UBAEXAMPLE`` and the JSON-formatted configuration in the file ``C:\awscli\route53\change-resource-record-sets.json``::

  aws route53 change-resource-record-sets --hosted-zone-id Z1R8UBAEXAMPLE --change-batch file://C:\awscli\route53\change-resource-record-sets.json

For more information, see `POST ChangeResourceRecordSets`_ in the *Amazon Route 53 API Reference*.

.. _`POST ChangeResourceRecordSets`: http://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html


The configuration in the JSON file depends on the kind of resource record set you want to create:

- Basic

- Weighted

- Alias

- Weighted Alias

- Latency

- Latency Alias

- Failover

- Failover Alias



**Basic Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "TTL": time to live in seconds,
          "ResourceRecords": [
            {
              "Value": "applicable value for the record type"
            },
            {...}
          ]
        }
      },
      {...}
    ]
  }


**Weighted Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "SetIdentifier": "unique description for this resource record set",
          "Weight": value between 0 and 255,
          "TTL": time to live in seconds,
          "ResourceRecords": [
            {
              "Value": "applicable value for the record type"
            },
            {...}
          ],
          "HealthCheckId": "optional ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }


**Alias Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "AliasTarget": {
            "HostedZoneId": "hosted zone ID for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or Amazon Route 53 hosted zone",
            "DNSName": "DNS domain name for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or another resource record set in this hosted zone",
            "EvaluateTargetHealth": true|false
          },
          "HealthCheckId": "optional ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }


**Weighted Alias Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "SetIdentifier": "unique description for this resource record set",
          "Weight": value between 0 and 255,
          "AliasTarget": {
            "HostedZoneId": "hosted zone ID for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or Amazon Route 53 hosted zone",
            "DNSName": "DNS domain name for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or another resource record set in this hosted zone",
            "EvaluateTargetHealth": true|false
          },
          "HealthCheckId": "optional ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }



**Latency Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "SetIdentifier": "unique description for this resource record set",
          "Region": "Amazon EC2 region name",
          "TTL": time to live in seconds,
          "ResourceRecords": [
            {
              "Value": "applicable value for the record type"
            },
            {...}
          ],
          "HealthCheckId": "optional ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }


**Latency Alias Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "SetIdentifier": "unique description for this resource record set",
          "Region": "Amazon EC2 region name",
          "AliasTarget": {
            "HostedZoneId": "hosted zone ID for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or Amazon Route 53 hosted zone",
            "DNSName": "DNS domain name for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or another resource record set in this hosted zone",
            "EvaluateTargetHealth": true|false
          },
          "HealthCheckId": "optional ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }


**Failover Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "SetIdentifier": "unique description for this resource record set",
          "Failover": "PRIMARY" | "SECONDARY",
          "TTL": time to live in seconds,
          "ResourceRecords": [
            {
              "Value": "applicable value for the record type"
            },
            {...}
          ],
          "HealthCheckId": "ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }


**Failover Alias Syntax**::

  {
    "Comment": "optional comment about the changes in this change batch request",
    "Changes": [
      {
        "Action": "CREATE"|"DELETE"|"UPSERT",
        "ResourceRecordSet": {
          "Name": "DNS domain name",
          "Type": "SOA"|"A"|"TXT"|"NS"|"CNAME"|"MX"|"PTR"|"SRV"|"SPF"|"AAAA",
          "SetIdentifier": "unique description for this resource record set",
          "Failover": "PRIMARY" | "SECONDARY",
          "AliasTarget": {
            "HostedZoneId": "hosted zone ID for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or Amazon Route 53 hosted zone",
            "DNSName": "DNS domain name for your CloudFront distribution, Amazon S3 bucket, Elastic Load Balancing load balancer, or another resource record set in this hosted zone",
            "EvaluateTargetHealth": true|false
          },
          "HealthCheckId": "optional ID of an Amazon Route 53 health check"
        }
      },
      {...}
    ]
  }
