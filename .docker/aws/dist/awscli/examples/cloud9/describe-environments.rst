**To get information about AWS Cloud9 development environments**

This example gets information about the specified AWS Cloud9 development environments.

Command::

  aws cloud9 describe-environments --environment-ids 685f892f431b45c2b28cb69eadcdb0EX 349c86d4579e4e7298d500ff57a6b2EX

Output::

  {
    "environments": [
      {
        "id": "685f892f431b45c2b28cb69eadcdb0EX",
        "name": "my-demo-ec2-env",
        "description": "Created from CodeStar.",
        "type": "ec2",
        "arn": "arn:aws:cloud9:us-east-1:123456789012:environment:685f892f431b45c2b28cb69eadcdb0EX",
        "ownerArn": "arn:aws:iam::123456789012:user/MyDemoUser",
        "lifecycle": {
          "status": "CREATED"
        }
      },
      {
        "id": "349c86d4579e4e7298d500ff57a6b2EX",
        "name": my-demo-ssh-env",
        "description": "",
        "type": "ssh",
        "arn": "arn:aws:cloud9:us-east-1:123456789012:environment:349c86d4579e4e7298d500ff57a6b2EX",
        "ownerArn": "arn:aws:iam::123456789012:user/MyDemoUser",
        "lifecycle": {
          "status": "CREATED"
        }
      }
    ]
  }