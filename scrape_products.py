import os
import urllib.request
import re
import json
import ssl

# Ignorovat SSL certifikáty pro jistotu
ssl._create_default_https_context = ssl._create_unverified_context

BASE_URL = "https://780725.myshoptet.com"
CATEGORIES = ["prism", "fog-2", "halo-2", "star"]

# Vytvořit složku pro obrázky
os.makedirs("images", exist_ok=True)

products = []
downloaded_images = set()

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def fetch_html(url):
    print(f"Stahuji: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Chyba při stahování {url}: {e}")
        return ""

def download_image(img_url, filename):
    if not img_url:
        return ""
    
    # Vyčistit URL
    if img_url.startswith("//"):
        img_url = "https:" + img_url
    elif img_url.startswith("/"):
        img_url = BASE_URL + img_url
        
    local_path = os.path.join("images", filename)
    
    if local_path in downloaded_images:
        return local_path
        
    print(f"Stahuji obrázek: {img_url} -> {local_path}")
    try:
        req = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(local_path, 'wb') as f:
                f.write(response.read())
        downloaded_images.add(local_path)
        return local_path
    except Exception as e:
        print(f"Chyba při stahování obrázku {img_url}: {e}")
        return ""

# 1. Scrape kategorií
for cat in CATEGORIES:
    url = f"{BASE_URL}/{cat}/"
    html = fetch_html(url)
    if not html:
        continue
        
    # Shoptet produkty jsou obvykle v blocích s třídou class="product" nebo v divu s data-micro="product"
    # Použijeme regex k nalezení jednotlivých bloků produktů
    # Hledáme bloky od <div class="[^"]*product[^"]*" po další uzavření nebo zjednodušeně přes data-micro
    
    # Alternativně: najít všechny obrázky, názvy a ceny na stránce
    # V Shoptet šablonách bývají struktury jako:
    # <a href="/prism-filtr-77mm/" class="name"><span>Prism filtr 77mm</span></a>
    # <div class="price-final"><span>990 Kč</span></div>
    # <img src="..." data-src="..." data-micro-image="..."
    
    # Najít všechny odkazy s třídou name
    product_matches = re.findall(r'<a[^>]+href="([^"]+)"[^>]+class="[^"]*name[^"]*"[^>]*>(.*?)</a>', html, re.DOTALL)
    
    # Pokud nic nenajdeme, zkusíme generičtější regex pro odkazy
    if not product_matches:
        product_matches = re.findall(r'<a[^>]+href="([^"]+)"[^>]+data-micro="url"[^>]*>(.*?)</a>', html, re.DOTALL)
        
    print(f"Nalezeno {len(product_matches)} možných odkazů na produkty v kategorii {cat}")
    
    # Projdeme nalezené shody a zkusíme k nim dohledat obrázek a cenu v okolním kódu
    for href, inner_html in product_matches:
        # Odfiltrovat nesmysly
        if "/registrace/" in href or "/prihlaseni/" in href:
            continue
            
        # Získat čistý název
        name_match = re.search(r'<span[^>]*>(.*?)</span>', inner_html, re.DOTALL)
        name = name_match.group(1).strip() if name_match else re.sub('<[^<]+?>', '', inner_html).strip()
        
        if not name:
            name = "Fotofiltr"
            
        # Vytvořit unikátní ID z URL
        prod_id = href.strip("/").split("/")[-1]
        
        # Stáhnout detailní stránku produktu pro nejlepší rozlišení obrázků a přesný popis/cenu!
        detail_url = BASE_URL + href if href.startswith("/") else href
        detail_html = fetch_html(detail_url)
        
        price = "990 Kč"
        desc = ""
        img_url = ""
        
        if detail_html:
            # Hledání ceny v detailu
            price_match = re.search(r'<span[^>]+class="[^"]*price-final[^"]*"[^>]*>(.*?)</span>', detail_html, re.DOTALL)
            if not price_match:
                price_match = re.search(r'<span[^>]+itemprop="price"[^>]*>(.*?)</span>', detail_html, re.DOTALL)
            if not price_match:
                price_match = re.search(r'<div[^>]+class="[^"]*price-final[^"]*"[^>]*>(.*?)</div>', detail_html, re.DOTALL)
                
            if price_match:
                price = re.sub('<[^<]+?>', '', price_match.group(1)).strip()
                
            # Hledání popisu
            desc_match = re.search(r'<div[^>]+class="[^"]*description-content[^"]*"[^>]*>(.*?)</div>', detail_html, re.DOTALL)
            if not desc_match:
                desc_match = re.search(r'<div[^>]+id="[^"]*description[^"]*"[^>]*>(.*?)</div>', detail_html, re.DOTALL)
            if desc_match:
                desc = re.sub('<[^<]+?>', '', desc_match.group(1)).strip()
                # Zkrátit a vyčistit bílé znaky
                desc = re.sub(r'\s+', ' ', desc)[:160] + "..."
                
            # Hledání hlavního obrázku
            img_match = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', detail_html)
            if not img_match:
                img_match = re.search(r'<a[^>]+class="[^"]*image-lightbox[^"]*"[^>]+href="([^"]+)"', detail_html)
            if img_match:
                img_url = img_match.group(1)
                
        # Stažení obrázku lokálně
        img_ext = "jpg"
        if img_url:
            if ".png" in img_url.lower():
                img_ext = "png"
            elif ".webp" in img_url.lower():
                img_ext = "webp"
                
        local_img_name = f"{prod_id}.{img_ext}"
        local_img_path = download_image(img_url, local_img_name)
        
        # Přidat do seznamu pokud již neexistuje
        if not any(p['href'] == href for p in products):
            products.append({
                "id": prod_id,
                "name": name,
                "price": price,
                "description": desc,
                "imgUrl": img_url,
                "localImg": local_img_path,
                "href": href
            })

# Uložit do JSON
with open("products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=4)

print(f"\nHOTOVO! Celkem staženo {len(products)} produktů a uloženo do products.json a složky images/")
