import urllib.request
import re
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

BASE_URL = "https://780725.myshoptet.com"
PAGES = ["/o-nas/", "/kontakty/"]
headers = {'User-Agent': 'Mozilla/5.0'}

for page in PAGES:
    url = BASE_URL + page
    print(f"\n--- Obsah stránky {url} ---")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        # Zkusit najít hlavní obsah v #content nebo .content-inner
        content_match = re.search(r'<div[^>]+id="content"[^>]*>(.*?)</div>\s*<!-- / #content -->', html, re.DOTALL)
        if not content_match:
            content_match = re.search(r'<div[^>]+class="[^"]*content-inner[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
            
        if content_match:
            text = content_match.group(1)
            # Vyčistit HTML značky pro náhled
            clean_text = re.sub(r'<[^<]+?>', '', text)
            # Vyčistit prázdné řádky
            lines = [line.strip() for line in clean_text.split('\n') if line.strip()]
            print("\n".join(lines[:20]))
        else:
            print("Hlavní obsah nenalezen.")
    except Exception as e:
        print("Chyba:", e)
