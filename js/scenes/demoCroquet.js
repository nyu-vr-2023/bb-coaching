import * as croquet from "../util/croquetlib.js";
import {NUM_PLAYERS} from "./const.js";
// import {buttonState} from "../render/core/controllerInput.js";


let rightTriggerReleaseCount = 0;


let loadPresets = (preset) => {
    if (preset === undefined) return;
    console.log("loading e playList to window.view.playerList")
    console.log(preset)
    if (window.view.playerList === undefined || window.view.playerList.length !== NUM_PLAYERS) return;
    for (let i = 0; i < NUM_PLAYERS; i++) {
        window.view.playerList[i].directions = [...preset[i].directions];
        window.view.playerList[i].positions = [...preset[i].positions];
        window.view.playerList[i].startFrameList = [...preset[i].startFrameList];
        window.view.playerList[i].endFrameList = [...preset[i].endFrameList];
    }
}

export let updateModel = e => {
    if (e.what === "move") {
        return;
    }
    console.log("e")
    console.log(e)

    if (window.view === undefined) {
        return;
    }

    console.assert(window.view !== undefined)
    if (e.state["role"] === -1 && window.view.role === undefined) {
        console.log("Getting roles from coach")
        console.log("e.state")
        console.log(e.state)
        window.view.role = e.state["whoIndex"][window.view.viewId]
    }

    if (e.state["role"] === -1 && window.view.role >= 0) {
        window.view.currTime = e.state["currTime"];
        loadPresets(e.preset)
    }

    const myViewId = window.view.viewId;
    if (window.view.role === -1 && e.state["startInit"] === true && !(e.who in window.whoIndex) && (e.who !== myViewId)) {
        console.log(e.who, "is a new member. welcome!")
        for (let i = 0; i < NUM_PLAYERS; i++) {
            if (!window.names[i]) {
                window.whoIndex[e.who] = i;
                window.names[i] = e.who;
                console.log("Name: ", window.names[i])
                console.log("Setting role of ", e.who, "to:", i)
                console.log("Window.names:", window.names)
                console.log("window.whoIndex", window.whoIndex)
                return;
            } else {
                console.assert(window.names[i] !== e.who);
            }
        }
        console.error("Should never get here!!!")
    }

    if (e.state["role"] === -1) {
        console.log("coach already selected")
        window.view.noCoach = false;
    }
    console.log("My role:", window.view.role);
    // console.assert((window.view.role !== undefined && window.view.role >= -1) || (window.view.noCoach || window.view.startInit === false));
    if (e.who === myViewId && (e.what === "rightTriggerRelease" || e.what === "release") && (window.view.noCoach || !window.view.startInit)) {
        console.assert(e.who === myViewId);
        rightTriggerReleaseCount += 1;
    }
    if (!window.view.startInit && e.who === myViewId && rightTriggerReleaseCount === 10) {
        // if (e.who === myViewId && e.what === "release") {
        window.view.startInit = true;
        console.log(myViewId)
        console.log("e")
        console.log(e)
        console.log("Now can enter bbCoaching")
        if (window.view.noCoach) {
            // assign self to coach
            console.log("Self assigned to coach")
            window.view.role = -1;
            window.names = [];
            window.userID = -1;
            for (let i = 0; i < 5 + 1; i++) window.names.push(false);
            window.whoIndex = {};
        }
        console.log(window.view)
    } else if (e.who === myViewId && rightTriggerReleaseCount === 20) {
        window.role = -1; // coach
        console.log("role set to coach")
    }
    console.log("R trigger no.", rightTriggerReleaseCount);


    // console.log(window)
}

export const init = async model => {
    croquet.register('croquetDemo_1.28890');
    model.animate(() => {
        // startInit = true;
    });
}