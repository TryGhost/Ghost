**To create a group**

This example creates a group with a description. 

Command::

  aws cognito-idp create-group --user-pool-id us-west-2_aaaaaaaaa --group-name MyNewGroup --description "New group."

Output::

  {
    "Group": {
        "GroupName": "MyNewGroup",
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "Description": "New group.",
        "LastModifiedDate": 1548270073.795,
        "CreationDate": 1548270073.795
    }
  }
  
**To create a group with a role and precedence**

This example creates a group with a description. It also includes a role and precedence. 

Command::

  aws cognito-idp create-group --user-pool-id us-west-2_aaaaaaaaa --group-name MyNewGroupWithRole --description "New group with a role." --role-arn arn:aws:iam::111111111111:role/MyNewGroupRole --precedence 2

Output::

  {
    "Group": {
        "GroupName": "MyNewGroupWithRole",
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "Description": "New group with a role.",
        "RoleArn": "arn:aws:iam::111111111111:role/MyNewGroupRole",
        "Precedence": 2,
        "LastModifiedDate": 1548270211.761,
        "CreationDate": 1548270211.761
    }
  }