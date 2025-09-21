**To describe rules packages**

The following ``describe-rules-packages`` command describes the rules package with the ARN of ``arn:aws:inspector:us-west-2:758058086616:rulespackage/0-9hgA516p``::

  aws inspector describe-rules-packages --rules-package-arns arn:aws:inspector:us-west-2:758058086616:rulespackage/0-9hgA516p

Output::

   {
	 "failedItems": {},
	 "rulesPackages": [
	   {
		 "arn": "arn:aws:inspector:us-west-2:758058086616:rulespackage/0-9hgA516p",
		 "description": "The rules in this package help verify whether the EC2 instances in your application are exposed to Common Vulnerabilities and 
		 Exposures (CVEs). Attacks can exploit unpatched vulnerabilities to compromise the confidentiality, integrity, or availability of your service 
		 or data. The CVE system provides a reference for publicly known information security vulnerabilities and exposures. For more information, see 
		 [https://cve.mitre.org/](https://cve.mitre.org/). If a particular CVE appears in one of the produced Findings at the end of a completed 
		 Inspector assessment, you can search [https://cve.mitre.org/](https://cve.mitre.org/) using the CVE's ID (for example, \"CVE-2009-0021\") to 
		 find detailed information about this CVE, its severity, and how to mitigate it. ",
		 "name": "Common Vulnerabilities and Exposures",
		 "provider": "Amazon Web Services, Inc.",
		 "version": "1.1"
	   }
	 ]
   } 

For more information, see `Amazon Inspector Rules Packages and Rules`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Rules Packages and Rules`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_rule-packages.html

