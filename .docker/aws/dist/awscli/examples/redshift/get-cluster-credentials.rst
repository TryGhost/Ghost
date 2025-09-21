**To get cluster credentials for an AWS account**

The following ``get-cluster-credentials`` example retrieves temporary credentials that enable access to an Amazon Redshift database. ::

    aws redshift get-cluster-credentials \
        --db-user adminuser --db-name dev \
        --cluster-identifier mycluster

Output::

    {
        "DbUser": "IAM:adminuser",
        "DbPassword": "AMAFUyyuros/QjxPTtgzcsuQsqzIasdzJEN04aCtWDzXx1O9d6UmpkBtvEeqFly/EXAMPLE==",
        "Expiration": "2019-12-10T17:25:05.770Z"
    }

For more information, see `Generating IAM Database Credentials Using the Amazon Redshift CLI or API <https://docs.aws.amazon.com/redshift/latest/mgmt/generating-iam-credentials-cli-api.html>`__ in the *Amazon Redshift Cluster Management Guide*.
