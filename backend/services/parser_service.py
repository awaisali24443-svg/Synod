def parse_subfinder(output: str) -> list:
    return [line.strip() for line in output.split('\n') if line.strip()]

def parse_httpx(output: str) -> list:
    results = []
    for line in output.split('\n'):
        if line.strip():
            parts = line.split()
            if len(parts) > 0:
                results.append({"url": parts[0], "status": parts[1] if len(parts) > 1 else "unknown"})
    return results

def parse_nmap(output: str) -> list:
    ports = []
    for line in output.split('\n'):
        if "open" in line:
            ports.append(line.strip())
    return ports
