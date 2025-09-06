#!/usr/bin/env python3
import http.server
import ssl
import socket
import os

# 자체 서명 인증서 생성
def create_self_signed_cert():
    from datetime import datetime, timedelta
    import subprocess
    
    cert_file = 'cert.pem'
    key_file = 'key.pem'
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("자체 서명 SSL 인증서 생성 중...")
        cmd = [
            'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
            '-keyout', key_file, '-out', cert_file,
            '-days', '365', '-nodes',
            '-subj', '/CN=localhost'
        ]
        subprocess.run(cmd, check=True)
        print("SSL 인증서 생성 완료!")
    
    return cert_file, key_file

def get_local_ip():
    """로컬 네트워크 IP 주소 가져오기"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

# HTTPS 서버 설정
class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS 헤더 추가 (모바일 접근 허용)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # 카메라 권한을 위한 Feature Policy 헤더
        self.send_header('Permissions-Policy', 'camera=(*)')
        super().end_headers()

def run_https_server(port=8443):
    cert_file, key_file = create_self_signed_cert()
    
    # HTTPS 서버 생성
    httpd = http.server.HTTPServer(('0.0.0.0', port), MyHTTPRequestHandler)
    
    # SSL 컨텍스트 설정
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    local_ip = get_local_ip()
    
    print("\n" + "="*50)
    print("🔒 HTTPS 서버가 실행중입니다!")
    print("="*50)
    print(f"\n📱 모바일에서 접속하세요:")
    print(f"   https://{local_ip}:{port}")
    print(f"\n💻 컴퓨터에서 접속:")
    print(f"   https://localhost:{port}")
    print("\n⚠️  주의사항:")
    print("   1. 브라우저에서 '안전하지 않음' 경고가 나타나면")
    print("      '고급' → '계속 진행'을 클릭하세요")
    print("   2. 모바일 Chrome/Safari에서 카메라 권한을 허용하세요")
    print("\n종료하려면 Ctrl+C를 누르세요")
    print("="*50 + "\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다...")
        httpd.shutdown()

if __name__ == '__main__':
    run_https_server()