import traceback

def print_string_details(s, name="String"):
    print(f"{name}: {repr(s)}")
    print(f"Type: {type(s)}")
    print(f"Length: {len(s)}")
    for i, char in enumerate(s):
        code_point = ord(char)
        if code_point > 127:  # Non-ASCII
            print(f"Position {i}: '{char}' (U+{code_point:04X})")

def execute_with_tracing():
    try:
        # Пытаемся выполнить код, который вызывает ошибку
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.header import Header
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = Header('Test Email Plain ASCII', 'ascii')
        msg['From'] = Header('test@example.com', 'ascii')
        msg['To'] = Header('test@example.com', 'ascii')
        
        text = "This is a test email with ASCII characters only."
        part = MIMEText(text, 'plain', 'ascii')
        msg.attach(part)
        
        # Трассировка перед вызовом sendmail
        print("Message as string:")
        msg_str = msg.as_string()
        print_string_details(msg_str, "Message string")
        
        # Проверим наличие символа em dash (U+2014) в окружении
        import os
        for key, value in os.environ.items():
            if '\u2014' in value:
                print(f"Found U+2014 in environment variable: {key}")
                print_string_details(value, f"Env var {key}")
        
    except Exception as e:
        print(f"Exception: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    execute_with_tracing()