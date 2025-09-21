**1. To add tags to a cluster**

- Command::

    aws emr add-tags --resource-id j-xxxxxxx --tags name="John Doe" age=29 sex=male address="123 East NW Seattle"

- Output::

    None

**2. To list tags of a cluster**

--Command::

  aws emr describe-cluster --cluster-id j-XXXXXXYY --query Cluster.Tags

- Output::

    [
        {
            "Value": "male",
            "Key": "sex"
        },
        {
            "Value": "123 East NW Seattle",
            "Key": "address"
        },
        {
            "Value": "John Doe",
            "Key": "name"
        },
        {
            "Value": "29",
            "Key": "age"
        }
    ]
