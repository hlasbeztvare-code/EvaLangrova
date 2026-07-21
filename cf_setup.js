const email = "hlancaric@gmail.com";
const key = "cfk_tXNY9rMyjcLi1Mc8vZx5eCKFYbE8NDM8XNfpd2Rv9a51e112";
const accountId = "3a147fa6382bb87477201b385bb945ea";
const domains = ["fotofiltry.cz", "fotofiltr.cz", "kreativnifiltry.cz", "kreativnifiltr.cz"];
const target = "evalangrova.pages.dev";

async function run() {
    for (const domain of domains) {
        console.log(`\n--- Setup for ${domain} ---`);
        
        // 1. Create Zone
        let zoneId;
        let nameservers = [];
        
        const createRes = await fetch("https://api.cloudflare.com/client/v4/zones", {
            method: "POST",
            headers: {
                "X-Auth-Email": email,
                "X-Auth-Key": key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: domain,
                account: { id: accountId },
                type: "full"
            })
        });
        const createData = await createRes.json();
        
        if (createData.success) {
            zoneId = createData.result.id;
            nameservers = createData.result.name_servers;
            console.log(`✅ Zone created successfully. Zone ID: ${zoneId}`);
        } else if (createData.errors[0]?.code === 1061) {
            console.log(`ℹ️ Zone already exists. Fetching info...`);
            const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, {
                headers: { "X-Auth-Email": email, "X-Auth-Key": key }
            });
            const getData = await getRes.json();
            zoneId = getData.result[0].id;
            nameservers = getData.result[0].name_servers;
        } else {
            console.error("❌ Failed to create zone:", createData.errors);
            continue;
        }
        
        console.log(`👉 Nameservers to set in Wedos for ${domain}: ${nameservers.join(", ")}`);
        
        // 2. Add CNAME record
        const cnameData = {
            type: "CNAME",
            name: "@",
            content: target,
            ttl: 1,
            proxied: true
        };
        
        const dnsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
            method: "POST",
            headers: {
                "X-Auth-Email": email,
                "X-Auth-Key": key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cnameData)
        });
        const dnsResult = await dnsRes.json();
        if (dnsResult.success) {
            console.log(`✅ CNAME @ -> ${target} (Proxied) created.`);
        } else if (dnsResult.errors[0]?.code === 81053) {
            console.log(`ℹ️ CNAME @ already exists.`);
        } else {
            console.error(`❌ Failed to create CNAME:`, dnsResult.errors);
        }
        
        // Add www CNAME
        const wwwData = {
            type: "CNAME",
            name: "www",
            content: target,
            ttl: 1,
            proxied: true
        };
        const wwwRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
            method: "POST",
            headers: {
                "X-Auth-Email": email,
                "X-Auth-Key": key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(wwwData)
        });
        const wwwResult = await wwwRes.json();
        if (wwwResult.success) {
            console.log(`✅ CNAME www -> ${target} (Proxied) created.`);
        } else if (wwwResult.errors[0]?.code === 81053) {
            console.log(`ℹ️ CNAME www already exists.`);
        } else {
            console.error(`❌ Failed to create www CNAME:`, wwwResult.errors);
        }
    }
}
run();
