**To view all reserved instances**

The following ``describe-elasticsearch-domains`` example provides a summary of all instances you have reserved in a region. ::

    aws es describe-reserved-elasticsearch-instances

Output::

    {
        "ReservedElasticsearchInstances": [{
            "FixedPrice": 100.0,
            "ReservedElasticsearchInstanceOfferingId": "1a2a3a4a5-1a2a-3a4a-5a6a-1a2a3a4a5a6a",
            "ReservationName": "my-reservation",
            "PaymentOption": "PARTIAL_UPFRONT",
            "UsagePrice": 0.0,
            "ReservedElasticsearchInstanceId": "9a8a7a6a-5a4a-3a2a-1a0a-9a8a7a6a5a4a",
            "RecurringCharges": [{
                "RecurringChargeAmount": 0.603,
                "RecurringChargeFrequency": "Hourly"
            }],
            "State": "payment-pending",
            "StartTime": 1522872571.229,
            "ElasticsearchInstanceCount": 3,
            "Duration": 31536000,
            "ElasticsearchInstanceType": "m4.2xlarge.elasticsearch",
            "CurrencyCode": "USD"
        }]
    }

For more information, see `Reserved Instances <https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/aes-ri.html>`__ in the *Amazon Elasticsearch Service Developer Guide*.
