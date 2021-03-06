const PURPLE = "#23181e";
const BROWN = "#5f412b";
const RED = "#a32418";
const WHITE = "#efe9aa";
const SCALE = 4;
const TILE_W = 21 * SCALE;
const TILE_H = 12 * SCALE;
const FIELD_TOP_TILES = 3;
const FIELD_LEFT_TILES = 1;
const MAX_ENERGY = 13;
const TACKLE_COST = 5;
const PASS_BASE = 1;
const PASS_COST_DIV = 3;
const INTERCEPT_CHANCE = 0.25;
const BITE_COST = 5;
const SCREAM_COST = 3;
const SCREAM_RADIUS = 1;
const DEMON_ADVANCE_CHANCE = 0.02;
const REST_ENERGY = 2;
const G = 0.0000001;

function simg(i) {
    return {x: i.x * SCALE, y: i.y * SCALE, w: i.w * SCALE, h: i.h * SCALE};
}

const TILE = simg({x: 10, y: 55, w: 21, h: 12});
const HOVER_TILE = simg({x: 10, y: 41, w: 21, h: 12});
const IMP = simg({x: 48, y: 92, w: 11, h: 13});
const DEMON = simg({x: 70, y: 47, w: 19, h: 44});
const DEMON_ATTACKING = [simg({x: 148, y: 47, w: 31, h: 44}), simg({x: 32, y: 47, w: 31, h: 44})];
const PLAYER = [simg({x: 76, y: 15, w: 8, h: 13}), simg({x: 85, y: 15, w: 8, h: 13})];
const PLAYER_SELECTED = [simg({x: 55, y: 14, w: 10, h: 15}), simg({x: 65, y: 14, w: 10, h: 15})];
const CORPSE = simg({x: 59, y: 34, w: 15, h: 2});
const HEAD = [simg({x: 73, y: 2, w: 8, h: 12}), simg({x: 65, y: 2, w: 8, h: 12})];
const HOOP = [simg({x: 94, y: 10, w: 30, h: 26}), simg({x: 107, y: 37, w: 30, h: 26})];
const SPLASH = simg({x: 94, y: 63, w: 52, h: 38});

const NUM_PLAYERS = 5;
const FIELD_W = 9;
const FIELD_H = 11;

var animTickAccum = 0;
const ANIM_TICK_LENGTH = 200;

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
var sideSlideIn = 0;

// Initial beheading
var initialHeadIndex = 0;
var initialHeadSide = 0;
var headDemonY = 0;
var beheadingPause = 0;

var impExcitement = 0;

// Anims
var anims = [];
var t = 0;

// Sounds
function hwl(name, volume, rate) {
    return new Howl({src: ["sounds/" + name + ".mp3", "sounds/" + name + ".wav"], volume: volume || 1, rate: rate || 1});
}

const S_BEHEAD = hwl("behead");
const S_BITE = hwl("bite");
const S_CHEER = hwl("cheer");
const S_MOVE = hwl("move");
const S_SCREAM = hwl("scream");
const S_TACKLE = hwl("tackle");
const S_THROW = hwl("throw");

// Particles
var particles = [];
function addParticles(n, x, y, z, dx, dy, dz, dRandom) {
    for (var i = 0; i < n; i++) {
        particles.push({
            x: x, y: y, z: z,
            dx: dx + (Math.random() * 2 - 1) * dRandom,
            dy: dy + (Math.random() * 2 - 1) * dRandom,
            dz: dz + (Math.random() * 2 - 1) * dRandom,
            age: randInt(5000)
        });
    }
}

function groundParticles(ms) {
    c.fillStyle = RED;
    for (var i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.z >= 0) {
            c.fillRect((p.x + FIELD_LEFT_TILES) * TILE_W, (p.y - p.z + FIELD_TOP_TILES) * TILE_H, SCALE, SCALE);
            p.age += ms;
            if (p.age > 10000) {
                particles.splice(i, 1);
                i--;
            }
        }
    }
}

function doParticles(ms) {
    c.fillStyle = RED;
    for (var i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.dz -= G * ms * ms;
        p.x += p.dx * ms;
        p.y += p.dy * ms;
        p.z += p.dz * ms;
        if (p.z <= 0) {
            p.z = 0;
            p.dx = 0;
            p.dy = 0;
            p.dz = 0;
        } else {
            c.fillRect((p.x + FIELD_LEFT_TILES) * TILE_W, (p.y - p.z + FIELD_TOP_TILES) * TILE_H, SCALE, SCALE);
        }
    }
}


function timg(i, x, y) {
    img(i, (x + FIELD_LEFT_TILES) * TILE_W + Math.floor(TILE_W / 2 / SCALE) * SCALE - Math.floor(i.w / 2 / SCALE) * SCALE, (y + FIELD_TOP_TILES) * TILE_H + Math.floor(TILE_H * 3 / 4 / SCALE) * SCALE - i.h);
}

function finished() {
    var alive = false;
    for (const side of sides) {
        var alives = 0;
        for (const p of side.players) {
            if (p.alive) { alives++; }
        }
        if (alives >= 2) { alive = true; }
    }
    return !alive || demonAdvance >= Math.floor(FIELD_H / 2);
}

function winner() {
    if (sides[0].score > sides[1].score) {
        return sides[0];
    } else if (sides[0].score < sides[1].score) {
        return sides[1];
    } else {
        return null;
    }
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
    impExcitement = 8000;
    S_BEHEAD.play();
}

function bite() {
    if (selection.energy < BITE_COST) {
        return;
    }
    S_BITE.play();
    addParticles(20, head.x + 0.5, head.y + 1, 0.5, 0, 0, 0, 0.001);
    const order = [
        [selection.x, selection.y - 1],
        [selection.x, selection.y + 1],
        [selection.x - 1, selection.y],
        [selection.x + 1, selection.y]
    ];
    for (const fallp of order) {
        if (!playerAt({x: fallp[0], y: fallp[1]})) {
            selection.energy -= BITE_COST;
            selection.carrier.energy = Math.max(0, selection.carrier.energy - BITE_COST);
            selection.x = fallp[0];
            selection.y = fallp[1];
            selection.carrier = null;
            nextTurn();
            return;
        }
    }
    
    selection.energy -= BITE_COST;
    selection.carrier.energy = Math.max(-1, selection.carrier.energy - BITE_COST);
    nextTurn();
}

function scream() {
    if (selection.energy < SCREAM_COST) {
        return;
    }
    S_SCREAM.play();
    addParticles(30, head.x + 0.5, head.y + 1, 0.5, 0, 0, 0, 0.01);
    selection.energy -= SCREAM_COST;
    for (const np of inRect(selection.x - SCREAM_RADIUS, selection.y - SCREAM_RADIUS, SCREAM_RADIUS * 2 + 1, SCREAM_RADIUS * 2 + 1)) {
        const victim = playerAt(np);
        if (victim && victim.side != selection.side) {
            victim.energy = Math.max(0, victim.energy - SCREAM_COST);
        }
    }
    nextTurn();
}

function rest() {
    selection.energy = Math.min(MAX_ENERGY, selection.energy + REST_ENERGY);
    nextTurn();
}

function button(x, y, w, text, f) {
    const clr = c.fillStyle;
    const hover = rContainsP(x, y, w, 48, cursor);
    c.fillRect(x, y, w, 48);
    c.fillStyle = hover ? clr : PURPLE;
    c.fillRect(x + 4, y + 4, w - 8, 40);
    c.fillStyle = hover ? PURPLE : clr;
    c.fillText(text, x + 8, y + 38);
    c.fillStyle = clr;
    if (click && rContainsP(x, y, w, 48, click)) {
        f();
        return 2;
    }
    return hover ? 1 : 0;
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
    if (Math.random() < DEMON_ADVANCE_CHANCE) {
        demonAdvance++;
        impExcitement = 5000;
        S_CHEER.play();
    }
    for (const side of sides) {
        for (const p of side.players) {
            if (p.alive && (p.y <= demonAdvance || p.y >= FIELD_H - demonAdvance - 1)) {
                behead(p);
                addParticles(30, p.x + 0.5, p.y + 1, 0.5, 0, 0, 0, 0.001);
            }
        }
    }
    if (head != null && head.y <= demonAdvance) {
        head.y = demonAdvance + 1;
        head.carrier = playerAt(head);
    }
    if (head != null && head.y >= FIELD_H - demonAdvance - 1) {
        head.y = FIELD_H - demonAdvance - 2;
        head.carrier = playerAt(head);
    }
    sideSlideIn = -canvas.width;
    var alive = false;
    for (const p of sides[(currentSide + 1) % 2].players) {
        if (p.alive) { alive = true; }
    }
    if (alive) {
        currentSide = (currentSide + 1) % 2;
    }
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

function findIntercept(thrower, target) {
    const dx = thrower.x == target.x ? 0 : (thrower.x < target.x ? 1 : -1);
    const dy = thrower.y == target.y ? 0 : (thrower.y < target.y ? 1 : -1);
    const order = Math.abs(thrower.y - target.y) > Math.abs(thrower.x - target.x) ?
        [
            [thrower.x, thrower.y + dy],
            [thrower.x + dx, thrower.y],
            [thrower.x + dx, thrower.y + dy],
            [target.x - dx, target.y - dy],
            [target.x - dx, target.y],
            [target.x, target.y - dy]
        ] : [
            [thrower.x + dx, thrower.y],
            [thrower.x, thrower.y + dy],
            [thrower.x + dx, thrower.y + dy],
            [target.x - dx, target.y - dy],
            [target.x, target.y - dy],
            [target.x - dx, target.y]
        ];
    for (const ipt of order) {
        const interceptor = playerAt({x: ipt[0], y: ipt[1]});
        if (interceptor && interceptor.side != thrower.side && Math.random() < INTERCEPT_CHANCE) {
            return interceptor;
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
    headDemonY = 0;
    beheadingPause = 0;
}

reset();

function tick(ms) {
    t += ms;
    impExcitement = Math.max(1, impExcitement - ms);
    c.resetTransform();
    c.fillStyle = PURPLE;
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    if (finished()) {
        c.fillStyle = winner() ? winner().color : BROWN;
        c.font = "64px 'flailedmedium'";
        const text = winner() ? winner().name + " Wins!" : "Draw!";
        c.fillText(text, canvas.width / 2 - c.measureText(text).width / 2, canvas.height / 3);
    
        animTickAccum += ms;
        if (click != null && animTickAccum > 500) {
            reset();
        }
        return;
    }
    
    const hoverTile = tileAt(cursor);
    
    // Tiles
    for (const pt of inRect(0, 0, FIELD_W, FIELD_H)) {
        img(hoverTile.x == pt.x && hoverTile.y == pt.y ? HOVER_TILE : TILE, (pt.x  + FIELD_LEFT_TILES)* TILE_W, (pt.y + FIELD_TOP_TILES) * TILE_H);
    }
    
    groundParticles(ms);
    
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
    times(demonAdvance + 1, function(da) {
        times(FIELD_W, function(x) {
            if (x == Math.floor(FIELD_W / 2) && da == demonAdvance) {
                if (beheadingPause > 0) {
                    timg(DEMON_ATTACKING[initialHeadSide], x + [-1, 1][initialHeadSide] / 3.0, headDemonY);
                } else {
                    timg(DEMON, x, headDemonY == 0 ? da : headDemonY);
                }
            } else {
                timg(IMP, x, da + Math.floor(Math.cos((t + x * 91284) * impExcitement / 30000000)) / 9);
            }
            timg(IMP, x, FIELD_H - da - 1 + Math.floor(Math.cos((t + x * 48721) * impExcitement / 30000000)) / 9);
        });
    });
    
    // Head
    if (head != null) {
        timg(HEAD[head.side], head.carrier == null ? head.x : head.x - 1 / 3.0, head.y - (beheadingPause > 0 ? 1 / 3.0 : 0));
        if (beheadingPause > 0 && Math.random() < ms * 0.01) {
            addParticles(1, head.x + 0.5, head.y + 1, 0.5, 0, 0, 0, 0.0001);
        }
    }
    
    doParticles(ms);
    
    // Score
    c.font = "32px 'flailedmedium'";
    c.fillStyle = sides[0].color;
    c.fillText(sides[0].name + ": " + sides[0].score, 10, 40);
    c.fillStyle = sides[1].color;
    c.fillText(sides[1].name + ": " + sides[1].score, canvas.width - 10 - c.measureText(sides[1].name + ": " + sides[1].score).width, 40);

    // Beheading sequence
    if (head == null) {
        if (!animReady(ms)) { return; }
        if (headDemonY != sides[initialHeadSide].players[initialHeadIndex].y + 1) {
            headDemonY++;
            S_MOVE.play();
            return;
        }
        headDemonHasBeheaded = true;
        behead(sides[initialHeadSide].players[initialHeadIndex]);
        beheadingPause = ANIM_TICK_LENGTH * 6;
        sideSlideIn = -canvas.width;
        addParticles(30, head.x + 0.5, head.y + 1, 0.5, 0, 0, 0, 0.001);
        return;
    }
    if (beheadingPause > 0) {
        beheadingPause -= ms;
        return;
    }
    if (headDemonY != 0) {
        if (!animReady(ms)) { return; }
        S_MOVE.play();
        headDemonY--;
        return;
    }
    
    // Animation
    if (anims.length > 0) {
        for (var i = 0; i < anims.length; i++) {
            if (anims[i].tick(anims[i], ms)) {
                anims.splice(i, 1);
                i--;
            }
        }
        return;
    }
    
    // Control Panel
    sideSlideIn = Math.min(0, sideSlideIn + ms * 2);
    const side = sides[currentSide];
    var y = (FIELD_TOP_TILES + FIELD_H + 1) * TILE_H;
    var x = 10;
    c.fillStyle = side.color;
    c.fillRect(sideSlideIn, y, (FIELD_W + 2) * TILE_W, 4);
    c.font = "32px 'flailedmedium'";
    c.fillText(side.name + (selection == null ? "" : selection == head ? ": Head" : ": Player"), sideSlideIn + 10, y)
    
    y += 8;
    x += 30;
    
    if (hoverTile.exists && !tool && playerAt(hoverTile) && playerAt(hoverTile).side == currentSide && playerAt(hoverTile) != selection) {
        c.fillText(playerAt(hoverTile).energy + "/13 Energy", x, y + 35);
    } else if (hoverTile.exists && !tool && head != selection && head.side == currentSide && head.x == hoverTile.x && head.y == hoverTile.y) {
        c.fillText(head.energy + "/13 Energy", x, y + 35);
    } else if (selection) {
        c.fillText(selection.energy + "/13 Energy", x, y + 35);
        x += 200;
        if (head == selection) {
            var b = button(x, y, 120, "Scream", scream);
            if (b == 1) {
                c.fillStyle = SCREAM_COST <= selection.energy ? side.color : BROWN;
                c.fillText(SCREAM_COST + " Energy Cost", x + 124 + 134, y + 35);
            }
            if (b == 2) { return; }
            c.fillStyle = side.color;
            if (selection.carrier != null) {
                b = button(x + 124, y, 120, "Bite", bite);
                if (b == 1) {
                    c.fillStyle = BITE_COST <= selection.energy ? side.color : BROWN;
                    c.fillText(BITE_COST + " Energy Cost", x + 124 + 134, y + 35);
                }
                if (b == 2) { return; }
            }
        } else {
            if (head.carrier == selection) {
                toggle(x, y, 120, "Pass", tool == "pass", (v) => tool = v ? null : "pass");
                x += 124;
            } else {
                toggle(x, y, 120, "Move", tool == "move", (v) => tool = v ? null : "move");
                x += 124;
                toggle(x, y, 120, "Tackle", tool == "tackle", (v) => tool = v ? null :"tackle");
                x += 124;
            }
            var b = button(x, y, 120, "Rest", rest);
            if (b == 1) {
                c.fillText("+ " + REST_ENERGY + " Energy", x + 134, y + 35);
            }
            if (b == 2) { return; }
        }
        x += 134;
        
        if (head != selection && hoverTile.exists) {
            if (tool == "pass") {
                const target = playerAt(hoverTile);
                if (target && target.side == currentSide) {
                    const cost = PASS_BASE + Math.ceil((Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y)) / PASS_COST_DIV);
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
            var target = playerAt(hoverTile);
            if (target && target.side == currentSide) {
                const cost = PASS_BASE + Math.ceil((Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y)) / PASS_COST_DIV);
                if (cost <= selection.energy) {
                    selection.energy -= cost;
                    S_THROW.play();
                    const intercept = findIntercept(selection, target);
                    if (intercept) {
                        target = intercept;
                    }
                    anims.push({
                        time: 0,
                        source: {x: head.x, y: head.y},
                        target: target,
                        tick: function(a, ms) {
                            a.time = Math.min(100, a.time + ms);
                            head.x = lerp(a.source.x, a.target.x, a.time / 100);
                            head.y = lerp(a.source.y, a.target.y, a.time / 100);
                            addParticles(1, head.x, head.y + 1, 1, 0, 0, 0, 0.001);
                            if (a.time >= 100) {
                                head.carrier = target;
                                head.x = target.x;
                                head.y = target.y;
                                const hoopY = Math.floor(FIELD_H / 2);
                                if (!intercept) {
                                    if (currentSide == 1) {
                                        if (a.source.x == 0 && target.x == 0 && ((a.source.y > hoopY && target.y < hoopY) || (a.source.y < hoopY && target.y > hoopY))) {
                                            sides[1].score++;
                                            addParticles(20, 0.5, hoopY, 1.5, 0, target.y > hoopY ? 0.005 : -0.005, 0, 0.002);
                                            impExcitement = 5000;
                                            S_CHEER.play();
                                        }
                                    } else {
                                        if ((a.source.x == FIELD_W - 1 && target.x == FIELD_W - 1) && ((a.source.y > hoopY && target.y < hoopY) || (a.source.y < hoopY && target.y > hoopY))) {
                                            sides[0].score++;
                                            addParticles(20, FIELD_W - 0.5, hoopY, 1.5, 0, target.y > hoopY ? 0.005 : -0.005, 0, 0.002);
                                            impExcitement = 5000;
                                            S_CHEER.play();
                                        }
                                    }
                                }
                                
                                nextTurn();
                                return true;
                            }
                            return false;
                        }
                    });
                    return;
                }
            }
        } else if (selection && tool == "move") {
            if (!playerAt(clickT)) {
                const cost = Math.abs(clickT.x - selection.x) + Math.abs(clickT.y - selection.y);
                if (cost <= selection.energy) {
                    selection.energy -= cost;
                    S_MOVE.play();
                    anims.push({
                        time: 0,
                        player: selection,
                        source: {x: selection.x, y: selection.y},
                        target: clickT,
                        tick: function(a, ms) {
                            a.time = Math.min(200, a.time + ms);
                            a.player.x = lerp(a.source.x, a.target.x, a.time / 200);
                            a.player.y = lerp(a.source.y, a.target.y, a.time / 200);
                            timg(PLAYER[a.player.side], a.player.x, a.player.y);
                            if (a.time >= 200) {
                                a.player.x = clickT.x;
                                a.player.y = clickT.y;
                                if (head.carrier == a.player) {
                                    head.x = clickT.x;
                                    head.y = clickT.y;
                                } else if (head.x == clickT.x && head.y == clickT.y) {
                                    head.carrier = a.player;
                                }
                                nextTurn();
                                return true;
                            }
                            return false;
                        }
                    });
                    return;
                }
            }
        } else if (selection && tool == "tackle") {
            const target = playerAt(hoverTile);
            if (target && target.side != currentSide && findTackleOffset(selection, target)) {
                const cost = TACKLE_COST + Math.abs(hoverTile.x - selection.x) + Math.abs(hoverTile.y - selection.y);
                if (cost <= selection.energy) {
                    selection.energy -= cost;
                    S_MOVE.play();
                    const offset = findTackleOffset(selection, target);
                    anims.push({
                        time: 0,
                        player: selection,
                        source: {x: selection.x, y: selection.y},
                        target: target,
                        tick: function(a, ms) {
                            a.time = Math.min(200, a.time + ms);
                            a.player.x = lerp(a.source.x, a.target.x, a.time / 200);
                            a.player.y = lerp(a.source.y, a.target.y, a.time / 200);
                            timg(PLAYER[a.player.side], a.player.x, a.player.y);
                            if (a.time >= 200) {
                                S_TACKLE.play();
                                a.player.x = a.target.x;
                                a.player.y = a.target.y;
                                addParticles(10, a.target.x + 0.5, a.target.y + 1, 0.5, offset.dx * 0.005, offset.dy * 0.005, 0, 0.002);
                                a.target.x += offset.dx;
                                a.target.y += offset.dy;
                                target.energy = Math.max(0, target.energy - TACKLE_COST);
                                if (head.carrier == target) {
                                    head.x += offset.dx;
                                    head.y += offset.dy;
                                    if (offset.giveHeadTo) {
                                        head.carrier = offset.giveHeadTo;
                                        head.x = offset.giveHeadTo.x;
                                        head.y = offset.giveHeadTo.y;
                                    } else if (offset.dropHead) {
                                        head.x += offset.dx;
                                        head.y += offset.dy;
                                        head.carrier = null;
                                    }
                                }
                                nextTurn();
                                impExcitement = Math.max(1000, impExcitement);
                                return true;
                            }
                            return false;
                        }
                    });
                    return;
                }
            }
        } else {
            selection = first(side.players, (p) => p.x == clickT.x && p.y == clickT.y && p.alive);
            if (!selection && head.side == currentSide && head.x == clickT.x && head.y == clickT.y) {
                selection = head;
            }
        }
    }
}
