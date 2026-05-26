import urllib.request
import re
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://780725.myshoptet.com"
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

os.makedirs("images", exist_ok=True)

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        
    # 1. Najít Logo
    logo_match = re.search(r'<img[^>]+src="([^"]+)"[^>]+alt="fotofiltry\.cz"', html)
    if not logo_match:
        logo_match = re.search(r'<img[^>]+class="[^"]*logo[^"]*"[^>]+src="([^"]+)"', html)
    if not logo_match:
        logo_match = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html)
        
    logo_url = logo_match.group(1) if logo_match else ""
    print("Nalezený odkaz na logo:", logo_url)
    
    # 2. Najít hlavní banner (slider)
    # Shoptet slider mívá třídu .shoptet-slider nebo image v slideru
    banner_match = re.search(r'<div[^>]+class="[^"]*shoptet-slider[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"', html, re.DOTALL)
    if not banner_match:
        banner_match = re.search(r'<div[^>]+class="[^"]*carousel[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"', html, re.DOTALL)
    if not banner_match:
        banner_match = re.search(r'<img[^>]+class="[^"]*banner[^"]*"[^>]+src="([^"]+)"', html)
        
    banner_url = banner_match.group(1) if banner_match else ""
    print("Nalezený odkaz na banner:", banner_url)
    
    # Stáhnout logo
    if logo_url:
        if logo_url.startswith("//"):
            logo_url = "https:" + logo_url
        ext = logo_url.split(".")[-1].split("?")[0]
        local_logo = f"images/logo.{ext}"
        print(f"Stahuji logo: {logo_url} -> {local_logo}")
        urllib.request.urlretrieve(logo_url, local_logo)
        print("Logo úspěšně staženo.")
        
    # Stáhnout banner
    if banner_url:
        if banner_url.startswith("//"):
            banner_url = "https:" + banner_url
        ext = banner_url.split(".")[-1].split("?")[0]
        local_banner = f"images/banner.{ext}"
        print(f"Stahuji banner: {banner_url} -> {local_banner}")
        urllib.request.urlretrieve(banner_url, local_banner)
        print("Banner úspěšně stažen.")
        
except Exception as e:
    print("Chyba při stahování assetů:", e)
