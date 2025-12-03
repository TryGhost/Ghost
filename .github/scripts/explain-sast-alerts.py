#!/usr/bin/env python3
"""
Script to fetch SAST alerts and explain them using an LLM.

This script:
1. Fetches security alerts from GitHub Security API (CodeQL or Semgrep)
2. Uses OpenAI API to explain each alert in simple terms
3. Generates a markdown report with explanations and recommendations
"""

import argparse
import json
import os
import sys
from typing import List, Dict, Any
import requests
import openai
from datetime import datetime

# GitHub API base URL
GITHUB_API_BASE = "https://api.github.com"

def get_github_headers() -> Dict[str, str]:
    """Get GitHub API headers with authentication."""
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError("GITHUB_TOKEN environment variable is required")
    
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

def fetch_codeql_alerts(repo: str, pr_number: int) -> List[Dict[str, Any]]:
    """Fetch CodeQL alerts for a pull request."""
    headers = get_github_headers()
    owner, repo_name = repo.split("/")
    
    # Get alerts from the PR's head branch
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo_name}/code-scanning/alerts"
    
    # Get PR details to find the head branch
    pr_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo_name}/pulls/{pr_number}"
    pr_response = requests.get(pr_url, headers=headers)
    pr_response.raise_for_status()
    pr_data = pr_response.json()
    head_ref = pr_data["head"]["ref"]
    
    # Fetch alerts for the head branch
    params = {
        "ref": f"refs/heads/{head_ref}",
        "tool_name": "CodeQL",
        "state": "open"
    }
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    
    alerts = response.json()
    return alerts

def fetch_semgrep_alerts(repo: str, pr_number: int) -> List[Dict[str, Any]]:
    """Fetch Semgrep alerts for a pull request."""
    headers = get_github_headers()
    owner, repo_name = repo.split("/")
    
    # Get alerts from the PR's head branch
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo_name}/code-scanning/alerts"
    
    # Get PR details to find the head branch
    pr_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo_name}/pulls/{pr_number}"
    pr_response = requests.get(pr_url, headers=headers)
    pr_response.raise_for_status()
    pr_data = pr_response.json()
    head_ref = pr_data["head"]["ref"]
    
    # Fetch alerts for the head branch
    params = {
        "ref": f"refs/heads/{head_ref}",
        "tool_name": "Semgrep",
        "state": "open"
    }
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    
    alerts = response.json()
    return alerts

def explain_alert_with_llm(alert: Dict[str, Any], tool: str) -> str:
    """Use OpenAI to explain a security alert."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        # Fallback: return a basic explanation without LLM
        return generate_basic_explanation(alert, tool)
    
    openai.api_key = api_key
    
    # Prepare alert information
    rule_id = alert.get("rule", {}).get("id", "unknown")
    rule_name = alert.get("rule", {}).get("name", "Unknown Rule")
    severity = alert.get("rule", {}).get("severity", "unknown")
    message = alert.get("message", {}).get("text", "No message available")
    location = alert.get("location", {})
    file_path = location.get("path", "unknown")
    start_line = location.get("start_line", 0)
    
    prompt = f"""You are a security expert explaining code security alerts to developers.

Alert Details:
- Tool: {tool}
- Rule ID: {rule_id}
- Rule Name: {rule_name}
- Severity: {severity}
- File: {file_path}
- Line: {start_line}
- Message: {message}

Please provide:
1. A clear, simple explanation of what this alert means
2. Why it's a security concern
3. How to fix it (with code examples if applicable)
4. Best practices to prevent similar issues

Keep the explanation concise but informative. Use markdown formatting."""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful security expert explaining code vulnerabilities to developers."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        explanation = response.choices[0].message.content
        return explanation
    except Exception as e:
        print(f"Error calling OpenAI API: {e}", file=sys.stderr)
        return generate_basic_explanation(alert, tool)

def generate_basic_explanation(alert: Dict[str, Any], tool: str) -> str:
    """Generate a basic explanation without LLM."""
    rule_id = alert.get("rule", {}).get("id", "unknown")
    rule_name = alert.get("rule", {}).get("name", "Unknown Rule")
    severity = alert.get("rule", {}).get("severity", "unknown")
    message = alert.get("message", {}).get("text", "No message available")
    
    return f"""**Rule:** {rule_name} ({rule_id})
**Severity:** {severity}
**Message:** {message}

*Note: For detailed explanation, configure OPENAI_API_KEY secret.*"""

def generate_markdown_report(alerts: List[Dict[str, Any]], tool: str, repo: str, pr_number: int) -> str:
    """Generate a markdown report with all alerts and explanations."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    report = f"""# 🔒 SAST Analysis Report - {tool}

**Repository:** {repo}  
**Pull Request:** #{pr_number}  
**Generated:** {timestamp}  
**Total Alerts:** {len(alerts)}

---

"""
    
    if not alerts:
        report += "✅ **No security alerts found!**\n"
        return report
    
    # Group alerts by severity
    by_severity = {}
    for alert in alerts:
        severity = alert.get("rule", {}).get("severity", "unknown")
        if severity not in by_severity:
            by_severity[severity] = []
        by_severity[severity].append(alert)
    
    # Sort severities: error > warning > note
    severity_order = {"error": 0, "warning": 1, "note": 2}
    sorted_severities = sorted(by_severity.keys(), key=lambda x: severity_order.get(x, 99))
    
    for severity in sorted_severities:
        severity_alerts = by_severity[severity]
        severity_emoji = {"error": "🔴", "warning": "🟡", "note": "🔵"}.get(severity, "⚪")
        
        report += f"\n## {severity_emoji} {severity.upper()} ({len(severity_alerts)} alerts)\n\n"
        
        for idx, alert in enumerate(severity_alerts, 1):
            rule_id = alert.get("rule", {}).get("id", "unknown")
            rule_name = alert.get("rule", {}).get("name", "Unknown Rule")
            location = alert.get("location", {})
            file_path = location.get("path", "unknown")
            start_line = location.get("start_line", 0)
            end_line = location.get("end_line", start_line)
            
            report += f"### Alert #{idx}: {rule_name}\n\n"
            report += f"**Location:** `{file_path}:{start_line}`\n\n"
            
            if start_line != end_line:
                report += f"**Lines:** {start_line}-{end_line}\n\n"
            
            # Get explanation
            explanation = explain_alert_with_llm(alert, tool)
            report += f"{explanation}\n\n"
            
            # Add link to alert
            html_url = alert.get("html_url", "")
            if html_url:
                report += f"[View in GitHub Security]({html_url})\n\n"
            
            report += "---\n\n"
    
    report += f"""
## 📊 Summary

- **Total Alerts:** {len(alerts)}
- **By Severity:**
"""
    
    for severity in sorted_severities:
        count = len(by_severity[severity])
        report += f"  - {severity.upper()}: {count}\n"
    
    report += f"""
---

*This report was automatically generated by the SAST analysis workflow.*
*For questions or issues, please contact the security team.*
"""
    
    return report

def main():
    parser = argparse.ArgumentParser(description="Explain SAST alerts using LLM")
    parser.add_argument("--tool", choices=["codeql", "semgrep"], required=True, help="SAST tool name")
    parser.add_argument("--repo", required=True, help="Repository in format owner/repo")
    parser.add_argument("--pr", type=int, required=True, help="Pull request number")
    parser.add_argument("--output", default=".github/sast-explanations.md", help="Output file path")
    
    args = parser.parse_args()
    
    try:
        # Fetch alerts
        print(f"Fetching {args.tool} alerts for PR #{args.pr}...")
        if args.tool == "codeql":
            alerts = fetch_codeql_alerts(args.repo, args.pr)
        else:
            alerts = fetch_semgrep_alerts(args.repo, args.pr)
        
        print(f"Found {len(alerts)} alerts")
        
        # Generate report
        print("Generating markdown report...")
        report = generate_markdown_report(alerts, args.tool, args.repo, args.pr)
        
        # Write to file
        os.makedirs(os.path.dirname(args.output), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        
        print(f"Report written to {args.output}")
        
        # Also print summary to stdout
        print(f"\nSummary: {len(alerts)} alerts found")
        if alerts:
            by_severity = {}
            for alert in alerts:
                severity = alert.get("rule", {}).get("severity", "unknown")
                by_severity[severity] = by_severity.get(severity, 0) + 1
            
            for severity, count in sorted(by_severity.items()):
                print(f"  - {severity}: {count}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

