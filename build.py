import os
import shutil
import json

SRC_DIR = "src"
DIST_DIR = "dist"
CONTENT_DIR = "content"
PARTIALS_DIR = os.path.join(SRC_DIR, "partials")
TEMPLATES_DIR = os.path.join(SRC_DIR, "templates")

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def build():
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)

    shutil.copytree(os.path.join(SRC_DIR, "assets"), os.path.join(DIST_DIR, "assets"))

    print("Starter build complete.")

if __name__ == "__main__":
    build()
