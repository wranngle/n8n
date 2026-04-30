"""Loads ~/.agents/.env into os.environ. Existing os.environ values win.
Import this module once at the top of any script that needs API keys."""

import os
import re
from pathlib import Path

ENV_PATH = Path.home() / ".agents" / ".env"

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


if ENV_PATH.exists():
    for k, v in _parse_env(ENV_PATH.read_text(encoding="utf-8")).items():
        os.environ.setdefault(k, v)


def require(key: str) -> str:
    v = os.environ.get(key)
    if not v:
        raise RuntimeError(
            f"{key} is not set. Add it to {ENV_PATH} or export it before running."
        )
    return v
