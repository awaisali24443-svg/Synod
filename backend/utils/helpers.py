import re

def sanitize_input(input_str: str) -> str:
    if not input_str:
        return ""
    return re.sub(r'[^a-zA-Z0-9.\-_]', '', input_str)
