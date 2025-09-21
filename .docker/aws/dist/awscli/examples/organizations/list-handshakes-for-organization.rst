**To retrieve a list of the handshakes associated with an organization**

The following example shows how to get a list of handshakes that are associated with the current organization: ::

	aws organizations list-handshakes-for-organization 
  
The output shows two handshakes. The first one is an invitation to Juan's account and shows a state of OPEN. The second is an invitation to Anika's account and shows a state of ACCEPTED: ::  

	{
		"Handshakes": [ 
			{
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
					},
					{
						"Type":"NOTES",
						"Value":"This is an invitation to Juan's account to join Bill's organization."
					}
				],
				"State": "OPEN"
			},
			{
				"Action": "INVITE",
				"State":"ACCEPTED",
				"Arn": "arn:aws:organizations::111111111111:handshake/o-exampleorgid/invite/h-examplehandshakeid111",
				"ExpirationTimestamp": 1.471797437427E9,
				"Id": "h-examplehandshakeid222",
				"Parties": [
					{
						"Id": "o-exampleorgid",
						"Type": "ORGANIZATION"
					},
					{
						"Id": "anika@example.com",
						"Type": "EMAIL"
					}
				],
				"RequestedTimestamp": 1.469205437427E9,
				"Resources": [
					{
						"Resources": [
							{
								"Type":"MASTER_EMAIL",
								"Value":"bill@example.com"
							},
							{
								"Type":"MASTER_NAME",
								"Value":"Master Account"
							}
						],
						"Type":"ORGANIZATION",
						"Value":"o-exampleorgid"
					},
					{
						"Type":"EMAIL",
						"Value":"anika@example.com"
					},
					{
						"Type":"NOTES",
						"Value":"This is an invitation to Anika's account to join Bill's organization."
					}
				]
			}
		]
	}