import re

def sanitize_input(input_string: str) -> str:
    # Basic sanitization to prevent command injection
    if not input_string:
        return ""
    # Allow alphanumeric, dot, hyphen, underscore
    return re.sub(r'[^a-zA-Z0-9.\-_]', '', input_string)
