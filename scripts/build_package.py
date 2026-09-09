#!/usr/bin/env python3
"""Validate Ozwell's package and produce a portable distribution ZIP."""

import json
from pathlib import Path
import struct
import zipfile


def main():
    root = Path(__file__).resolve().parents[1]
    manifest_path = root / "ozwell" / "pet.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("displayName") != "Ozwell":
        raise ValueError("The pet display name must be Ozwell")
    if manifest.get("spriteVersionNumber") != 2:
        raise ValueError("The sprite version must be 2")
    if manifest.get("spritesheetPath") != "spritesheet.png":
        raise ValueError("Expected spritesheet.png beside pet.json")

    sprite_path = manifest_path.parent / "spritesheet.png"
    data = sprite_path.read_bytes()
    if len(data) < 33 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("The sprite sheet must be a PNG")
    width, height, bit_depth, color_type = struct.unpack(">IIBB", data[16:26])
    if (width, height, bit_depth, color_type) != (1536, 2288, 8, 6):
        raise ValueError("Expected a 1536 x 2288, 8-bit RGBA sprite sheet")

    output = root / "dist" / "ozwell-company.zip"
    output.parent.mkdir(exist_ok=True)
    files = [
        root / "README.md",
        manifest_path,
        sprite_path,
        root / "preview" / "ozwell.png",
        root / "preview" / "ozwell.gif",
    ]
    for path in files:
        if not path.is_file():
            raise FileNotFoundError(path)

    # Stable timestamps and permissions keep repeated builds reproducible.
    with zipfile.ZipFile(output, "w") as archive:
        for path in files:
            entry = zipfile.ZipInfo(path.relative_to(root).as_posix())
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, path.read_bytes())

    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError("ZIP integrity check failed")
    print(f"Built {output} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
