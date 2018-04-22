const PURPLE = "#23181e";
const BROWN = "#5f412b";
const RED = "#a32418";
const WHITE = "#efe9aa";
const SCALE = 4;
const TILE_W = 21 * SCALE;
const TILE_H = 12 * SCALE;
const FIELD_TOP_TILES = 5;
const FIELD_LEFT_TILES = 1;

function simg(i) {
    return {x: i.x * SCALE, y: i.y * SCALE, w: i.w * SCALE, h: i.h * SCALE};
}

const TILE = simg({x: 10, y: 55, w: 21, h: 12});
const IMP = simg({x: 48, y: 56, w: 11, h: 13});
const DEMON = simg({x: 70, y: 47, w: 19, h: 44});
const PLAYER = [simg({x: 76, y: 15, w: 8, h: 13}), simg({x: 85, y: 15, w: 8, h: 13})];
const CORPSE = simg({x: 59, y: 34, w: 15, h: 2});
const HEAD = [simg({x: 73, y: 2, w: 8, h: 12}), simg({x: 65, y: 2, w: 8, h: 12})];
const HOOP = [simg({x: 94, y: 10, w: 30, h: 26}), simg({x: 107, y: 37, w: 30, h: 26})];
const SPLASH = simg({x: 94, y: 63, w: 52, h: 38});

const NUM_PLAYERS = 7;
const FIELD_W = 11;
const FIELD_H = 9;

var animTickAccum = 0;
const ANIM_TICK_LENGTH = 300;

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

// Initial beheading
var initialHeadIndex = 0;
var initialHeadSide = 0;
var headDemonY = -1;
var beheadingSplashAmt = 0;

function timg(i, x, y) {
    img(i, (x + FIELD_LEFT_TILES) * TILE_W + Math.floor(TILE_W / 2 / SCALE) * SCALE - Math.floor(i.w / 2 / SCALE) * SCALE, (y + FIELD_TOP_TILES) * TILE_H + Math.floor(TILE_H * 3 / 4 / SCALE) * SCALE - i.h);
}

function behead(player) {
    player.alive = false;
    head = {x: player.x, y: player.y, side: player.side, energy: player.energy};
}

function reset() {
    animTickAccum = 0;
    head = null;
    demonAdvance = 0;
    sides = [
        {id: 0, score: 0, players: []},
        {id: 1, score: 0, players: []}
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
    headDemonY = -1;
    beheadingSplashAmt = 0;
}

reset();

function tick(ms) {
    c.resetTransform();
    c.fillStyle = PURPLE;
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    // Tiles
    for (const pt of inRect(0, 0, FIELD_W, FIELD_H)) {
        img(TILE, (pt.x  + FIELD_LEFT_TILES)* TILE_W, (pt.y + FIELD_TOP_TILES) * TILE_H);
    }
    
    for (const pt of inRect(0, 0, FIELD_W, FIELD_H)) {
        // Players
        for (const side of sides) {
            for (const p of side.players) {
                if (pt.x == p.x && pt.y == p.y) {
                    if (p.alive) {
                        timg(PLAYER[side.id], p.x, p.y);
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
        timg(HEAD[head.side], head.x, head.y);
    }

    // Beheading sequence
    if (head == null) {
        if (!animReady(ms)) { return; }
        if (headDemonY != sides[initialHeadSide].players[initialHeadIndex].y) {
            headDemonY++;
            return;
        }
        headDemonHasBeheaded = true;
        beheadingSplashAmt = 2000;
        behead(sides[initialHeadSide].players[initialHeadIndex]);
        return;
    }
    if (beheadingSplashAmt > 0) {
        beheadingSplashAmt -= ms;
        if (beheadingSplashAmt > 800) {
            img(SPLASH, canvas.width / 2 - 30 * SCALE + randInt(3) * SCALE, (FIELD_TOP_TILES + headDemonY) * TILE_H - 20 * SCALE + randInt(3) * SCALE);
        } else {
            img(SPLASH, canvas.width / 2 - 30 * SCALE, (FIELD_TOP_TILES + headDemonY) * TILE_H - 20 * SCALE);
        }
        return;
    }
    if (headDemonY != -1) {
        if (!animReady(ms)) { return; }
        headDemonY--;
        return;
    }
}
