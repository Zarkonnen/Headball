const PURPLE = "#23181e";
const BROWN = "#5f412b";
const RED = "#a32418";
const WHITE = "#efe9aa";
const SCALE = 4;
const TILE_W = 21 * SCALE;
const TILE_H = 12 * SCALE;
const FIELD_TOP_TILES = 4;
const FIELD_LEFT_TILES = 1;
const MAX_ENERGY = 13;
const TACKLE_COST = 4;
const PASS_COST_DIV = 3;

function simg(i) {
    return {x: i.x * SCALE, y: i.y * SCALE, w: i.w * SCALE, h: i.h * SCALE};
}

const TILE = simg({x: 10, y: 55, w: 21, h: 12});
const HOVER_TILE = simg({x: 10, y: 41, w: 21, h: 12});
const IMP = simg({x: 48, y: 56, w: 11, h: 13});
const DEMON = simg({x: 70, y: 47, w: 19, h: 44});
const PLAYER = [simg({x: 76, y: 15, w: 8, h: 13}), simg({x: 85, y: 15, w: 8, h: 13})];
const PLAYER_SELECTED = [simg({x: 55, y: 14, w: 10, h: 15}), simg({x: 65, y: 14, w: 10, h: 15})];
const CORPSE = simg({x: 59, y: 34, w: 15, h: 2});
const HEAD = [simg({x: 73, y: 2, w: 8, h: 12}), simg({x: 65, y: 2, w: 8, h: 12})];
const HOOP = [simg({x: 94, y: 10, w: 30, h: 26}), simg({x: 107, y: 37, w: 30, h: 26})];
const SPLASH = simg({x: 94, y: 63, w: 52, h: 38});

const NUM_PLAYERS = 5;
const FIELD_W = 11;
const FIELD_H = 9;

var animTickAccum = 0;
const ANIM_TICK_LENGTH = 40;

function animReady(ms) {
    animTickAccum += ms;
    if (animTickAccum >= ANIM_TICK_LENGTH) {
        animTickAccum -= ANIM_TICK_LENGTH;
        return true;
    }
    return false;
}

var sides = [];
var head = null;
var demonAdvance = 0;
var currentSide = 0;
var selection = null;
var tool = null;

// Initial beheading
var initialHeadIndex = 0;
var initialHeadSide = 0;
var headDemonY = -1;
var beheadingSplashAmt = 0;

function timg(i, x, y) {
    img(i, (x + FIELD_LEFT_TILES) * TILE_W + Math.floor(TILE_W / 2 / SCALE) * SCALE - Math.floor(i.w / 2 / SCALE) * SCALE, (y + FIELD_TOP_TILES) * TILE_H + Math.floor(TILE_H * 3 / 4 / SCALE) * SCALE - i.h);
}

function tileExists(x, y) {
    return x >= 0 && x < FIELD_W && y >= 0 && y < FIELD_H;
}

function tileAt(p) {
    var x = Math.floor(p.x / TILE_W) - FIELD_LEFT_TILES;
    var y = Math.floor(p.y / TILE_H) - FIELD_TOP_TILES;
    return {x: x, y: y, exists: tileExists(x, y)};
}

function playerAt(t) {
    for (const side of sides) {
        for (const p of side.players) {
            if (p.alive && p.x == t.x && p.y == t.y) { return p; }
        }
    }
    return null;
}

function behead(player) {
    player.alive = false;
    head = {x: player.x, y: player.y, side: player.side, energy: player.energy, carrier: null};
}

function button(x, y, w, text, f) {
    const clr = c.fillStyle;
    const hover = rContainsP(x, y, w, 48, cursor);
    c.fillRect(x, y, w, 48);
    c.fillStyle = hover ? clr : PURPLE;
    c.fillRect(x + 4, y + 4, w - 8, 40);
    c.fillStyle = hover ? PURPLE : clr;
    c.fillText(text, x + 8, y + 38);
    if (click && rContainsP(x, y, w, 48, click)) {
        f();
        return true;
    }
    return false;
}

function toggle(x, y, w, text, v, f) {
    var clr = c.fillStyle;
    var hover = rContainsP(x, y, w, 48, cursor);
    c.fillRect(x, y, w, 48);
    c.fillStyle = hover ? clr : (v ? BROWN : PURPLE);
    c.fillRect(x + 4, y + 4, w - 8, 40);
    c.fillStyle = hover ? PURPLE : clr;
    c.fillText(text, x + 8, y + 38);
    c.fillStyle = clr;
    if (click && rContainsP(x, y, w, 48, click)) {
        f(v);
        return true;
    }
    return false;
}

function nextTurn() {
    currentSide = (currentSide + 1) % 2;
    for (const p of sides[currentSide].players) {
        if (p.alive) {
            p.energy = Math.min(MAX_ENERGY, p.energy + 1);
        }
    }
    if (head != null && head.side == currentSide) {
        head.energy = Math.min(MAX_ENERGY, head.energy + 1);
    }
    selection = null;
    tool = null;
}

function findTackleOffset(tackler, tacklee) {
    const order = Math.abs(tackler.y - tacklee.y) > Math.abs(tackler.x - tacklee.x) ? ["y", "x"] : ["x", "y"];
    for (const dir of order) {
        var dx = 0;
        var dy = 0;
        if (dir == "x") {
            dx = tackler.x < tacklee.x ? 1 : -1;
        } else {
            dy = tackler.y < tacklee.y ? 1 : -1;
        }
        if (tileExists(tacklee.x + dx, tacklee.y + dy) && !playerAt({x: tacklee.x + dx, y: tacklee.y + dy})) {
            return {
                dx: dx,
                dy: dy,
                dropHead: tileExists(tacklee.x + 2 * dx, tacklee.y + 2 * dy),
                giveHeadTo: playerAt({x: tacklee.x + 2 * dx, y: tacklee.y + 2 * dy})
            };
        }
    }
    return null;
}

function reset() {
    animTickAccum = 0;
    head = null;
    demonAdvance = 0;
    selection = null;
    tool = null;
    sides = [
        {id: 0, score: 0, players: [], color: RED, name: "Team Blood"},
        {id: 1, score: 0, players: [], color: WHITE, name: "Team Tears"}
    ];
    times(NUM_PLAYERS, function(i) {
        sides[0].players.push({
            side: 0,
            x: Math.floor(FIELD_W / 2) - 1,
            y: (FIELD_H - NUM_PLAYERS) / 2 + i,
            energy: 5,
            alive: true
        });
        sides[1].players.push({
            side: 1,
            x: Math.floor(FIELD_W / 2) + 1,
            y: (FIELD_H - NUM_PLAYERS) / 2 + i,
            energy: 5,
            alive: true
        });
    });
    
    initialHeadIndex = randInt(NUM_PLAYERS);
    initialHeadSide = randInt(2);
    currentSide = initialHeadSide;
    headDemonY = -1;
    beheadingSplashAmt = 0;
}

reset();

function tick(ms) {
    c.resetTransform();
    c.fillStyle = PURPLE;
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    const hoverTile = tileAt(cursor);
    
    // Tiles
    for (const pt of inRect(0, 0, FIELD_W, FIELD_H)) {
        img(hoverTile.x == pt.x && hoverTile.y == pt.y ? HOVER_TILE : TILE, (pt.x  + FIELD_LEFT_TILES)* TILE_W, (pt.y + FIELD_TOP_TILES) * TILE_H);
    }
    
    for (const pt of inRect(0, 0, FIELD_W, FIELD_H)) {
        // Players
        for (const side of sides) {
            for (const p of side.players) {
                if (pt.x == p.x && pt.y == p.y) {
                    if (p.alive) {
                        if (p == selection) {
                            timg(PLAYER_SELECTED[side.id], p.x, p.y);
                        } else {
                            timg(PLAYER[side.id], p.x, p.y);
                        }
                    } else {
                        timg(CORPSE, p.x, p.y);
                    }
                }
            }
        }
        
        // Hoops
        if (pt.x == 0 && pt.y == Math.floor(FIELD_H / 2)) {
            timg(HOOP[0], pt.x, pt.y);
        }
        if (pt.x == FIELD_W - 1 && pt.y == Math.floor(FIELD_H / 2)) {
            timg(HOOP[1], pt.x, pt.y);
        }
    }
    
    // Demons
    times(FIELD_W, function(x) {
        if (x == Math.floor(FIELD_W / 2)) {
            if (beheadingSplashAmt <= 0) {
                timg(DEMON, x, headDemonY == -1 ? demonAdvance - 1 : headDemonY);
            }
        } else {
            timg(IMP, x, demonAdvance - 1);
        }
        timg(IMP, x, FIELD_H - demonAdvance);
    });
    
    // Head
    if (head != null) {
        timg(HEAD[head.side], head.carrier == null ? head.x : head.x - 1 / 3.0, head.y);
    }
    
    // Score
    c.font = "32px 'flailedmedium'";
    c.fillStyle = sides[0].color;
    c.fillText(sides[0].name + ": " + sides[0].score, 10, 40);
    c.fillStyle = sides[1].color;
    c.fillText(sides[1].name + ": " + sides[1].score, canvas.width - 10 - c.measureText(sides[1].name + ": " + sides[1].score).width, 40);

    // Beheading sequence
    if (head == null) {
        if (!animReady(ms)) { return; }
        if (headDemonY != sides[initialHeadSide].players[initialHeadIndex].y) {
            headDemonY++;
            return;
        }
        headDemonHasBeheaded = true;
        beheadingSplashAmt = 300;
        behead(sides[initialHeadSide].players[initialHeadIndex]);
        return;
    }
    if (beheadingSplashAmt > 0) {
        c.fillStyle = PURPLE;
        c.fillRect(0, 0, canvas.width, canvas.height);
        beheadingSplashAmt -= ms;
        if (beheadingSplashAmt > 1) {
            img(SPLASH, canvas.width / 2 - 30 * SCALE + randInt(3) * SCALE, canvas.height / 2 - 20 * SCALE + randInt(3) * SCALE);
        } else {
            img(SPLASH, canvas.width / 2 - 30 * SCALE, canvas.height / 2 - 20 * SCALE);
        }
        return;
    }
    if (headDemonY != -1) {
        if (!animReady(ms)) { return; }
        headDemonY--;
        return;
    }
    
    // Control Panel
    const side = sides[currentSide];
    var y = (FIELD_TOP_TILES + FIELD_H + 1) * TILE_H;
    var x = 10;
    c.fillStyle = side.color;
    c.fillRect(0, y, 1092, 4);
    c.font = "32px 'flailedmedium'";
    c.fillText(side.name , x, y)
    
    y += 8;
    x += 30;
    
    if (hoverTile.exists && !tool && playerAt(hoverTile) && playerAt(hoverTile).side == currentSide && playerAt(hoverTile) != selection) {
        c.fillText(playerAt(hoverTile).energy + "/13 Energy", x, y + 35);
    } else if (selection) {
        c.fillText(selection.energy + "/13 Energy", x, y + 35);
        x += 200;
        if (head.carrier == selection) {
            toggle(x, y, 120, "Pass", tool == "pass", (v) => tool = v ? null : "pass");
        } else {
            toggle(x, y, 120, "Move", tool == "move", (v) => tool = v ? null : "move");
            x += 124;
            toggle(x, y, 120, "Tackle", tool == "tackle", (v) => tool = v ? null :"tackle");
        }
        x += 134;
        
        if (hoverTile.exists) {
            if (tool == "pass") {
                const target = playerAt(hoverTile);
                if (target && target.side == currentSide) {
                    const cost = Math.ceil((Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y)) / PASS_COST_DIV);
                    c.fillStyle = cost <= selection.energy ? side.color : BROWN;
                    c.fillText(cost + " Energy Cost", x, y + 35);
                }
            } else if (tool == "move") {
                if (!playerAt(hoverTile)) {
                    const cost = Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y);
                    c.fillStyle = cost <= selection.energy ? side.color : BROWN;
                    c.fillText(cost + " Energy Cost", x, y + 35);
                }
            } else if (tool == "tackle") {
                const target = playerAt(hoverTile);
                if (target && target.side != currentSide) {
                    const offset = findTackleOffset(selection, target);
                    if (offset) {
                        const cost = TACKLE_COST + Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y);
                        c.fillStyle = cost <= selection.energy ? side.color : BROWN;
                        c.fillText(cost + " Energy Cost", x, y + 35);
                    }
                }
            }
        }
    }
    
    
    var clickT = click == null ? {exists: false} : tileAt(click);
    if (clickT.exists) {
        if (selection && tool == "pass") {
            const target = playerAt(hoverTile);
            if (target && target.side == currentSide) {
                const cost = Math.ceil((Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y)) / PASS_COST_DIV);
                if (cost <= selection.energy) {
                    selection.energy -= cost;
                    head.carrier = target;
                    head.x = target.x;
                    head.y = target.y;
                    const hoopY = Math.floor(FIELD_H / 2);
                    if (((selection.x == 0 && target.x == 0) || (selection.x == FIELD_W - 1 && target.x == FIELD_W - 1)) && ((selection.y > hoopY && target.y < hoopY) || (selection.y < hoopY && target.y > hoopY))) {
                        sides[target.side].score++;
                    }
                    nextTurn();
                    return;
                }
            }
        } else if (selection && tool == "move") {
            if (!playerAt(clickT)) {
                const cost = Math.abs(clickT.x - selection.x) + Math.abs(clickT.y - selection.y);
                if (cost <= selection.energy) {
                    selection.energy -= cost;
                    selection.x = clickT.x;
                    selection.y = clickT.y;
                    if (head.carrier == selection) {
                        head.x = clickT.x;
                        head.y = clickT.y;
                    } else if (head.x == clickT.x && head.y == clickT.y) {
                        head.carrier = selection;
                    }
                    nextTurn();
                    return;
                }
            }
        } else if (selection && tool == "tackle") {
            const target = playerAt(hoverTile);
            if (target && target.side != currentSide && findTackleOffset(selection, target)) {
                const cost = TACKLE_COST + Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y);
                if (cost <= selection.energy) {
                    selection.energy -= cost;
                    const offset = findTackleOffset(selection, target);
                    selection.x = clickT.x;
                    selection.y = clickT.y;
                    target.x += offset.dx;
                    target.y += offset.dy;
                    target.energy = Math.max(0, target.energy - TACKLE_COST);
                    if (head.carrier == target) {
                        head.x += offset.dx;
                        head.y += offset.dy;
                        if (offset.giveHeadTo) {
                            head.carrier = giveHeadTo;
                            head.x = giveHeadTo.x;
                            head.y = giveHeadTo.y;
                        } else if (offset.dropHead) {
                            head.x += offset.dx;
                            head.y += offset.dy;
                            head.carrier = null;
                        }
                    }
                    nextTurn();
                    return;
                }
            }
        } else {
            selection = first(side.players, (p) => p.x == clickT.x && p.y == clickT.y && p.alive);
        }
    }
}
