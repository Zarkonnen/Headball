function clamp(v, low, high) {
    return Math.max(low, Math.min(high, v));
}

function lerp(a, b, amt) {
    return a * (1 - amt) + b * amt;
}

function count(it, v) {
    let n = 0;
    for (const item of it) {
        if (item == v) { n++; }
    }
    return n;
}

function countF(it, f) {
    let n = 0;
    for (const item of it) {
        if (f(item)) { n++; }
    }
    return n;
}

function pick(l) {
    return l[Math.floor(Math.random() * l.length)];
}

function randInt(n) {
    return Math.floor(Math.random() * n);
}

function randBool() {
    return Math.random() > 0.5;
}

function* inRect(x, y, w, h) {
    for (var yy = y; yy < y + h; yy++) {
        for (var xx = x; xx < x + w; xx++) {
            yield({x: xx, y: yy});
        }
    }
}

function first(it, f) {
    for (const item of it) {
        if (f(item)) { return item; }
    }
    return null;
}

function most(list, f, filter) {
    var found = false;
    var most = null;
    var amount = 0;
    for (const item of list) {
        if (filter && !filter(item)) { continue; }
        const itemAmount = f(item);
        if (!found || itemAmount > amount) {
            found = true;
            most = item;
            amount = itemAmount;
        }
    }
    return most;
}

function least(list, f, filter) {
    return most(list, (x) => -f(x), filter);
}

function times(n, f) {
    for (let i = 0; i < n; i++) {
        f(i);
    }
}

function rContainsP(x, y, w, h, p) {
    return p.x >= x && p.y >= y && p.x <= x + w && p.y <= y + h;
}

function allF(...fs) {
    return function(...args) {
        for (const f of fs) {
            if (!f(...args)) { return false; }
        }
        return true;
    }
}
