from dotenv import load_dotenv
import os

load_dotenv()

from google import genai

keys = [k.strip() for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k.strip()]

for idx, key in enumerate(keys, 1):
    print(f"\n=== Key {idx}: {key[:12]}... ===")
    try:
        client = genai.Client(api_key=key)
        models = client.models.list()
        for m in models:
            print(m.name)
    except Exception as e:
        print(f"Error: {e}")
