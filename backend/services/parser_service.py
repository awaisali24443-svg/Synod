import re

class ParserService:
    def parse_subfinder(self, raw_output: str) -> list:
        domains = []
        for line in raw_output.split('\n'):
            line = line.strip()
            if line and not line.startswith('['):
                domains.append(line)
        return domains

    def parse_httpx(self, raw_output: str) -> list:
        urls = []
        for line in raw_output.split('\n'):
            match = re.search(r'(https?://[^\s]+)', line)
            if match:
                urls.append(match.group(1))
        return urls

parser_service = ParserService()
