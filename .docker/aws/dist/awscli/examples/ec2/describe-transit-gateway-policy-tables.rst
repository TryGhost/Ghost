**To describe a transit gateway policy table**

The following ``describe-transit-gateway-policy-tables`` example describes the specified transit gateway policy table. ::

    aws ec2 describe-transit-gateway-policy-tables \
        --transit-gateway-policy-table-ids tgw-ptb-0a16f134b78668a81

Output::

    {
        "TransitGatewayPolicyTables": [
            {
                "TransitGatewayPolicyTableId": "tgw-ptb-0a16f134b78668a81",
                "TransitGatewayId": "tgw-067f8505c18f0bd6e",
                "State": "available",
                "CreationTime": "2023-11-28T16:36:43+00:00",
                "Tags": []
            }
        ]
    }

For more information, see `Transit gateway policy tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-policy-tables.html>`__ in the *Transit Gateway User Guide*.
