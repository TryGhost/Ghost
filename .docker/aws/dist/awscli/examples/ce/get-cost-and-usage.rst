**To retrieve the S3 usage of an account for the month of September 2017**

The following ``get-cost-and-usage`` example retrieves the S3 usage of an account for the month of September 2017. ::

    aws ce get-cost-and-usage \
        --time-period Start=2017-09-01,End=2017-10-01 \
        --granularity MONTHLY \
        --metrics "BlendedCost" "UnblendedCost" "UsageQuantity" \
        --group-by Type=DIMENSION,Key=SERVICE Type=TAG,Key=Environment \
        --filter file://filters.json

Contents of ``filters.json``::

    {
        "Dimensions": {
            "Key": "SERVICE",
            "Values": [
                "Amazon Simple Storage Service"
            ]
        }
    }

Output::

    {
        "GroupDefinitions": [
            {
                "Type": "DIMENSION",
                "Key": "SERVICE"
            },
            {
                "Type": "TAG",
                "Key": "Environment"
            }
        ],
        "ResultsByTime": [
            {
                "Estimated": false,
                "TimePeriod": {
                    "Start": "2017-09-01",
                    "End": "2017-10-01"
                },
                "Total": {},
                "Groups": [
                    {
                        "Keys": [
                            "Amazon Simple Storage Service",
                            "Environment$"
                        ],
                        "Metrics": {
                            "BlendedCost": {
                                "Amount": "40.3527508453",
                                "Unit": "USD"
                            },
                            "UnblendedCost": {
                                "Amount": "40.3543773134",
                                "Unit": "USD"
                            },
                            "UsageQuantity": {
                                "Amount": "9312771.098461578",
                                "Unit": "N/A"
                            }
                        }
                    },
                    {
                        "Keys": [
                            "Amazon Simple Storage Service",
                            "Environment$Dev"
                        ],
                        "Metrics": {
                            "BlendedCost": {
                                "Amount": "0.2682364644",
                                "Unit": "USD"
                            },
                            "UnblendedCost": {
                                "Amount": "0.2682364644",
                                "Unit": "USD"
                            },
                            "UsageQuantity": {
                                "Amount": "22403.4395271182",
                                "Unit": "N/A"
                            }
                        }
                    }
                ]
            }
        ]
    }
