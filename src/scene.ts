import { AnchorComp, AreaComp, BodyComp, GameObj, SpriteComp, StateComp, PosComp, Vec2, LevelOpt, KaboomCtx, Comp, HealthComp, OpacityComp } from "kaplay";
import { chase } from "./comps/chase";

export function makePlayableLevel(k: KaboomCtx, level: StomperLevel) {
    const GAME_TILE = 64;
    const GAME_GRAVITY = k.getGravity();
    const CHAR_STOMP_MOVEMENT = 20;
    const CHAR_JUMP_STRENGTH = GAME_GRAVITY * .24;

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
        k.state("player", ["player", "cinematic"]),
        {
            offset: k.vec2(150, -150),
            accel: 2,
        }
    ]);
    
    const levelConfig: LevelOpt = {
        tileWidth: GAME_TILE,
        tileHeight: GAME_TILE,
        tiles: {
            "o": () => [
                "bounceable",
                k.sprite("btfly-o"),
                k.anchor("center"),
                k.area(),
                k.z(-1),
                {
                    bounceableStrength: .3
                }
            ],
            "=": () => [
                "block",
                "structure",
                k.sprite("steel"),
                k.body({
                    isStatic: true
                }),
                k.area()
            ],
            "#": () => [
                "block",
                "structure",
                "breakable",
                k.sprite("steel"),
                k.health(3, 3),
                k.color(k.Color.RED),
                k.opacity(1),
                k.body({
                    isStatic: true
                }),
                k.area(),
                {
                    bounceableStrength: .15
                }
            ],
            "C": () => [
                "character",
                k.state("move", ["move", "stomp", "bounce"]),
                k.sprite("bean"),
                k.anchor("bot"),
                k.body(),
                k.area(),
                {
                    movement: k.vec2(),
                    speed: k.vec2(575, 150),
                    stomping: false,
                    lastStandingPoint: k.vec2(0, 0),
                }
            ],
            // TODO
            "D": () => [
                "door",
                k.sprite("door"),
                k.area(),
                k.z(-1),
            ],
            // TODO
            "k": () => [
                "key",
                "grabbable",
                k.state("float", ["float", "grabbed"]),
                k.sprite("key-o"),
                k.area(),
                k.anchor("bot"),
                k.z(2),
            ],
            // TODO
            "A": () => [
                "spike",
                "danger",
                k.sprite("spike"),
                k.area(),
                k.pos(0, GAME_TILE - 21),
                k.z(2),
            ],
            "c": () => [
                "baby",
                "grabbable",
                k.sprite("bean"),
                k.scale(.75),
                k.area(),
                k.pos(
                    k.rand(-GAME_TILE/2, GAME_TILE/2),
                    k.rand(-GAME_TILE/2, GAME_TILE/2) + GAME_TILE / 2
                ),
                k.anchor("bot"),
                k.z(2),
            ]
        }
    }
    
    const levelMap = level.map;
    const kaboomLevel = k.addLevel(levelMap, levelConfig);
    
    const character = kaboomLevel.get("character").at(0) as GameObj<AnchorComp | AreaComp | BodyComp | SpriteComp | StateComp | PosComp | {
        movement: Vec2;
        speed: Vec2;
        stomping: boolean;
        lastStandingPoint: Vec2;
    }>;
    const characterInitialPos = character.pos.clone();
    character.lastStandingPoint = characterInitialPos.clone();

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
        k.pos(GAME_TILE, GAME_TILE * levelMap.length), // bottom of the level
        k.rect(GAME_TILE * levelMap[0].length, GAME_TILE * 2), // filling all the level length
        k.area(),
        {
            bounceableStrength: .15
        }
    ]);
    
    character.onStateUpdate("move", () => {
        player.jump = false;
        player.stomp = false;
        player.direction = k.vec2();

        if (character.isGrounded()) {
            character.stomping = false;
            character.lastStandingPoint = character.pos.clone();
        }
    
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
    
        player.jump = character.isGrounded() && k.isKeyDown("up");
        player.stomp = !character.isGrounded() && (k.isKeyPressed("down") || k.isKeyReleased("space"));
    
        if (player.stomp) {
            // bean.enterState("stomp");
            // TODO
        }
    
        // apply
        character.stomping = character.stomping || player.stomp;
        if (character.stomping) {
            player.direction.y = CHAR_STOMP_MOVEMENT;
        }
    
        character.movement = k.lerp(character.movement, player.direction.scale(character.speed), k.dt() * 10);
        character.move(character.movement);
    
        if (player.jump) {
            character.jump(CHAR_JUMP_STRENGTH);
        }
    
        character.flipX = player.flipX;
    
        // workaround for weird kaboom physics glitch
        if (character.pos.y > 1000) {
            character.pos = characterInitialPos;
        }
    });
    
    camera.onStateUpdate("player", () => {
        const offset = camera.offset // .scale(player.flipX ? -1 : 1, 1);
        camera.pos = k.lerp(
            camera.pos,
            k.vec2(
                character.pos.x,
                character.lastStandingPoint.y,
            ).add(offset),
            k.dt() * camera.accel
        );
        k.camPos(camera.pos);
    });
    
    character.onCollide("bounceable", (obj, col) => {
        const keep = obj.is("bounceable-keep");
        const stompOnly = obj.is("bounceable-stomp");
        const strength = !("bounceableStrength" in obj) ? 1 : obj.bounceableStrength;
    
        if (stompOnly && character.stomping === false) {
            return;
        }
    
        if (col.isBottom()) {
            character.movement.y = 0;
            character.stomping = false;
            character.jump(GAME_GRAVITY * strength);
            if (!keep) {
                obj.destroy();
            }
        }
    });

    character.onCollide("breakable", (obj, col) => {
        const breakable = obj as GameObj<BodyComp | HealthComp | OpacityComp>;
        const strength = !("bounceableStrength" in obj) ? 1 : obj.bounceableStrength;

        if (col.isBottom() && character.stomping) {
            breakable.hurt(1);
            breakable.opacity = breakable.hp() / breakable.maxHP();
            
            if (breakable.hp() <= 0) {
                breakable.destroy();
            }

            // FIXME: this needs to be called again because this logic
            // conflicts with the bounceable reset logic.
            // Must move stomping to a character state to fix it
            character.movement.y = 0;
            character.stomping = false;
            character.jump(GAME_GRAVITY * strength);
        }
    });

    k.onCollide("character", "grabbable", (a, b) => {
        const character = a as GameObj<BodyComp | PosComp>;
        const grabbable = b as GameObj<AreaComp | PosComp>;

        // random position on top of the character to avoid overlapping
        // NOTE: still does overlap
        const offset = k.vec2(
            k.rand() * GAME_TILE * 2 - GAME_TILE / 2,
            GAME_TILE * -1 + k.rand() * (GAME_TILE / 4)
        );

        grabbable.collisionIgnore = ["character"];
        grabbable.use(chase(k, character, 4, offset));
    });

    return {
        game,
        player,
        camera,
        character
    }
}