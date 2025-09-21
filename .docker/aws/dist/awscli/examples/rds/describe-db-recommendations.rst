**Example 1: To list all DB recommendations**

The following ``describe-db-recommendations`` example lists all DB recommendations in your AWS account. ::

    aws rds describe-db-recommendations

Output::

    {
        "DBRecommendations": [
            {
                "RecommendationId": "12ab3cde-f456-7g8h-9012-i3j45678k9lm",
                "TypeId": "config_recommendation::old_minor_version",
                "Severity": "informational",
                "ResourceArn": "arn:aws:rds:us-west-2:111122223333:db:database-1",
                "Status": "active",
                "CreatedTime": "2024-02-21T23:14:19.292000+00:00",
                "UpdatedTime": "2024-02-21T23:14:19+00:00",
                "Detection": "**[resource-name]** is not running the latest minor DB engine version",
                "Recommendation": "Upgrade to latest engine version",
                "Description": "Your database resources aren't running the latest minor DB engine version. The latest minor version contains the latest security fixes and other improvements.",
                "RecommendedActions": [
                    {
                        "ActionId": "12ab34c5de6fg7h89i0jk1lm234n5678",
                        "Operation": "modifyDbInstance",
                        "Parameters": [
                            {
                                "Key": "EngineVersion",
                                "Value": "5.7.44"
                            },
                            {
                                "Key": "DBInstanceIdentifier",
                                "Value": "database-1"
                            }
                        ],
                        "ApplyModes": [
                            "immediately",
                            "next-maintenance-window"
                        ],
                        "Status": "ready",
                        "ContextAttributes": [
                            {
                                "Key": "Recommended value",
                                "Value": "5.7.44"
                            },
                            {
                                "Key": "Current engine version",
                                "Value": "5.7.42"
                            }
                        ]
                    }
                ],
                "Category": "security",
                "Source": "RDS",
                "TypeDetection": "**[resource-count] resources** are not running the latest minor DB engine version",
                "TypeRecommendation": "Upgrade to latest engine version",
                "Impact": "Reduced database performance and data security at risk",
                "AdditionalInfo": "We recommend that you maintain your database with the latest DB engine minor version as this version includes the latest security and functionality fixes. The DB engine minor version upgrades contain only the changes which are backward-compatible with earlier minor versions of the same major version of the DB engine.",
                "Links": [
                    {
                        "Text": "Upgrading an RDS DB instance engine version",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html"
                    },
                    {
                        "Text": "Using Amazon RDS Blue/Green Deployments for database updates for Amazon Aurora",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments.html"
                    },
                    {
                        "Text": "Using Amazon RDS Blue/Green Deployments for database updates for Amazon RDS",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html"
                    }
                ]
            }
        ]
    }

For more information, see `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-recommendations.html>`__ in the *Amazon RDS User Guide* and `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/monitoring-recommendations.html>`__ in the *Amazon Aurora User Guide*.

**Example 2: To list high severity DB recommendations**

The following ``describe-db-recommendations`` example lists high severity DB recommendations in your AWS account. ::

    aws rds describe-db-recommendations \
        --filters Name=severity,Values=high

Output::

    {
        "DBRecommendations": [
            {
                "RecommendationId": "12ab3cde-f456-7g8h-9012-i3j45678k9lm",
                "TypeId": "config_recommendation::rds_extended_support",
                "Severity": "high",
                "ResourceArn": "arn:aws:rds:us-west-2:111122223333:db:database-1",
                "Status": "active",
                "CreatedTime": "2024-02-21T23:14:19.392000+00:00",
                "UpdatedTime": "2024-02-21T23:14:19+00:00",
                "Detection": "Your databases will be auto-enrolled to RDS Extended Support on February 29",
                "Recommendation": "Upgrade your major version before February 29, 2024 to avoid additional charges",
                "Description": "Your PostgreSQL 11 and MySQL 5.7 databases will be automatically enrolled into RDS Extended Support on February 29, 2024. To avoid the increase in charges due to RDS Extended Support, we recommend upgrading your databases to a newer major engine version before February 29, 2024.\nTo learn more about the RDS Extended Support pricing, refer to the pricing page.",
                "RecommendedActions": [
                    {
                        "ActionId": "12ab34c5de6fg7h89i0jk1lm234n5678",
                        "Parameters": [],
                        "ApplyModes": [
                            "manual"
                        ],
                        "Status": "ready",
                        "ContextAttributes": []
                    }
                ],
                "Category": "cost optimization",
                "Source": "RDS",
                "TypeDetection": "Your database will be auto-enrolled to RDS Extended Support on February 29",
                "TypeRecommendation": "Upgrade your major version before February 29, 2024 to avoid additional charges",
                "Impact": "Increase in charges due to RDS Extended Support",
                "AdditionalInfo": "With Amazon RDS Extended Support, you can continue running your database on a major engine version past the RDS end of standard support date for an additional cost. This paid feature gives you more time to upgrade to a supported major engine version.\nDuring Extended Support, Amazon RDS will supply critical CVE patches and bug fixes.",
                "Links": [
                    {
                        "Text": "Amazon RDS Extended Support pricing for RDS for MySQL",
                        "Url": "https://aws.amazon.com/rds/mysql/pricing/"
                    },
                    {
                        "Text": "Amazon RDS Extended Support for RDS for MySQL and PostgreSQL databases",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html"
                    },
                    {
                        "Text": "Amazon RDS Extended Support pricing for Amazon Aurora PostgreSQL",
                        "Url": "https://aws.amazon.com/rds/aurora/pricing/"
                    },
                    {
                        "Text": "Amazon RDS Extended Support for Aurora PostgreSQL databases",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/extended-support.html"
                    },
                    {
                        "Text": "Amazon RDS Extended Support pricing for RDS for PostgreSQL",
                        "Url": "https://aws.amazon.com/rds/postgresql/pricing/"
                    }
                ]
            }
        ]
    }

For more information, see `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-recommendations.html>`__ in the *Amazon RDS User Guide* and `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/monitoring-recommendations.html>`__ in the *Amazon Aurora User Guide*.

**Example 3: To list DB recommendations for a specified DB instance**

The following ``describe-db-recommendations`` example lists all DB recommendations for a specified DB instance. ::

    aws rds describe-db-recommendations \
        --filters Name=dbi-resource-id,Values=database-1

Output::

    {
        "DBRecommendations": [
            {
                "RecommendationId": "12ab3cde-f456-7g8h-9012-i3j45678k9lm",
                "TypeId": "config_recommendation::old_minor_version",
                "Severity": "informational",
                "ResourceArn": "arn:aws:rds:us-west-2:111122223333:db:database-1",
                "Status": "active",
                "CreatedTime": "2024-02-21T23:14:19.292000+00:00",
                "UpdatedTime": "2024-02-21T23:14:19+00:00",
                "Detection": "**[resource-name]** is not running the latest minor DB engine version",
                "Recommendation": "Upgrade to latest engine version",
                "Description": "Your database resources aren't running the latest minor DB engine version. The latest minor version contains the latest security fixes and other improvements.",
                "RecommendedActions": [
                    {
                        "ActionId": "12ab34c5de6fg7h89i0jk1lm234n5678",
                        "Operation": "modifyDbInstance",
                        "Parameters": [
                            {
                                "Key": "EngineVersion",
                                "Value": "5.7.44"
                            },
                            {
                                "Key": "DBInstanceIdentifier",
                                "Value": "database-1"
                            }
                        ],
                        "ApplyModes": [
                            "immediately",
                            "next-maintenance-window"
                        ],
                        "Status": "ready",
                        "ContextAttributes": [
                            {
                                "Key": "Recommended value",
                                "Value": "5.7.44"
                            },
                            {
                                "Key": "Current engine version",
                                "Value": "5.7.42"
                            }
                        ]
                    }
                ],
                "Category": "security",
                "Source": "RDS",
                "TypeDetection": "**[resource-count] resources** are not running the latest minor DB engine version",
                "TypeRecommendation": "Upgrade to latest engine version",
                "Impact": "Reduced database performance and data security at risk",
                "AdditionalInfo": "We recommend that you maintain your database with the latest DB engine minor version as this version includes the latest security and functionality fixes. The DB engine minor version upgrades contain only the changes which are backward-compatible with earlier minor versions of the same major version of the DB engine.",
                "Links": [
                    {
                        "Text": "Upgrading an RDS DB instance engine version",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html"
                    },
                    {
                        "Text": "Using Amazon RDS Blue/Green Deployments for database updates for Amazon Aurora",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments.html"
                    },
                    {
                        "Text": "Using Amazon RDS Blue/Green Deployments for database updates for Amazon RDS",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html"
                    }
                ]
            }
        ]
    }

For more information, see `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-recommendations.html>`__ in the *Amazon RDS User Guide* and `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/monitoring-recommendations.html>`__ in the *Amazon Aurora User Guide*.

**Example 4: To list all active DB recommendations**

The following ``describe-db-recommendations`` example lists all active DB recommendations in your AWS account. ::

    aws rds describe-db-recommendations \
        --filters Name=status,Values=active

Output::

    {
        "DBRecommendations": [
            {
                "RecommendationId": "12ab3cde-f456-7g8h-9012-i3j45678k9lm",
                "TypeId": "config_recommendation::old_minor_version",
                "Severity": "informational",
                "ResourceArn": "arn:aws:rds:us-west-2:111122223333:db:database-1",
                "Status": "active",
                "CreatedTime": "2024-02-21T23:14:19.292000+00:00",
                "UpdatedTime": "2024-02-21T23:14:19+00:00",
                "Detection": "**[resource-name]** is not running the latest minor DB engine version",
                "Recommendation": "Upgrade to latest engine version",
                "Description": "Your database resources aren't running the latest minor DB engine version. The latest minor version contains the latest security fixes and other improvements.",
                "RecommendedActions": [
                    {
                        "ActionId": "12ab34c5de6fg7h89i0jk1lm234n5678",
                        "Operation": "modifyDbInstance",
                        "Parameters": [
                            {
                                "Key": "EngineVersion",
                                "Value": "5.7.44"
                            },
                            {
                                "Key": "DBInstanceIdentifier",
                                "Value": "database-1"
                            }
                        ],
                        "ApplyModes": [
                            "immediately",
                            "next-maintenance-window"
                        ],
                        "Status": "ready",
                        "ContextAttributes": [
                            {
                                "Key": "Recommended value",
                                "Value": "5.7.44"
                            },
                            {
                                "Key": "Current engine version",
                                "Value": "5.7.42"
                            }
                        ]
                    }
                ],
                "Category": "security",
                "Source": "RDS",
                "TypeDetection": "**[resource-count] resources** are not running the latest minor DB engine version",
                "TypeRecommendation": "Upgrade to latest engine version",
                "Impact": "Reduced database performance and data security at risk",
                "AdditionalInfo": "We recommend that you maintain your database with the latest DB engine minor version as this version includes the latest security and functionality fixes. The DB engine minor version upgrades contain only the changes which are backward-compatible with earlier minor versions of the same major version of the DB engine.",
                "Links": [
                    {
                        "Text": "Upgrading an RDS DB instance engine version",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html"
                    },
                    {
                        "Text": "Using Amazon RDS Blue/Green Deployments for database updates for Amazon Aurora",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments.html"
                    },
                    {
                        "Text": "Using Amazon RDS Blue/Green Deployments for database updates for Amazon RDS",
                        "Url": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html"
                    }
                ]
            }
        ]
    }

For more information, see `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-recommendations.html>`__ in the *Amazon RDS User Guide* and `Viewing and responding to Amazon RDS recommendations <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/monitoring-recommendations.html>`__ in the *Amazon Aurora User Guide*.