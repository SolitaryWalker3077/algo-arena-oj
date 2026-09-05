"""Gateway integration checks. Uses only a newly created login session for Redis mutations."""
import argparse, base64, getpass, json, socket, urllib.request
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--base-url', default='http://localhost:19090')
p.add_argument('--account', default='Admin@123')
p.add_argument('--password')
p.add_argument('--redis-password')
p.add_argument('--output', default='oj-modules/oj-system/target/gateway-login-results.json')
a = p.parse_args()
a.password = a.password or getpass.getpass('Login password: ')
a.redis_password = a.redis_password or getpass.getpass('Redis password: ')
rows = []
def request(path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token is not None:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(a.base_url + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        text = r.read().decode()
        try: result = json.loads(text)
        except ValueError: result = text
        return r.status, result

def check(name, response, code=None, message=None):
    status, result = response
    ok = status == 200 and (code is None or isinstance(result, dict) and result.get('code') == code)
    if message is not None:
        ok = ok and (result.get('msg') == message if isinstance(result, dict) else result == message)
    safe = {k: v for k, v in result.items() if k != 'data'} if isinstance(result, dict) else result
    rows.append({'case': name, 'pass': ok, 'http': status, 'response': safe})
    assert ok, rows[-1]

sock = socket.create_connection(('localhost', 6379), timeout=5)
f = sock.makefile('rb')
def redis(*args):
    parts = [str(x).encode() if not isinstance(x, bytes) else x for x in args]
    sock.sendall(b'*%d\r\n' % len(parts) + b''.join(b'$%d\r\n' % len(x) + x + b'\r\n' for x in parts))
    line = f.readline()
    if line[:1] == b'-': raise RuntimeError(line.decode())
    if line[:1] == b':': return int(line[1:])
    if line[:1] == b'$':
        n = int(line[1:])
        if n < 0: return None
        data = f.read(n); f.read(2); return data
    return line[1:-2]

key = None
try:
    redis('AUTH', a.redis_password)
    path = '/system/test/testLog'
    check('missing token', request(path), 3001, '\u4ee4\u724c\u4e0d\u80fd\u4e3a\u7a7a')
    check('invalid token', request(path, token='invalid-token'), 3001, '\u4ee4\u724c\u5df2\u8fc7\u671f\u6216\u9a8c\u8bc1\u4e0d\u6b63\u786e\uff01')
    check('unknown account', request('/system/sysuser/login', {'userAccount': 'codex_nonexistent_20260905', 'password': 'invalid'}), 3102)
    check('wrong password', request('/system/sysuser/login', {'userAccount': a.account, 'password': 'codex_intentionally_wrong_20260905'}), 3103)
    login = request('/system/sysuser/login', {'userAccount': a.account, 'password': a.password})
    check('whitelisted login without token', login, 1000)
    token = login[1]['data']
    claims = json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '==='))
    assert claims['userId'] and claims['userKey'], claims
    key = 'logintoken:' + claims['userKey']
    original = redis('GET', key)
    ttl = redis('TTL', key)
    assert 0 < ttl <= 43200, ttl
    check('valid admin token forwarded to system', request(path, token=token), message='\u6211\u662fSystem\u670d\u52a1')
    # Alter only this test's session, then restore it, preserving its expiration.
    ordinary = json.loads(original)
    ordinary['identity'] = 1
    try:
        redis('SET', key, json.dumps(ordinary), 'KEEPTTL')
        check('ordinary identity denied system access', request(path, token=token), 3001, '\u4ee4\u724c\u9a8c\u8bc1\u5931\u8d25')
    finally:
        redis('SET', key, original, 'KEEPTTL')
    check('restored admin identity allowed', request(path, token=token), message='\u6211\u662fSystem\u670d\u52a1')
    redis('PEXPIRE', key, 1)
    import time
    time.sleep(0.05)
    check('expired Redis session denied', request(path, token=token), 3001, '\u767b\u5f55\u72b6\u6001\u5df2\u8fc7\u671f')
    print(json.dumps({'userId': claims['userId'], 'session_ttl_seconds': ttl, 'checks': rows}, ensure_ascii=False, indent=2))
finally:
    if key: redis('DEL', key)
    f.close(); sock.close()
    output = Path(a.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
