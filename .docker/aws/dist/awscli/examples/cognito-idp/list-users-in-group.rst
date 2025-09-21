**To list users in a group**

This example lists users in group MyGroup.   

Command::

  aws cognito-idp list-users-in-group --user-pool-id us-west-2_aaaaaaaaa --group-name MyGroup

Output::

  {
    "Users": [
        {
            "Username": "acf10624-80bb-401a-ac61-607bee2110ec",
            "Attributes": [
                {
                    "Name": "sub",
                    "Value": "acf10624-80bb-401a-ac61-607bee2110ec"
                },
                {
                    "Name": "custom:CustomAttr1",
                    "Value": "New Value!"
                },
                {
                    "Name": "email",
                    "Value": "jane@example.com"
                }
            ],
            "UserCreateDate": 1548102770.284,
            "UserLastModifiedDate": 1548103204.893,
            "Enabled": true,
            "UserStatus": "CONFIRMED"
        },
        {
            "Username": "22704aa3-fc10-479a-97eb-2af5806bd327",
            "Attributes": [
                {
                    "Name": "sub",
                    "Value": "22704aa3-fc10-479a-97eb-2af5806bd327"
                },
                {
                    "Name": "email_verified",
                    "Value": "true"
                },
                {
                    "Name": "email",
                    "Value": "diego@example.com"
                }
            ],
            "UserCreateDate": 1548089817.683,
            "UserLastModifiedDate": 1548089817.683,
            "Enabled": true,
            "UserStatus": "FORCE_CHANGE_PASSWORD"
        }    
    ]
  }
