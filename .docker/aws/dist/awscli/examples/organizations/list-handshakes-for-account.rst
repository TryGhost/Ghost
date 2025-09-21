**To retrieve a list of the handshakes sent to an account**

The following example shows how to get a list of all handshakes that are associated with the account of the credentials that were used to call the operation: ::

	aws organizations list-handshakes-for-account 
  
The output includes a list of handshake structures with information about each handshake including its current state: ::

	{
		"Handshake": {
			"Action": "INVITE",
			"Arn": "arn:aws:organizations::111111111111:handshake/o-exampleorgid/invite/h-examplehandshakeid111",
			"ExpirationTimestamp": 1482952459.257,
			"Id": "h-examplehandshakeid111",
			"Parties": [
				{
					"Id": "o-exampleorgid",
					"Type": "ORGANIZATION"
				},
				{
					"Id": "juan@example.com",
					"Type": "EMAIL"
				}
			],
			"RequestedTimestamp": 1481656459.257,
			"Resources": [
				{
					"Resources": [
						{
							"Type": "MASTER_EMAIL",
							"Value": "bill@amazon.com"
						},
						{
							"Type": "MASTER_NAME",
							"Value": "Org Master Account"
						},
						{
							"Type": "ORGANIZATION_FEATURE_SET",
							"Value": "FULL"
						}
					],
					"Type": "ORGANIZATION",
					"Value": "o-exampleorgid"
				},
				{
					"Type": "EMAIL",
					"Value": "juan@example.com"
				}
			],
			"State": "OPEN"
		}
	}