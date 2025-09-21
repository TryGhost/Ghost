**To delete a path**

The following ``delete-network-insights-path`` example deletes the specified path. Before you can delete a path, you must delete all its analyses using the ``delete-network-insights-analysis`` command. ::

    aws ec2 delete-network-insights-path \
        --network-insights-path-id nip-0b26f224f1d131fa8

Output::

    {
        "NetworkInsightsPathId": "nip-0b26f224f1d131fa8"
    }

For more information, see `Getting started using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html>`__ in the *Reachability Analyzer Guide*.