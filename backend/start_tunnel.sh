#!/bin/bash
cd /opt/data/anubis/backend
exec /opt/data/anubis/bin/cloudflared tunnel --url http://localhost:8000
