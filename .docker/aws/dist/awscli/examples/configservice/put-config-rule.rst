**To add an AWS managed Config rule**

The following command provides JSON code to add an AWS managed Config rule::

    aws configservice put-config-rule --config-rule file://RequiredTagsForEC2Instances.json

``RequiredTagsForEC2Instances.json`` is a JSON file that contains the rule configuration::

    {
      "ConfigRuleName": "RequiredTagsForEC2Instances",
      "Description": "Checks whether the CostCenter and Owner tags are applied to EC2 instances.",
      "Scope": {
        "ComplianceResourceTypes": [
          "AWS::EC2::Instance"
        ]
      },
      "Source": {
        "Owner": "AWS",
        "SourceIdentifier": "REQUIRED_TAGS"
      },
      "InputParameters": "{\"tag1Key\":\"CostCenter\",\"tag2Key\":\"Owner\"}"
    }

For the ``ComplianceResourceTypes`` attribute, this JSON code limits the scope to resources of the ``AWS::EC2::Instance`` type, so AWS Config will evaluate only EC2 instances against the rule. Because the rule is a managed rule, the ``Owner`` attribute is set to ``AWS``, and the ``SourceIdentifier`` attribute is set to the rule identifier, ``REQUIRED_TAGS``. For the ``InputParameters`` attribute, the tag keys that the rule requires, ``CostCenter`` and ``Owner``, are specified.

If the command succeeds, AWS Config returns no output. To verify the rule configuration, run the `describe-config-rules`__ command, and specify the rule name.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/describe-config-rules.html

**To add a customer managed Config rule**

The following command provides JSON code to add a customer managed Config rule::

    aws configservice put-config-rule --config-rule file://InstanceTypesAreT2micro.json

``InstanceTypesAreT2micro.json`` is a JSON file that contains the rule configuration::

    {
      "ConfigRuleName": "InstanceTypesAreT2micro",
      "Description": "Evaluates whether EC2 instances are the t2.micro type.",
      "Scope": {
        "ComplianceResourceTypes": [
          "AWS::EC2::Instance"
        ]
      },
      "Source": {
        "Owner": "CUSTOM_LAMBDA",
        "SourceIdentifier": "arn:aws:lambda:us-east-1:123456789012:function:InstanceTypeCheck",
        "SourceDetails": [
          {
            "EventSource": "aws.config",
            "MessageType": "ConfigurationItemChangeNotification"
          }
        ]
      },
      "InputParameters": "{\"desiredInstanceType\":\"t2.micro\"}"
    }

For the ``ComplianceResourceTypes`` attribute, this JSON code limits the scope to resources of the ``AWS::EC2::Instance`` type, so AWS Config will evaluate only EC2 instances against the rule. Because this rule is a customer managed rule, the ``Owner`` attribute is set to ``CUSTOM_LAMBDA``, and the ``SourceIdentifier`` attribute is set to the ARN of the AWS Lambda function. The ``SourceDetails`` object is required. The parameters that are specified for the ``InputParameters`` attribute are passed to the AWS Lambda function when AWS Config invokes it to evaluate resources against the rule.

If the command succeeds, AWS Config returns no output. To verify the rule configuration, run the `describe-config-rules`__ command, and specify the rule name.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/describe-config-rules.html

