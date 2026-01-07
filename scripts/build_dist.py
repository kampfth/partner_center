import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


INCLUDE = [
    ".htaccess",
    ".gitignore",  # optional but harmless on server; keeps package consistent
    "README.md",
    "app.html",
    "index.html",
    "index.php",
    "vite.svg",
    "assets",
    "backend",
]

EXCLUDE_FILES = {
    ".env",
    "backend/secrets.php",
}

EXCLUDE_DIRS = {
    ".git",
    ".cursor",
    "docs",
    "scripts",
}


def should_exclude(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    if rel in EXCLUDE_FILES:
        return True
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return True
    return False


def copy_any(src: Path, dst: Path) -> None:
    if should_exclude(src):
        return
    if src.is_dir():
        dst.mkdir(parents=True, exist_ok=True)
        for child in src.iterdir():
            copy_any(child, dst / child.name)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    for item in INCLUDE:
        src = ROOT / item
        if not src.exists():
            continue
        copy_any(src, DIST / item)

    # Ensure secrets are not included even if present
    for rel in EXCLUDE_FILES:
        p = DIST / rel
        if p.exists():
            if p.is_dir():
                shutil.rmtree(p)
            else:
                p.unlink()

    print(f"Built dist at: {DIST}")


if __name__ == "__main__":
    main()


