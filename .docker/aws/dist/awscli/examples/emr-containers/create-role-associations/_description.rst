Creates role associations of given IAM role with EMR service accounts such that it can be used with Amazon EMR on EKS with the given namespace from the given EKS cluster.

Note:
The command would associate EMR service accounts with provided IAM role to EKS pod identity:

* "emr-containers-sa-%(FRAMEWORK)s-%(COMPONENT)s-%(AWS_ACCOUNT_ID)s-%(BASE36_ENCODED_ROLE_NAME)s"

Here::

    <FRAMEWORK> = EMR on EKS framework such as spark, flink, livy
    <COMPONENT> = Task component for the framework. Such as client, driver, executor for spark; flink-operator, jobmanager, taskmanager for flink.
    <AWS_ACCOUNT_ID> = AWS Account ID of the EKS cluster
    <BASE36_ENCODED_ROLE_NAME> = Base36 encoded form of the IAM Role name

You can use the **--type** option to select which submission model to associate.

You can use the **--operator-namespace** option if your operator/livy jobs are running in a different operator namespace other than your job/application namespace. **--namespace** should be the Job/Application Namespace, and this option is for operator namespace to associate operator/livy service account.

You can use the **--service-account-name** option to associate a custom service account with the role.
