import * as croquet from "../util/croquetlib.js";
import {NUM_PLAYERS} from "./const.js";
// import {buttonState} from "../render/core/controllerInput.js";

window.names = [];
window.userID = -1;
for (let i = 0; i < 5 + 1; i++) window.names.push(false);
window.whoIndex = {};
let rightTriggerReleaseCount = 0;


let loadPresets = (preset) => {
    if (preset === undefined ) return;
    console.log("loading e playList to window.view.playerList")
    console.log(preset)
    if (window.view.playerList === undefined || window.view.playerList.length != NUM_PLAYERS) return;
    for (let i = 0; i < NUM_PLAYERS ; i++) {
        window.view.playerList[i].directions = [...preset[i].directions];
        window.view.playerList[i].positions = [...preset[i].positions];
        window.view.playerList[i].startFrameList = [...preset[i].startFrameList];
        window.view.playerList[i].endFrameList = [...preset[i].endFrameList];
    }
}

export let updateModel = e => {
    console.log("e")
    console.log(e)
    if (e.state["role"] === -1 && window.view.role !== -1) {
        console.log("e.state")
        console.log(e.state)
        window.view.role = e.state["whoIndex"][window.view.viewId]
        window.view.currTime = e.state["currTime"];
        loadPresets(e.preset)
    }
    if (!(e.who in window.whoIndex)) {
        for (let i = 0; i < 5 + 1; i++) {
            if (!window.names[i]) {
                window.whoIndex[e.who] = i - 1;
                window.names[i] = e.who;
                console.log("Name: ", window.names[i])
                console.log("Setting role of ", e.who, "to:", i - 1)
                console.log("Window.names:", window.names)
                console.log("window.whoIndex", window.whoIndex)
                return;
            }
        }
        console.error("Should never get here!!!")
    }

    if (window.view === undefined) {
        return;
    }
    console.assert(window.view !== undefined)
    const myViewId = window.view.viewId;
    // console.log("My viewId:", myViewId);
    // console.log("e.who");
    // console.log(e.who)
    if (e.who === myViewId && (e.what === "rightTriggerRelease" || e.what === "release")) {
        rightTriggerReleaseCount += 1;
    }
    if (window.startInit === undefined || window.startInit === false) {
        if (e.who === myViewId && rightTriggerReleaseCount === 10) {
            // if (e.who === myViewId && e.what === "release") {
            window.startInit = true;
            console.log(myViewId)
            console.log("e")
            console.log(e)
            console.log("Now can enter bbCoaching")
            console.log(window.view)

        }
    } else if (e.who === myViewId && rightTriggerReleaseCount === 20) {
        window.role = -1; // coach
        console.log("role set to coach")
    }
    console.log("R trigger no.", rightTriggerReleaseCount);


    // console.log(window)
}

export const init = async model => {
    croquet.register('croquetDemo_1.1666');
    model.animate(() => {
        // startInit = true;
    });
}