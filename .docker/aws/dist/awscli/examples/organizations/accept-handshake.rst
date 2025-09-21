**To accept a handshake from another account**

Bill, the owner of an organization, has previously invited Juan's account to join his organization. The following example shows Juan's account accepting the handshake and thus agreeing to the invitation. ::

	aws organizations accept-handshake --handshake-id h-examplehandshakeid111

The output shows the following: ::

	{
		"Handshake": {
			"Action": "INVITE",
			"Arn": "arn:aws:organizations::111111111111:handshake/o-exampleorgid/invite/h-examplehandshakeid111",
			"RequestedTimestamp": 1481656459.257,
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
							"Value": "ALL"
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
			"State": "ACCEPTED"
		}
	}