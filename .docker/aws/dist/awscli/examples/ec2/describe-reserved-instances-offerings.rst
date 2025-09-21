**To describe Reserved Instances offerings**

This example command describes all Reserved Instances available for purchase in the region.

Command::

  aws ec2 describe-reserved-instances-offerings

Output::

  {
    "ReservedInstancesOfferings": [
        {
            "OfferingType": "Partial Upfront",
            "AvailabilityZone": "us-east-1b",
            "InstanceTenancy": "default",
            "PricingDetails": [],
            "ProductDescription": "Red Hat Enterprise Linux",
            "UsagePrice": 0.0,
            "RecurringCharges": [
                {
                    "Amount": 0.088,
                    "Frequency": "Hourly"
                }
            ],
            "Marketplace": false,
            "CurrencyCode": "USD",
            "FixedPrice": 631.0,
            "Duration": 94608000,
            "ReservedInstancesOfferingId": "9a06095a-bdc6-47fe-a94a-2a382f016040",
            "InstanceType": "c1.medium"
        },
        {
            "OfferingType": "PartialUpfront",
            "AvailabilityZone": "us-east-1b",
            "InstanceTenancy": "default",
            "PricingDetails": [],
            "ProductDescription": "Linux/UNIX",
            "UsagePrice": 0.0,
            "RecurringCharges": [
                {
                    "Amount": 0.028,
                    "Frequency": "Hourly"
                }
            ],
            "Marketplace": false,
            "CurrencyCode": "USD",
            "FixedPrice": 631.0,
            "Duration": 94608000,
            "ReservedInstancesOfferingId": "bfbefc6c-0d10-418d-b144-7258578d329d",
            "InstanceType": "c1.medium"
        },
    ...
  }

**To describe your Reserved Instances offerings using options**

This example lists Reserved Instances offered by AWS with the following specifications: t1.micro instance types, Windows (Amazon VPC) product, and Heavy Utilization offerings.

Command::

  aws ec2 describe-reserved-instances-offerings --no-include-marketplace --instance-type "t1.micro" --product-description "Windows (Amazon VPC)" --offering-type "no upfront"

Output::

  {
      "ReservedInstancesOfferings": [
        {
            "OfferingType": "No Upfront", 
            "AvailabilityZone": "us-east-1b", 
            "InstanceTenancy": "default", 
            "PricingDetails": [], 
            "ProductDescription": "Windows", 
            "UsagePrice": 0.0, 
            "RecurringCharges": [
                {
                    "Amount": 0.015, 
                    "Frequency": "Hourly"
                }
            ], 
            "Marketplace": false, 
            "CurrencyCode": "USD", 
            "FixedPrice": 0.0, 
            "Duration": 31536000, 
            "ReservedInstancesOfferingId": "c48ab04c-fe69-4f94-8e39-a23842292823", 
            "InstanceType": "t1.micro"
        }, 

		...
        {
            "OfferingType": "No Upfront", 
            "AvailabilityZone": "us-east-1d", 
            "InstanceTenancy": "default", 
            "PricingDetails": [], 
            "ProductDescription": "Windows (Amazon VPC)", 
            "UsagePrice": 0.0, 
            "RecurringCharges": [
                {
                    "Amount": 0.015, 
                    "Frequency": "Hourly"
                }
            ], 
            "Marketplace": false, 
            "CurrencyCode": "USD", 
            "FixedPrice": 0.0, 
            "Duration": 31536000, 
            "ReservedInstancesOfferingId": "3a98bf7d-2123-42d4-b4f5-8dbec4b06dc6", 
            "InstanceType": "t1.micro"
        }
      ]
  }

