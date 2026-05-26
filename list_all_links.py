import urllib.request
import re
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://780725.myshoptet.com"
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        
    links = re.findall(r'href="([^"]+)"', html)
    # Odfiltrovat a vyčistit unikátní odkazy
    unique_links = sorted(list(set(links)))
    
    print("Nalezené odkazy:")
    for link in unique_links:
        if not link.startswith("#") and "javascript" not in link and "css" not in link:
            print(" -", link)
except Exception as e:
    print("Chyba:", e)
