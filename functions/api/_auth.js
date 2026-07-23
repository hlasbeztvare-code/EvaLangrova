/**
 * Sdílená logika ověření admin hesla.
 * Pokud je v D1 (config.id = 'adminAuth') uložený hash nastaveného hesla,
 * použije se ten (Eva si heslo změnila v adminu). Jinak se použije
 * záložní heslo z proměnné prostředí ADMIN_PASSWORD (nebo 'eva123').
 */

export async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getStoredPasswordHash(env) {
    if (!env.DB) return null;
    const row = await env.DB.prepare("SELECT data FROM config WHERE id = 'adminAuth'").first();
    if (!row) return null;
    try {
        const parsed = JSON.parse(row.data);
        return parsed.passwordHash || null;
    } catch (e) {
        return null;
    }
}

export async function verifyAdminPassword(password, env) {
    const storedHash = await getStoredPasswordHash(env);
    if (storedHash) {
        const submittedHash = await hashPassword(password);
        return submittedHash === storedHash;
    }
    // Eva si ještě heslo nezměnila — použij výchozí z env proměnné.
    const fallback = env.ADMIN_PASSWORD || 'eva123';
    return password === fallback;
}
