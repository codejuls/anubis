import socket
import struct
import urllib.request
import json

def get_default_gateway():
    try:
        with open("/proc/net/route") as fh:
            for line in fh:
                fields = line.strip().split()
                if fields[1] == '00000000':
                    return socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))
    except Exception:
        pass
    return None

gw = get_default_gateway()
print(f"Detected Default Gateway: {gw}")

candidates = [gw, "172.17.0.1", "172.18.0.1", "172.19.0.1", "172.20.0.1", "172.21.0.1", "10.0.2.2", "host.docker.internal", "localhost", "127.0.0.1"]
candidates = [c for c in candidates if c]

ports = [11434, 9001]

for host in candidates:
    for port in ports:
        try:
            s = socket.socket()
            s.settimeout(0.5)
            s.connect((host, port))
            print(f"SUCCESS: Connected to {host}:{port}")
            s.close()
            
            if port == 11434:
                try:
                    url = f"http://{host}:11434/api/tags"
                    req = urllib.request.Request(url)
                    with urllib.request.urlopen(req, timeout=2) as response:
                        data = json.loads(response.read().decode())
                        models = [m["name"] for m in data.get("models", [])]
                        print(f"  Ollama Models available at {host}: {models}")
                except Exception as ex:
                    print(f"  Ollama HTTP info: {ex}")
        except Exception:
            pass
