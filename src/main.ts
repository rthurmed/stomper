import kaplay from "kaplay";

const GAME_GRAVITY = 350;

const k = kaplay({
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    width: 800,
    height: 600,
    // letterbox: true,
    debug: true
});

k.debug.inspect = true;

k.setBackground(k.Color.fromHex("#fff275"));
k.setGravity(GAME_GRAVITY);

k.loadSprite("bean", "sprites/bean.png");

const game = k.add([
    k.timer()
]);

const camera = game.add([
    "controller",
    k.pos(),
    {
        offset: k.vec2(100, 0),
        accel: 4,
    }
]);

const floor = game.add([
    "floor",
    "structure",
    k.color(k.Color.WHITE),
    k.body({
        isStatic: true
    }),
    k.pos(0, k.height() - 100),
    k.rect(k.width(), 100),
    k.area()
]);

const bean = game.add([
    "char",
    k.sprite("bean"),
    k.anchor("bot"),
    k.pos(k.center()),
    k.body(),
    k.area(),
    {
        movement: k.vec2(),
        speed: k.vec2(300, 100),
        stomping: false
    }
]);

const player = game.add([
    "controller",
    {
        direction: k.vec2()
    }
]);

game.onUpdate(() => {
    const STOMP_MOVEMENT = 10;

    let shouldJump = false;
    let shouldStomp = false;
    player.direction = k.vec2();

    // capture
    if (k.isKeyDown("left")) {
        player.direction.x -= 1;
    }
    if (k.isKeyDown("right")) {
        player.direction.x += 1;
    }
    if (k.isKeyDown("up")) {
        player.direction.y = -1;
    }

    shouldStomp = !bean.isGrounded() && k.isKeyDown("down");
    shouldJump = bean.isGrounded() && k.isKeyDown("up");

    // apply
    bean.stomping = bean.stomping || shouldStomp;

    if (bean.stomping) {
        player.direction.y = STOMP_MOVEMENT;
    }

    bean.movement = k.lerp(bean.movement, player.direction.scale(bean.speed), k.dt() * 10);
    bean.move(bean.movement);

    if (shouldJump) {
        bean.jump(GAME_GRAVITY);
    }

    if (bean.isGrounded()) {
        bean.stomping = false;
    }

    // cam
    camera.pos = k.lerp(
        camera.pos,
        k.vec2(bean.pos.x, k.height() / 2).add(camera.offset),
        k.dt() * camera.accel
    );
    k.camPos(camera.pos);
});
