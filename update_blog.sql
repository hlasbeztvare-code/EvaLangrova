ALTER TABLE blog ADD COLUMN meta_title TEXT;
ALTER TABLE blog ADD COLUMN meta_desc TEXT;
ALTER TABLE blog ADD COLUMN keywords TEXT;

-- Article 1: Proč tvé fotky vypadají amatérsky
INSERT INTO blog (id, title, slug, image, text, date, meta_title, meta_desc, keywords) VALUES (
    'article-1',
    '5 důvodů, proč tvé fotky vypadají amatérsky (a jak to změnit)',
    'proc-tve-fotky-vypadaji-amatersky',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
    '<h3>1. Chybí ti filmový grading</h3><p>Mnoho fotografů si myslí, že dobrá fotka vzniká jen v samotném fotoaparátu. Pravdou ale je, že <strong>kouzlo profesionálních fotografií</strong> spočívá v postprodukci. Filmový look dodává fotkám hloubku a příběh. Zkus přidat do stínů trochu chladných tónů a do světel teplejší barvy (tzv. Teal & Orange efekt).</p><h3>2. Používáš špatné presets</h3><p>Nekupuj levné balíčky stovek presetů, které aplikují extrémní kontrast. Místo toho sáhni po <a href="/index.html#kolekce">kreativních filtrech</a> a nástrojích navržených pro konzistentní filmovou produkci. <strong>Profesionální filtry pro Lightroom</strong> respektují pleťové tóny a nevytváří na fotkách přepaly.</p><h3>3. Nerespektuješ světlo</h3><p>Nejlepší postprodukce nezachrání fotku vyfocenou ve špatném světle. Uč se pracovat s přirozeným světlem a teprve potom upravuj barvy.</p><br><p><strong>Nechceš ztrácet čas a mít fotky jako z Hollywoodu?</strong> Získej můj <a href="/index.html#kolekce">Masterpack presetů</a> dřív, než zdražím.</p>',
    '2026-07-14',
    'Proč tvé fotky vypadají amatérsky (A jak na filmový look) | Fotofiltry.cz',
    'Děláte tyto začátečnické chyby v úpravě fotek? Zjistěte 5 tajemství, jak posunout své fotografie na úroveň filmové produkce a vytvořit profesionální look.',
    'profesionální fotografické filtry, jak na filmový look fotek, kreativní filtry pro Lightroom'
);

-- Article 2: Jak vybrat správný filtr
INSERT INTO blog (id, title, slug, image, text, date, meta_title, meta_desc, keywords) VALUES (
    'article-2',
    'Jak vybrat kreativní filtr, který zničí tvou konkurenci',
    'jak-vybrat-spravny-filtr',
    'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=1200&q=80',
    '<h3>Kreativita začíná tam, kde končí realita</h3><p>V dnešní době plné AI generovaných obrázků a dokonalých renderů je těžké vyniknout. Pokud chceš, aby si tvých fotek někdo všiml, potřebuješ <strong>osobitý styl</strong>. A ten nezískáš tím, že budeš fotit to samé jako ostatní. Potřebuješ <a href="/index.html#kolekce">kreativní fotografické filtry</a>.</p><h3>Kaleidoskop vs. Halo efekt</h3><p>Zatímco kaleidoskopický filtr roztříští obraz do fascinujících fraktálů a hodí se pro hudební klipy nebo fashion editorialy, Halo filtr vytvoří snovou auru kolem světelných zdrojů. Jaký si vybrat? <strong>Oba.</strong> Každý nástroj má své místo v arzenálu profesionála.</p><h3>Fyzický filtr vs. Postprodukce</h3><p>Mnoho efektů lze simulovat v Photoshopu, ale nic se nevyrovná reálnému lomu světla přímo v objektivu. Optická nedokonalost je to, co dělá fotku <strong>autentickou</strong>.</p><br><p><strong>Udělej krok před ostatní.</strong> Podívej se na <a href="/index.html#kolekce">naši nabídku fyzických filtrů</a> a začni tvořit nezapomenutelné snímky.</p>',
    '2026-07-14',
    'Jak vybrat správný fotografický filtr pro unikátní styl | Fotofiltry.cz',
    'Objevte, jak kreativní fotografické filtry mohou zcela změnit váš styl. Od kaleidoskopu po Halo efekt. Tvořte fotky, které si lidé zapamatují.',
    'profesionální fotografické filtry, kreativní filtry pro objektivy, jak fotit s filtry'
);

-- Article 3: Jak upravit barvy za 5 minut
INSERT INTO blog (id, title, slug, image, text, date, meta_title, meta_desc, keywords) VALUES (
    'article-3',
    'Tajemství dokonalých portrétů: Rychlá úprava fotek za 5 minut',
    'jak-upravit-barvy-za-5-minut',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    '<h3>Ztrácíš hodiny u Lightroomu? Tady je řešení.</h3><p>Pokud retušování a barvení jednoho portrétu zabírá více než 10 minut, děláš to špatně. <strong>Rychlá úprava fotek</strong> není o odfláknutí práce, ale o efektivním workflow a správných nástrojích.</p><h3>Základem jsou kvalitní Presety</h3><p>Pro profesionální <strong>postprodukci portrétů</strong> potřebuješ presety, které byly vytvořeny pro různé světelné podmínky. Nejde o to "plácnout" tam filtr, ale poskytnout fotce solidní základ, který pak jen doladíš.</p><h3>Krok za krokem k filmovým barvám</h3><ol><li>Aplikuj základní preset pro pleťové tóny z naší <a href="/index.html#kolekce">kolekce pro Lightroom</a>.</li><li>Uprav expozici a kontrast podle nasvícení tvé fotky.</li><li>Jemně zasáhni do HSL panelu, pokud je to nutné (např. stažení sytosti zelené v pozadí).</li><li>HOTOVO.</li></ol><br><p><strong>Nebuď otrokem svého počítače.</strong> Pořiď si náš <a href="/index.html#kolekce">Balíček pro filmovou postprodukci</a> a zkrať svůj čas u PC o 80 %.</p>',
    '2026-07-14',
    'Rychlá úprava fotek: Postprodukce portrétů za 5 minut | Fotofiltry.cz',
    'Ztrácíte hodiny u Lightroomu? Naučte se efektivní workflow a rychlou úpravu barev pomocí profesionálních presetů. Dosáhněte filmových tónů snadno.',
    'rychlá úprava fotek, postprodukce portrétů, kreativní filtry pro Lightroom'
);
