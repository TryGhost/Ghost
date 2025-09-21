**To retrieve the reservation coverage for EC2 t2.nano instances in the us-east-1 region**

This example retrieves the reservation coverage for EC2 t2.nano instances in the us-east-1 region for July-September of 2017.

Command::

  aws ce get-reservation-coverage --time-period Start=2017-07-01,End=2017-10-01 --group-by Type=Dimension,Key=REGION --filter file://filters.json

filters.json::

 {
    "And": [
      {
        "Dimensions": {
          "Key": "INSTANCE_TYPE",
          "Values": [
            "t2.nano"
          ]
        },
        "Dimensions": {
          "Key": "REGION",
          "Values": [
            "us-east-1"
          ]
        }
      }
    ]
  }
  
Output::

 {
    "TotalSize": 6,
    "DimensionValues": [
        {
            "Attributes": {},
            "Value": "Amazon ElastiCache"
        },
        {
            "Attributes": {},
            "Value": "EC2 - Other"
        },
        {
            "Attributes": {},
            "Value": "Amazon Elastic Compute Cloud - Compute"
        },
        {
            "Attributes": {},
            "Value": "Amazon Elastic Load Balancing"
        },
        {
            "Attributes": {},
            "Value": "Amazon Elastic MapReduce"
        },
        {
            "Attributes": {},
            "Value": "Amazon Elasticsearch Service"
        }
    ],
    "ReturnSize": 6
 }	

