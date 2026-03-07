def generate_markdown_report(scan_state) -> str:
    report = f"# SYNOD Vulnerability Report\n\n"
    report += f"## Target: {scan_state.target}\n\n"
    report += f"### Recon Findings\n"
    report += f"- Subdomains: {len(scan_state.findings.get('subdomains', []))}\n"
    report += f"- Open Ports: {len(scan_state.findings.get('open_ports', []))}\n\n"
    report += f"### AI Analysis\n"
    report += f"{scan_state.findings.get('analysis', 'No analysis available.')}\n"
    return report
