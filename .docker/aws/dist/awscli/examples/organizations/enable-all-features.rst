**To enable all features in an organization**

This example shows the administrator asking all the invited accounts in the organization to approve enabled all features in the organization. AWS Organizations sends an email to the address that is registered with every invited member account asking the owner to approve the change to all features by accepting the handshake that is sent. After all invited member accounts accept the handshake, the organization administrator can finalize the change to all features, and those with appropriate permissions can create policies and apply them to roots, OUs, and accounts: ::

	aws organizations enable-all-features
	
The output is a handshake object that is sent to all invited member accounts for approval: ::

	{
		"Handshake": {
			"Action": "ENABLE_ALL_FEATURES",
			"Arn":"arn:aws:organizations::111111111111:handshake/o-exampleorgid/enable_all_features/h-examplehandshakeid111",
			"ExpirationTimestamp":1.483127868609E9,
			"Id":"h-examplehandshakeid111",
			"Parties": [
				{
					"id":"o-exampleorgid",
					"type":"ORGANIZATION"
				}
			],
			"requestedTimestamp":1.481831868609E9,
			"resources": [
				{
					"type":"ORGANIZATION",
					"value":"o-exampleorgid"
				}
			],
			"state":"REQUESTED"
		}
	}