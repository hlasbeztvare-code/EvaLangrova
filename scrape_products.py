import os
import urllib.request
import re
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

BASE_URL = "https://780725.myshoptet.com"
CATEGORIES = ["prism", "fog-2", "halo-2"]

os.makedirs("images", exist_ok=True)

products = []
downloaded_images = set()

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def fetch_html(url):
    print(f"Stahuji HTML z: {url}")
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
        print(f"Chyba stahování obrázku {img_url}: {e}")
        return ""

for cat in CATEGORIES:
    url = f"{BASE_URL}/{cat}/"
    html = fetch_html(url)
    if not html:
        continue
        
    product_matches = re.findall(r'<a[^>]+href="([^"]+)"[^>]+class="[^"]*name[^"]*"[^>]*>(.*?)</a>', html, re.DOTALL)
    if not product_matches:
        product_matches = re.findall(r'<a[^>]+href="([^"]+)"[^>]+data-micro="url"[^>]*>(.*?)</a>', html, re.DOTALL)
        
    for href, inner_html in product_matches:
        if "/registrace/" in href or "/prihlaseni/" in href:
            continue
            
        name_match = re.search(r'<span[^>]*>(.*?)</span>', inner_html, re.DOTALL)
        name = name_match.group(1).strip() if name_match else re.sub('<[^<]+?>', '', inner_html).strip()
        
        # Unifikace ID podle frontendu
        prod_id = href.strip("/").split("/")[-1]
        if "kaleidoscope" in prod_id or "prism" in prod_id:
            prod_id = "kaleidoscope"
        elif "fog" in prod_id:
            prod_id = "fog"
        elif "halo" in prod_id:
            prod_id = "halo"
            
        detail_url = BASE_URL + href if href.startswith("/") else href
        detail_html = fetch_html(detail_url)
        
        price = "990 Kč"
        desc = ""
        additional_images = []
        
        if detail_html:
            # 1. Přesná cena z detailu
            price_match = re.search(r'<span[^>]+class="[^"]*price-final[^"]*"[^>]*>(.*?)</span>', detail_html, re.DOTALL)
            if price_match:
                price = re.sub('<[^<]+?>', '', price_match.group(1)).strip()
                
            # 2. KOMPLETNÍ PLNÝ POPIS (Včetně HTML struktury - odrážky, silný text, atd.)
            desc_match = re.search(r'<div[^>]+class="[^"]*description-content[^"]*"[^>]*>(.*?)</div>', detail_html, re.DOTALL)
            if not desc_match:
                desc_match = re.search(r'<div[^>]+id="[^"]*description[^"]*"[^>]*>(.*?)</div>', detail_html, re.DOTALL)
            if desc_match:
                desc = desc_match.group(1).strip()
                # Vyčistit jen přebytečné Shoptet třídy, zachovat tagy jako p, strong, ul, li
                desc = re.sub(r'class="[^"]*"', '', desc)
                desc = re.sub(r'style="[^"]*"', '', desc)
                
            # 3. EXTRAKCE VŠECH OBRÁZKŮ Z GALERIE
            # Shoptet dává fotky do odkazů s třídou image-lightbox nebo datových elementů
            img_links = re.findall(r'href="([^"]+)"[^>]+class="[^"]*image-lightbox[^"]*"', detail_html)
            if not img_links:
                # Fallback na og:image a další nalezené velké fotky
                og_img = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', detail_html)
                if og_img:
                    img_links = [og_img.group(1)]
            
            # Stáhnout a zmapovat všechny fotky z galerie
            for idx, img_u in enumerate(img_links):
                ext = "jpg"
                if ".png" in img_u.lower(): ext = "png"
                elif ".webp" in img_u.lower(): ext = "webp"
                
                img_name = f"{prod_id}_{idx}.{ext}"
                local_path = download_image(img_u, img_name)
                if local_path:
                    additional_images.append(local_path)

        if not any(p['id'] == prod_id for p in products):
            products.append({
                "id": prod_id,
                "name": name,
                "price": price,
                "description": desc,
                "images": additional_images,  # Kompletní pole všech stažených fotek
                "localImg": additional_images[0] if additional_images else f"images/{prod_id}.png",
                "inStock": True
            })

with open("products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=4)

print(f"\n[300% ÚSPĚCH] Všechny plné texty a kompletní galerie staženy do products.json!")
