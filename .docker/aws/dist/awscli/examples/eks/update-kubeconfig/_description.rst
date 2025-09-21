Configures kubectl so that you can connect to an Amazon EKS cluster.

Note:
 To use the resulting configuration, you must have kubectl installed and in your PATH environment variable.

This command constructs a configuration with prepopulated server and certificate authority data values for a specified cluster. 
You can specify an IAM role ARN with the ``--role-arn`` option to use for authentication when you issue kubectl commands. 
Otherwise, the IAM entity in your default AWS CLI or SDK credential chain is used. 
You can view your default AWS CLI or SDK identity by running the ``aws sts get-caller-identity`` command.

The resulting kubeconfig is created as a new file or merged with an existing kubeconfig file using the following logic:

* If you specify a path with the ``--kubeconfig option``, then the resulting configuration file is created there or merged with an existing kubeconfig at that location.
* Or, if you have the ``KUBECONFIG`` environment variable set, then the resulting configuration file is created at the first entry in that variable or merged with an existing kubeconfig at that location. 
* Otherwise, by default, the resulting configuration file is created at the default kubeconfig path (``.kube/config``) in your home directory or merged with an existing kubeconfig at that location.
* If a previous cluster configuration exists for an Amazon EKS cluster with the same name at the specified path, the existing configuration is overwritten with the new configuration.
* When update-kubeconfig writes a configuration to a kubeconfig file, the current-context of the kubeconfig file is set to that configuration.

You can use the ``--dry-run`` option to print the resulting configuration to stdout instead of writing it to the specified location.
