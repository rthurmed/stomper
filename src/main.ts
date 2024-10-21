import kaplay from "kaplay";
import { levels } from "./levels";
import { makePlayableLevel } from "./scene";

const k = kaplay({
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    // width: 800,
    // height: 600,
    // letterbox: true,
    debug: true
});

// k.debug.inspect = true;

k.setBackground(k.Color.fromHex("#fff275"));
k.setGravity(4500);

k.loadSprite("bean", "sprites/bean.png");
k.loadSprite("door", "sprites/door.png");
k.loadSprite("steel", "sprites/steel.png");
k.loadSprite("spike", "sprites/spike.png");
k.loadSprite("heart", "sprites/heart.png");
k.loadSprite("key-o", "sprites/key-o.png");
k.loadSprite("btfly-o", "sprites/btfly-o.png");

function setupDebugLevelSwitch() {
    k.onKeyPress("1", () => (k.go("test1")));
    k.onKeyPress("2", () => (k.go("test2")));
    k.onKeyPress("r", () => (k.go(k.getSceneName())));
}

k.scene("test1", () => {
    makePlayableLevel(k, levels.test1, {
        nextScene: "test2"
    });
    setupDebugLevelSwitch();
});

k.scene("test2", () => {
    makePlayableLevel(k, levels.test2);
    setupDebugLevelSwitch();
});

k.go("test1");
