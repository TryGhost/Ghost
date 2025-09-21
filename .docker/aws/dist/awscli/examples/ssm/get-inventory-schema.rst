**To view your inventory schema**

This example returns a list of inventory type names for the account.

Command::

  aws ssm get-inventory-schema

Output::

  {
    "Schemas": [
        {
            "TypeName": "AWS:AWSComponent",
            "Version": "1.0",
            "Attributes": [
                {
                    "Name": "Name",
                    "DataType": "STRING"
                },
                {
                    "Name": "ApplicationType",
                    "DataType": "STRING"
                },
                {
                    "Name": "Publisher",
                    "DataType": "STRING"
                },
                {
                    "Name": "Version",
                    "DataType": "STRING"
                },
                {
                    "Name": "InstalledTime",
                    "DataType": "STRING"
                },
                {
                    "Name": "Architecture",
                    "DataType": "STRING"
                },
                {
                    "Name": "URL",
                    "DataType": "STRING"
                }
            ]
        },
        ...
    ],
    "NextToken": "--token string truncated--"
  }
  
**To view the inventory schema for a specific inventory type**

This example return the inventory schema for a the AWS:AWSComponent inventory type.

Command::

  aws ssm get-inventory-schema --type-name "AWS:AWSComponent"
