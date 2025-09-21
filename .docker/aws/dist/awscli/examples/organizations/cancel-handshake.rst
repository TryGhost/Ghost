**To cancel a handshake sent from another account**

Bill previously sent an invitation to Susan's account to join his organization. He changes his mind and decides to cancel the invitation before Susan accepts it. The following example shows Bill's cancellation: :: 

	aws organizations cancel-handshake --handshake-id h-examplehandshakeid111
	
The output includes a handshake object that shows that the state is now ``CANCELED``: ::

	{
		"Handshake": {
			"Id": "h-examplehandshakeid111",
			"State":"CANCELED",
			"Action": "INVITE",
			"Arn": "arn:aws:organizations::111111111111:handshake/o-exampleorgid/invite/h-examplehandshakeid111",
			"Parties": [ 
				{
					"Id": "o-exampleorgid",
					"Type": "ORGANIZATION"
				},
				{
					"Id": "susan@example.com",
					"Type": "EMAIL"
				}
			],
			"Resources": [
				{
					"Type": "ORGANIZATION",
					"Value": "o-exampleorgid",
					"Resources": [
						{
							"Type": "MASTER_EMAIL",
							"Value": "bill@example.com"
						},
						{
							"Type": "MASTER_NAME",
							"Value": "Master Account"
						},
						{
							"Type": "ORGANIZATION_FEATURE_SET",
							"Value": "CONSOLIDATED_BILLING"
						}
					]
				},
				{
					"Type": "EMAIL",
					"Value": "anika@example.com"
				},
				{
					"Type": "NOTES",
					"Value": "This is a request for Susan's account to join Bob's organization."
				}
			],
			"RequestedTimestamp": 1.47008383521E9,
			"ExpirationTimestamp": 1.47137983521E9
		}
	}