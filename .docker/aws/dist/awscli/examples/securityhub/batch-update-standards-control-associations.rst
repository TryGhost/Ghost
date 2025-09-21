**To update the enablement status of a control in enabled standards**

The following ``batch-update-standards-control-associations`` example disables CloudTrail.1 in the specified standards. ::

    aws securityhub batch-update-standards-control-associations \
        --standards-control-association-updates '[{"SecurityControlId": "CloudTrail.1", "StandardsArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0", "AssociationStatus": "DISABLED", "UpdatedReason": "Not applicable to environment"}, {"SecurityControlId": "CloudTrail.1", "StandardsArn": "arn:aws:securityhub:::standards/cis-aws-foundations-benchmark/v/1.4.0", "AssociationStatus": "DISABLED", "UpdatedReason": "Not applicable to environment"}]'

This command produces no output when successful.

For more information, see `Enabling and disabling controls in specific standards <https://docs.aws.amazon.com/securityhub/latest/userguide/controls-configure.html>`__ and `Enabling and disabling controls in all standards <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-enable-disable-controls.html>`__ in the *AWS Security Hub User Guide*.