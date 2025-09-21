**To retrieve a detailed description of an attack**

The following ``describe-attack`` example displays details about the DDoS attack with the specified attack ID. You can obtain attack IDs by running the ``list-attacks`` command. ::

    aws shield describe-attack --attack-id a1b2c3d4-5678-90ab-cdef-EXAMPLE22222

Output::

    {
        "Attack": {
            "AttackId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "ResourceArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/testElb",
            "SubResources": [
                {
                    "Type": "IP",
                    "Id": "192.0.2.2",
                    "AttackVectors": [
                        {
                            "VectorType": "SYN_FLOOD",
                            "VectorCounters": [
                                {
                                    "Name": "SYN_FLOOD_BPS",
                                    "Max": 982184.0,
                                    "Average": 982184.0,
                                    "Sum": 11786208.0,
                                    "N": 12,
                                    "Unit": "BPS"
                                }
                            ]
                        }
                    ],
                    "Counters": []
                },
                {
                    "Type": "IP",
                    "Id": "192.0.2.3",
                    "AttackVectors": [
                        {
                            "VectorType": "SYN_FLOOD",
                            "VectorCounters": [
                                {
                                    "Name": "SYN_FLOOD_BPS",
                                    "Max": 982184.0,
                                    "Average": 982184.0,
                                    "Sum": 9821840.0,
                                    "N": 10,
                                    "Unit": "BPS"
                                }
                            ]
                        }
                    ],
                    "Counters": []
                },
                {
                    "Type": "IP",
                    "Id": "192.0.2.4",
                    "AttackVectors": [
                        {
                            "VectorType": "SYN_FLOOD",
                            "VectorCounters": [
                                {
                                    "Name": "SYN_FLOOD_BPS",
                                    "Max": 982184.0,
                                    "Average": 982184.0,
                                    "Sum": 7857472.0,
                                    "N": 8,
                                    "Unit": "BPS"
                                }
                            ]
                        }
                    ],
                    "Counters": []
                },
                {
                    "Type": "IP",
                    "Id": "192.0.2.5",
                    "AttackVectors": [
                        {
                            "VectorType": "SYN_FLOOD",
                            "VectorCounters": [
                                {
                                    "Name": "SYN_FLOOD_BPS",
                                    "Max": 982184.0,
                                    "Average": 982184.0,
                                    "Sum": 1964368.0,
                                    "N": 2,
                                    "Unit": "BPS"
                                }
                            ]
                        }
                    ],
                    "Counters": []
                },
                {
                    "Type": "IP",
                    "Id": "2001:DB8::bcde:4321:8765:0:0",
                    "AttackVectors": [
                        {
                            "VectorType": "SYN_FLOOD",
                            "VectorCounters": [
                                {
                                    "Name": "SYN_FLOOD_BPS",
                                    "Max": 982184.0,
                                    "Average": 982184.0,
                                    "Sum": 1964368.0,
                                    "N": 2,
                                    "Unit": "BPS"
                                }
                            ]
                        }
                    ],
                    "Counters": []
                },
                {
                    "Type": "IP",
                    "Id": "192.0.2.6",
                    "AttackVectors": [
                        {
                            "VectorType": "SYN_FLOOD",
                            "VectorCounters": [
                                {
                                    "Name": "SYN_FLOOD_BPS",
                                    "Max": 982184.0,
                                    "Average": 982184.0,
                                    "Sum": 1964368.0,
                                    "N": 2,
                                    "Unit": "BPS"
                                }
                            ]
                        }
                    ],
                    "Counters": []
                }
            ],
            "StartTime": 1576024927.457,
            "EndTime": 1576025647.457,
            "AttackCounters": [],
            "AttackProperties": [
                {
                    "AttackLayer": "NETWORK",
                    "AttackPropertyIdentifier": "SOURCE_IP_ADDRESS",
                    "TopContributors": [
                        {
                            "Name": "198.51.100.5",
                            "Value": 2024475682
                        },
                        {
                            "Name": "198.51.100.8",
                            "Value": 1311380863
                        },
                        {
                            "Name": "203.0.113.4",
                            "Value": 900599855
                        },
                        {
                            "Name": "198.51.100.4",
                            "Value": 769417366
                        },
                        {
                            "Name": "203.1.113.13",
                            "Value": 757992847
                        }
                    ],
                    "Unit": "BYTES",
                    "Total": 92773354841
                },
                {
                    "AttackLayer": "NETWORK",
                    "AttackPropertyIdentifier": "SOURCE_COUNTRY",
                    "TopContributors": [
                        {
                            "Name": "United States",
                            "Value": 80938161764
                        },
                        {
                            "Name": "Brazil",
                            "Value": 9929864330
                        },
                        {
                            "Name": "Netherlands",
                            "Value": 1635009446
                        },
                        {
                            "Name": "Mexico",
                            "Value": 144832971
                        },
                        {
                            "Name": "Japan",
                            "Value": 45369000
                        }
                    ],
                    "Unit": "BYTES",
                    "Total": 92773354841
                },
                {
                    "AttackLayer": "NETWORK",
                    "AttackPropertyIdentifier": "SOURCE_ASN",
                    "TopContributors": [
                        {
                            "Name": "12345",
                            "Value": 74953625841
                        },
                        {
                            "Name": "12346",
                            "Value": 4440087595
                        },
                        {
                            "Name": "12347",
                            "Value": 1635009446
                        },
                        {
                            "Name": "12348",
                            "Value": 1221230000
                        },
                        {
                            "Name": "12349",
                            "Value": 1199425294
                        }
                    ],
                    "Unit": "BYTES",
                    "Total": 92755479921
                }
            ],
            "Mitigations": []
        }
    }

For more information, see `Reviewing DDoS Incidents <https://docs.aws.amazon.com/waf/latest/developerguide/using-ddos-reports.html>`__ in the *AWS Shield Advanced Developer Guide*.
