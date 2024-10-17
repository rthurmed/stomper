import kaplay, { AnchorComp, AreaComp, BodyComp, GameObj, SpriteComp, StateComp, PosComp, Vec2 } from "kaplay";

const GAME_TILE = 64;
const GAME_GRAVITY = 500;
const STOMP_MOVEMENT = 10;

const k = kaplay({
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    // width: 800,
    // height: 600,
    // letterbox: true,
    debug: true
});

// k.debug.inspect = true;

k.setBackground(k.Color.fromHex("#fff275"));
k.setGravity(GAME_GRAVITY);

k.loadSprite("bean", "sprites/bean.png");
k.loadSprite("door", "sprites/door.png");
k.loadSprite("steel", "sprites/steel.png");
k.loadSprite("spike", "sprites/spike.png");
k.loadSprite("key-o", "sprites/key-o.png");
k.loadSprite("btfly-o", "sprites/btfly-o.png");

const game = k.add([
    k.timer()
]);

const player = game.add([
    "controller",
    {
        direction: k.vec2(),
        stomp: false,
        jump: false,
        flipX: false,
    }
]);

const camera = game.add([
    "controller",
    k.pos(),
    {
        offset: k.vec2(150, -100),
        accel: 3,
    }
]);

const currentLevel = [
    "                         ",
    "                         ",
    "                         ",
    "       k                 ",
    "                  D      ",
    "             o   ===     ",
    "     ===                 ",
    "          o          o   ",
    "                o        ",
    "     c      o  =   =   o ",
    "          o   ==AAA==    ",
];

const level = k.addLevel(currentLevel, {
    tileWidth: GAME_TILE,
    tileHeight: GAME_TILE,
    tiles: {
        "o": () => [
            "bounceable",
            k.sprite("btfly-o"),
            k.anchor("center"),
            k.area(),
            k.z(-1),
        ],
        "=": () => [
            "floor",
            "structure",
            "bounceable",
            "bounceable-stomp",
            "bounceable-keep",
            k.sprite("steel"),
            k.body({
                isStatic: true
            }),
            k.area(),
            {
                bounceableStrength: .25
            }
        ],
        "c": () => [
            "char",
            k.state("move", ["move", "stomp", "bounce"]),
            k.sprite("bean"),
            k.anchor("bot"),
            k.body(),
            k.area(),
            {
                movement: k.vec2(),
                speed: k.vec2(300, 100),
                stomping: false
            }
        ],
        // TODO
        "D": () => [
            "door",
            k.sprite("door"),
            k.area(),
        ],
        // TODO
        "k": () => [
            "key",
            "grabable",
            k.sprite("key-o"),
            k.area()
        ],
        // TODO
        "A": () => [
            "spike",
            "danger",
            k.sprite("spike"),
            k.area(),
            k.pos(0, GAME_TILE - 21)
        ]
    }
});

const bean = level.get("char").at(0) as GameObj<AnchorComp | AreaComp | BodyComp | SpriteComp | StateComp | PosComp | {
    movement: Vec2;
    speed: Vec2;
    stomping: boolean;
}>;
const beanInitialPos = bean.pos.clone();

const floor = game.add([
    "floor",
    "structure",
    "bounceable",
    "bounceable-stomp",
    "bounceable-keep",
    k.color(k.Color.WHITE),
    k.outline(4, k.Color.BLACK),
    k.body({
        isStatic: true
    }),
    k.pos(GAME_TILE, GAME_TILE * currentLevel.length), // bottom of the level
    k.rect(GAME_TILE * currentLevel[0].length, GAME_TILE * 2), // filling all the level length
    k.area(),
    {
        bounceableStrength: .25
    }
]);

bean.onStateUpdate("move", () => {
    player.jump = false;
    player.stomp = false;
    player.direction = k.vec2();

    // capture
    if (k.isKeyDown("left")) {
        player.direction.x -= 1;
        player.flipX = true;
    }
    if (k.isKeyDown("right")) {
        player.direction.x += 1;
        player.flipX = false;
    }
    if (k.isKeyDown("up")) {
        player.direction.y = -1;
    }

    player.jump = bean.isGrounded() && k.isKeyDown("up");
    player.stomp = !bean.isGrounded() && (k.isKeyDown("down") || k.isKeyReleased("space"));

    if (player.stomp) {
        // bean.enterState("stomp");
        // TODO
    }

    // apply
    bean.stomping = bean.stomping || player.stomp;
    if (bean.stomping) {
        player.direction.y = STOMP_MOVEMENT;
    }

    bean.movement = k.lerp(bean.movement, player.direction.scale(bean.speed), k.dt() * 10);
    bean.move(bean.movement);

    if (player.jump) {
        bean.jump(GAME_GRAVITY * .5);
    }

    if (bean.isGrounded()) {
        bean.stomping = false;
    }

    bean.flipX = player.flipX;

    // workaround for weird kaboom physics glitch
    if (bean.pos.y > 1000) {
        bean.pos = beanInitialPos;
    }

    // cam
    const flippedOffset = camera.offset.scale(player.flipX ? -1 : 1, 1);
    camera.pos = k.lerp(
        camera.pos,
        k.vec2(bean.pos).add(flippedOffset),
        k.dt() * camera.accel
    );
    k.camPos(camera.pos);
});

bean.onCollide("bounceable", (obj, col) => {
    const keep = obj.is("bounceable-keep");
    const stompOnly = obj.is("bounceable-stomp");
    const strength = !("bounceableStrength" in obj) ? 1 : obj.bounceableStrength;

    if (stompOnly && bean.stomping === false) {
        return;
    }

    if (col.isBottom()) {
        bean.movement.y = 0;
        bean.stomping = false;
        bean.jump(GAME_GRAVITY * strength);
        if (!keep) {
            obj.destroy();
        }
    }
});
