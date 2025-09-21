**To decline a handshake sent from another account**

The following example shows that Susan, an admin who is the owner of account 222222222222, declines an invitation to join Bill's organization. The DeclineHandshake operation returns a handshake object, showing that the state is now DECLINED: ::

	aws organizations decline-handshake --handshake-id h-examplehandshakeid111
	
The output includes a handshake object that shows the new state of ``DECLINED``: ::

	{
		"Handshake": {
			"Id": "h-examplehandshakeid111",
			"State": "DECLINED",
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
						}
					]
				},
				{
					"Type": "EMAIL",
					"Value": "susan@example.com"
				},
				{
					"Type": "NOTES",
					"Value": "This is an invitation to Susan's account to join the Bill's organization."
				}
			],
			"Parties": [
				{
					"Type": "EMAIL",
					"Id": "susan@example.com"
				},
				{
					"Type": "ORGANIZATION",
					"Id": "o-exampleorgid"
				}
			],
			"Action": "INVITE",
			"RequestedTimestamp": 1470684478.687,
			"ExpirationTimestamp": 1471980478.687,
			"Arn": "arn:aws:organizations::111111111111:handshake/o-exampleorgid/invite/h-examplehandshakeid111"
		}
	}