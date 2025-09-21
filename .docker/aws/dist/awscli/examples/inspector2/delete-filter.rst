**To delete a filter**

The following ``delete-filter`` example deletes a filter. ::

    aws inspector2 delete-filter \
        --arn "arn:aws:inspector2:us-west-2:123456789012:owner/o-EXAMPLE222/filter/EXAMPLE444444444"

Output::

    {
        "arn": "arn:aws:inspector2:us-west-2:123456789012:owner/o-EXAMPLE222/filter/EXAMPLE444444444"
    }

For more information, see `Filtering Amazon Inspector findings <https://docs.aws.amazon.com/inspector/latest/user/findings-managing-filtering.html>`__ in the *Amazon Inspector User Guide*.
