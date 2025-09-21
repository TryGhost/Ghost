**To create a filter**

The following ``create-filter`` example creates a suppression rule that omits ECR instance type findings. ::

    aws inspector2 create-filter \
        --name "ExampleSuppressionRuleECR" \
        --description "This suppression rule omits ECR instance type findings" \
        --action SUPPRESS \
        --filter-criteria 'resourceType=[{comparison="EQUALS", value="AWS_ECR_INSTANCE"}]'

Output::

    {
        "arn": "arn:aws:inspector2:us-west-2:123456789012:owner/o-EXAMPLE222/filter/EXAMPLE444444444"
    }

For more information, see `Filtering Amazon Inspector findings <https://docs.aws.amazon.com/inspector/latest/user/findings-managing-filtering.html>`__ in the *Amazon Inspector User Guide*.
