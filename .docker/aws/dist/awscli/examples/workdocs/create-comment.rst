**To add a new comment**

This example adds a new comment to the specified document version.

Command::

  aws workdocs create-comment --document-id 15df51e0335cfcc6a2e4de9dd8be9f22ee40545ad9176f54758dcf903be982d3 --version-id 1521672507741-9f7df0ea5dd0b121c4f3564a0c7c0b4da95cd12c635d3c442af337a88e297920 --text "This is a comment."

Output::

  {
    "Comment": {
        "CommentId": "1534799058197-c7f5c84de9115875bbca93e0367bbebac609541d461636b760849b88b1609dd5",
        "ThreadId": "1534799058197-c7f5c84de9115875bbca93e0367bbebac609541d461636b760849b88b1609dd5",
        "Text": "This is a comment.",
        "Contributor": {
            "Id": "arn:aws:iam::123456789123:user/exampleUser",
            "Username": "exampleUser",
            "GivenName": "Example",
            "Surname": "User",
            "Status": "ACTIVE"
        },
        "CreatedTimestamp": 1534799058.197,
        "Status": "PUBLISHED",
        "Visibility": "PUBLIC"
    }
  }