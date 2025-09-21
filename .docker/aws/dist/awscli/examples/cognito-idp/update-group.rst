**To update a group**

This example updates the description and precedence for MyGroup.

Command::

  aws cognito-idp update-group --user-pool-id us-west-2_aaaaaaaaa --group-name MyGroup --description "New description" --precedence 2

Output::

  {
    "Group": {
        "GroupName": "MyGroup",
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "Description": "New description",
        "RoleArn": "arn:aws:iam::111111111111:role/MyRole",
        "Precedence": 2,
        "LastModifiedDate": 1548800862.812,
        "CreationDate": 1548097827.125
    }
  }