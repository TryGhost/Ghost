**To test triggers in a repository**

This example demonstrates how to test a trigger named 'MyFirstTrigger' in an AWS CodeCommit repository named MyDemoRepo. In this example, events in the repository trigger notifications
from an Amazon Simple Notification Service (Amazon SNS) topic.


Command::

  aws codecommit test-repository-triggers --repository-name MyDemoRepo --triggers name=MyFirstTrigger,destinationArn=arn:aws:sns:us-east-1:111111111111:MyCodeCommitTopic,branches=mainline,preprod,events=all

Output::

  {
    "successfulExecutions": [
        "MyFirstTrigger"
    ],
    "failedExecutions": []
  }