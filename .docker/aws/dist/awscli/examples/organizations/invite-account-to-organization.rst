**To invite an account to join an organization**

The following example shows the master account owned by bill@example.com inviting the account owned by juan@example.com to join an organization: ::

	aws organizations invite-account-to-organization --target '{"Type": "EMAIL", "Id": "juan@example.com"}' --notes "This is a request for Juan's account to join Bill's organization."
  
The output includes a handshake structure that shows what is sent to the invited account: ::
  
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