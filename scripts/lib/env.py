"""Loads .env and ~/.agents/.env into os.environ. Existing os.environ values win.
Import this module once at the top of any script that needs API keys."""

import os
import re
from pathlib import Path

ENV_PATHS = [Path.cwd() / ".env", Path.home() / ".agents" / ".env"]

_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _parse_env(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not _KEY.match(key):
            continue
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        out[key] = value
    return out


for env_path in ENV_PATHS:
    if env_path.exists():
        for k, v in _parse_env(env_path.read_text(encoding="utf-8")).items():
            os.environ.setdefault(k, v)


def require(key: str) -> str:
    v = os.environ.get(key)
    if not v:
        raise RuntimeError(
            f"{key} is not set. Add it to .env, ~/.agents/.env, or export it before running."
        )
    return v


def n8n_api_url() -> str:
    return require("N8N_API_URL").rstrip("/")


def n8n_api_v1_url() -> str:
    base = n8n_api_url()
    return base if base.endswith("/api/v1") else f"{base}/api/v1"
