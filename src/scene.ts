import { AnchorComp, AreaComp, BodyComp, GameObj, SpriteComp, StateComp, PosComp, Vec2, LevelOpt, KaboomCtx, Comp, HealthComp, OpacityComp } from "kaplay";
import { chase } from "./comps/chase";
import { addLevelBlocks } from "./helpers/addLevelBlocks";

interface StomperLevelConfig {
    nextScene: string;
}

export function makePlayableLevel(k: KaboomCtx, level: StomperLevel, config: StomperLevelConfig = undefined) {
    const GAME_TILE = 64;
    const GAME_GRAVITY = k.getGravity();
    const UI_PADDING = 16;
    const CHAR_STOMP_MOVEMENT = 20;
    const CHAR_JUMP_STRENGTH = GAME_GRAVITY * .24;
    const CHAR_MAX_HP = 3;
    const CHAR_INVINCIBILITY_TIME = 3;
    const DOOR_OPEN_DELAY = 3;
    const SPIKE_JUMP_STRENGTH = .5;

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

    const ui = game.add([
        "controller",
        k.pos(UI_PADDING, UI_PADDING),
        k.fixed(),
        {
            hp: CHAR_MAX_HP,
            maxHP: CHAR_MAX_HP,
        }
    ])
    
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
            // "=": () => [
            //     "block",
            //     "structure",
            //     k.sprite("steel"),
            //     k.body({
            //         isStatic: true
            //     }),
            //     k.area()
            // ],
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
                k.opacity(1),
                k.health(CHAR_MAX_HP, CHAR_MAX_HP),
                {
                    movement: k.vec2(),
                    speed: k.vec2(575, 150),
                    lastStandingPoint: k.vec2(0, 0),
                    stomping: false,
                    invincible: false,
                }
            ],
            "D": () => [
                "door",
                k.sprite("door"),
                k.area(),
                k.z(-1),
            ],
            "k": () => [
                "key",
                "grabbable",
                k.state("float", ["float", "grabbed"]),
                k.sprite("key-o"),
                k.area(),
                k.anchor("bot"),
                k.z(2),
            ],
            "A": () => [
                "spike",
                "spike-bottom",
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

    const objs = addLevelBlocks(k, kaboomLevel, levelMap, {
        key: '=',
        tileWidth: GAME_TILE,
        tileHeight: GAME_TILE,
        sprite: "steel",
        comps: [
            "block",
            "structure",
            k.body({
                isStatic: true
            })
        ]
    });
    
    const character = kaboomLevel.get("character").at(0) as GameObj<AnchorComp | AreaComp | BodyComp | SpriteComp | StateComp | HealthComp | OpacityComp | PosComp | {
        movement: Vec2;
        speed: Vec2;
        lastStandingPoint: Vec2;
        stomping: boolean;
        invincible: boolean;
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
        k.rect(GAME_TILE * levelMap[0].length, GAME_TILE * 4), // filling all the level length
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

    character.onCollide("grabbable", (obj, col) => {
        const grabbable = obj as GameObj<AreaComp | PosComp>;

        // random position on top of the character to avoid overlapping
        // NOTE: still does overlap
        const offset = k.vec2(
            k.rand() * GAME_TILE * 2 - GAME_TILE / 2,
            GAME_TILE * -1 + k.rand() * (GAME_TILE / 4)
        );

        grabbable.collisionIgnore = ["character"];
        grabbable.use(chase(k, character, 4, offset));
    });

    character.onCollide("spike-bottom", (obj, col) => {
        if (character.invincible) {
            return;
        }
    
        character.hurt(1);

        ui.hp = character.hp();
        ui.maxHP = character.maxHP();

        character.movement.y = 0;
        character.stomping = false;
        character.jump(GAME_GRAVITY * SPIKE_JUMP_STRENGTH);

        character.invincible = true;
        character.opacity = .5;
        game.wait(CHAR_INVINCIBILITY_TIME, () => {
            character.invincible = false;
            character.opacity = 1;
            character.resolveCollision(obj);
        });
    });

    character.onDeath(() => {
        // TODO
        character.destroy();
    });

    const door = kaboomLevel.get("door").at(0) as GameObj<SpriteComp | AreaComp>;

    door.onCollide("key", async (obj, col) => {
        obj.destroy();
        door.use(k.color(k.Color.BLACK));
        if (config !== undefined && config.nextScene) {
            k.burp();
            k.wait(DOOR_OPEN_DELAY, () => {
                k.go(config.nextScene);
            });
        }
    });

    ui.onDraw(() => {
        for (let i = 0; i < ui.maxHP; i++) {
            k.drawSprite({
                sprite: "heart",
                pos: k.vec2(GAME_TILE * i, 0),
                color: i >= ui.hp ? k.Color.BLACK : k.Color.WHITE
            })
        }
    });

    return {
        game,
        player,
        camera,
        character
    }
}