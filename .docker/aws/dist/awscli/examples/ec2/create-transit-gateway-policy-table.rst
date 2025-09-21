**To create a transit gateway policy table**

The following ``create-transit-gateway-policy-table`` example creates a transit gateway policy table for the specified transit gateway. ::

    aws ec2 create-transit-gateway-policy-table \
        --transit-gateway-id tgw-067f8505c18f0bd6e

Output::

    {
        "TransitGatewayPolicyTable": {
            "TransitGatewayPolicyTableId": "tgw-ptb-0a16f134b78668a81",
            "TransitGatewayId": "tgw-067f8505c18f0bd6e",
            "State": "pending",
            "CreationTime": "2023-11-28T16:36:43+00:00"
        }
    }

For more information, see `Transit gateway policy tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-policy-tables.html>`__ in the *Transit Gateway User Guide*.
