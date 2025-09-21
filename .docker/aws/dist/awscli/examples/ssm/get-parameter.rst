**Example 1: To display the value of a parameter**

The following ``get-parameter`` example lists the value for the specified single parameter. ::

    aws ssm get-parameter \
        --name "MyStringParameter"

Output::

    {
        "Parameter": {
            "Name": "MyStringParameter",
            "Type": "String",
            "Value": "Veni",
            "Version": 1,
            "LastModifiedDate": 1530018761.888,
            "ARN": "arn:aws:ssm:us-east-2:111222333444:parameter/MyStringParameter"
            "DataType": "text"
        }
    }

For more information, see `Working with Parameter Store <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-working-with.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To decrypt the value of a SecureString parameter**

The following ``get-parameter`` example decrypts the value of the specified ``SecureString`` parameter. ::

    aws ssm get-parameter \
        --name "MySecureStringParameter" \
        --with-decryption

Output::

    {
        "Parameter": {
            "Name": "MySecureStringParameter",
            "Type": "SecureString",
            "Value": "16679b88-310b-4895-a943-e0764EXAMPLE",
            "Version": 2,
            "LastModifiedDate": 1582155479.205,
            "ARN": "arn:aws:ssm:us-east-2:111222333444:parameter/MySecureStringParameter"
            "DataType": "text"
        }
    }

For more information, see `Working with Parameter Store <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-working-with.html>`__ in the *AWS Systems Manager User Guide*.

**Example 3: To display the value of a parameter using labels**

The following ``get-parameter`` example lists the value for the specified single parameter with a specified label. ::

    aws ssm get-parameter \
        --name "MyParameter:label"

Output::

    {
        "Parameter": {
            "Name": "MyParameter",
            "Type": "String",
            "Value": "parameter version 2",
            "Version": 2,
            "Selector": ":label",
            "LastModifiedDate": "2021-07-12T09:49:15.865000-07:00",
            "ARN": "arn:aws:ssm:us-west-2:786973925828:parameter/MyParameter",
            "DataType": "text"
        }
    }

For more information, see `Working with parameter labels <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html>`__ in the *AWS Systems Manager User Guide*.

**Example 4: To display the value of a parameter using versions**

The following ``get-parameter`` example lists the value for the specified single parameter version. ::

    aws ssm get-parameter \
        --name "MyParameter:2"

Output::

    {
        "Parameter": {
            "Name": "MyParameter",
            "Type": "String",
            "Value": "parameter version 2",
            "Version": 2,
            "Selector": ":2",
            "LastModifiedDate": "2021-07-12T09:49:15.865000-07:00",
            "ARN": "arn:aws:ssm:us-west-2:786973925828:parameter/MyParameter",
            "DataType": "text"
        }
    }

For more information, see `Working with parameter labels <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html>`__ in the *AWS Systems Manager User Guide*.
