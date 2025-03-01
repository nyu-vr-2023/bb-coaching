import * as global from "../global.js";
import * as cg from "../render/core/cg.js";
import {Gltf2Node} from "../render/nodes/gltf2.js";
import {g2} from "../util/g2.js";
import {buttonState, joyStickState, viewMatrix} from "../render/core/controllerInput.js";
import {COLORS, MAX_TIME} from "./const.js";
import {gltfRoot} from "../global.js";
import {quat} from "../render/math/gl-matrix.js";

// Total time for the tatic is 24s
const TOTAL_TIME = 24;
const NUM_POINTS_ON_BOARD = 48;     // The total number of points 
                                    // drawing on the playerBoard for each player for 24s
const numTimeFrames = 720;          // Number of the frames for 24s
const numTimeButtons = 24;          // Number of time buttons in the board

let currTimeframe = 0
let HUDIsShown = false;      // press right[1] to show hud, press again to hide it
let hudButtonLock = false;
let currPlayerIndex = -1;
let drawButtonLock = false;
let delta_time = 0;
let last_time = 0;
let isPlaying = false;
let isPausing = true;

// The frame gap between 2 time buttons.
let timeButtonGap = numTimeFrames / numTimeButtons;
// The refresh time of motion in the scene.
let moveFreshTime = TOTAL_TIME / numTimeFrames;

let hudButtonHandler = () => {
    if (buttonState.right[1] && buttonState.right[1].pressed && !hudButtonLock) {
        HUDIsShown = !HUDIsShown;
        hudButtonLock = true;
    }

    if (buttonState.right[1] && !buttonState.right[1].pressed) {
        hudButtonLock = false;
    }
}

let initialPosList = [[-.6, .4, 0], [.6, .4, 0], [-.9, .9, 0], [.3, .7, 0], [.9, .9, 0]]

// let initialPosList = [[0., 0., 0], [0., 0, 0], [0, 0, 0], [.3, .7, 0], [.9, .9, 0]]

class Player {
    constructor(gltfUrl, index, initialPosition, c) {
        this.node = new Gltf2Node({url: gltfUrl});
        global.gltfRoot.addNode(this.node);
        this.initialPosition = initialPosition;
        this.index = index;
        this.color = c;

        // store the position of each time frame for this player
        this.positions = Array.from({length: numTimeFrames}, () => Object.assign([], initialPosition));
        this.directions = Array(numTimeFrames).fill(0);

        // split movingPair into startFrameList and endFrameList for trackpad use.
        this.startFrameList = [];
        this.endFrameList = [];
    }

    pos3D(t) {
        return this.positions[t]
    }

    pos2D(t) {
        return this.positions[t].slice(0, 2)
    }

    update(t) {
        this.node.matrix = cg.mMultiply(cg.mTranslate(this.positions[t][0] * Court.width, this.positions[t][2], -this.positions[t][1] * Court.height), cg.mRotateY(this.directions[t]))
    }

    // set all the positions later than the current last end pos to be same as the current last end pos.
    setAllFromEnd(last_end, setDirect) {
        for (let i = last_end + 1; i < numTimeFrames; i++) {
            this.positions[i][0] = this.positions[last_end][0];
            this.positions[i][1] = this.positions[last_end][1];
            if (setDirect) {
                this.directions[i] = this.directions[last_end];
            }
        }
    }

    // set all the position before the initial pos to be same as initial
    setAllToInitial(initial, setDirect) {
        for (let i = 0; i < initial; i++) {
            this.positions[i][0] = this.positions[initial][0];
            this.positions[i][1] = this.positions[initial][1];
            if (setDirect) {
                this.directions[i] = this.directions[initial];
            }
        }
    }

    resetPosAndDirect() {
        for (let i = 0; i < numTimeFrames; i++) {
            this.positions[i][0] = this.initialPosition[0];
            this.positions[i][1] = this.initialPosition[1];
            this.directions[i] = 0;
        }
    }
}

class Court {
    static width = 15 / 4
    static height = 28 / 4

    constructor(gltfUrl) {
        this.node = new Gltf2Node({url: gltfUrl})
        global.gltfRoot.addNode(this.node)
        this.direction = 0
    }

    static position2DTo3D(pos2D) {
        return [pos2D[0], pos2D[1], 0]
    }
}


export const init = async model => {
    model.setTable(false)
    model.setRoom(false)
    let currCourt = new Court('./media/gltf/bbCourt/scene.gltf')
    let boardBase = model.add()
    let fieldMap = boardBase.add('cube').texture('../media/textures/field.png');

    let playerList = []

    const numPlayers = 5

    for (let i = 0; i < numPlayers; i++) {
        playerList.push(new Player("./media/gltf/Basketball_Player/Basketball_Player.gltf", i, initialPosList[i], COLORS[i]));
    }

    let tacticBoard = boardBase.add('cube').texture(() => {
        g2.setColor('white');
        g2.fillRect(0, 0, 1, 1);
        g2.textHeight(.04)
        g2.setColor('blue');
        g2.setColor('black');
        g2.textHeight(.03);
        g2.textHeight(.05);
        g2.fillText('Tactic Board', .5, .95, 'center');

        // draw timeButton label
        g2.textHeight(.03);
        g2.fillText('↑', .55, .805, 'center');
        g2.fillText('0s', .55, .78, 'center');
        g2.fillText('↑', .965, .805, 'center');
        g2.fillText('23s', .965, .78, 'center');
        g2.fillText('-- Time Frames --', .76, .79, 'center');
        g2.drawWidgets(tacticBoard);
    });

    tacticBoard.timeButton = [];                                                //array of size 24 used to store the time button widgets
    tacticBoard.visible = false;
    tacticBoard.ID = -1;
    tacticBoard.view = "global"
    tacticBoard.timeFrameValue = 0;
    tacticBoard.setTime = (timeStamp) => {
        tacticBoard.timeButton[Math.floor(tacticBoard.timeFrameValue / timeButtonGap)].updateColor('#a0aaba');
        tacticBoard.timeFrameValue = timeStamp;
        tacticBoard.timeButton[Math.floor(tacticBoard.timeFrameValue / timeButtonGap)].updateColor('#37373f');
    }
    tacticBoard.currTimeframe = currTimeframe;

    // add trackpad
    g2.addTrackpad(tacticBoard, .25, .47, '#fad4d4', ' ', () => {
    }, 1, playerList, timeButtonGap);

    // add buttons for all players
    for (let i = 0; i < numPlayers; i++) {
        g2.addWidget(tacticBoard, 'button', .65, .12 + i * .14, COLORS[i], ' #' + i + ' ', () => {
            tacticBoard.visible = false
            playerBoard.visible = true
            boardBase._children = [playerBoard, fieldMap]
            playerBoard.ID = i;
            currPlayerIndex = i;
            playerBoard.path = [];
            playerBoard.drawMode = false;

            updateTimeButtonInPlayerBoard();
        }, 0.9);

        g2.addWidget(tacticBoard, 'button', .85, .12 + i * .14, COLORS[i], "View", () => {
            if (tacticBoard.view == "global") {
                // set translation
                let viewTranslate;
                if (window.vr) {
                    viewTranslate = [0, 0, 1];
                } else {
                    viewTranslate = [0, 0, 4];
                }
                let posPlayer = playerList[i].positions[currTimeframe];
                let posScene = [posPlayer[0] * Court.width, posPlayer[2], -posPlayer[1] * Court.height]
                global.gltfRoot.translation = cg.add(viewTranslate, cg.scale(posScene, -1))

                // set rotation
                // let rotation = quat.create();
                // let angel = playerList[i].directions[currTime] - Math.PI / 2;
                // console.log("rotation angel:")
                // quat.rotateY(rotation, rotation, playerList[i].directions[currTime] - Math.PI / 2);
                // global.gltfRoot.rotation = rotation

                tacticBoard.view = "local";
            } else {
                global.gltfRoot.translation = [0, 0, 0];
                global.gltfRoot.rotation = [0, 0, 0, 1];
                tacticBoard.view = "global";
            }


        }, .9);
    }

    // add play button
    g2 .addWidget(tacticBoard, 'button', .815, .93, '#a0aaba', "►", () => {
        if (isPausing === true) {
            isPausing = false
        }
        if (isPlaying === false) {
            isPlaying = true;
            currTimeframe = 0;
            last_time = model.time;
            delta_time = 0;
            tacticBoard.setTime(0);
        }
    })

    // add pause button
    g2 .addWidget(tacticBoard, 'button', .90, .93, '#a0aaba', "||", () => {
        if (isPlaying === true && isPausing === false) {
            isPausing = true;
        }
    })

    // add reset button
    g2.addWidget(tacticBoard, 'button', .72, .93, '#a0aaba', "◼︎", () => {
        if (isPlaying === true) {
            isPlaying = false;
            isPausing = true;
            currTimeframe = 0;
            tacticBoard.setTime(0);
            last_time = model.time;
            delta_time = 0;
        }
    })

    // add time buttons for tactic board
    for (let i = 0; i < numTimeButtons; i++) {
        tacticBoard.timeButton.push(g2.addWidget(tacticBoard, 'button', .55 + i * .018, .84, '#a0aaba', " ", () => {
            currTimeframe = i * timeButtonGap;
            tacticBoard.setTime(currTimeframe);
        }, 0.36));
    }

    tacticBoard.identity().scale(.9, .9, .0001).opacity(0);
    fieldMap.identity().move(-0.45, -0.045, 0.0002).scale(.70, .76, .0001).opacity(0.2);


    // update the color of each time button based on the player and time frame selected in the player board
    let updateTimeButtonInPlayerBoard = () => {
        let currBoard = boardBase._children[0];
        let currPlayer = playerList[currPlayerIndex];
        let startIndex = 0;
        let endIndex = 0;

        for (let j = 0; j < numTimeButtons; j++) {
            let startFrame = startIndex < currPlayer.startFrameList.length ? currPlayer.startFrameList[startIndex] : -1;
            let endFrame = endIndex < currPlayer.endFrameList.length ? currPlayer.endFrameList[startIndex] : -1;
            let withinRange = false;
            let startFrame_buttonIndx = Math.floor(startFrame / timeButtonGap);
            let endFrame_buttonIndx = Math.floor(endFrame / timeButtonGap);
            if (j === startFrame_buttonIndx || (startFrame_buttonIndx < j && j < endFrame_buttonIndx)) {
                withinRange = true;
            } else if (j === endFrame_buttonIndx) {
                withinRange = true;
                startIndex += 1
                endIndex += 1;
            }

            if (currPlayerIndex !== -1 && withinRange) {
                currBoard.timeButton[j].updateColor(COLORS[currPlayerIndex]);
            } else {
                currBoard.timeButton[j].updateColor('#a0aaba');
            }
        }
    }

    // create player boards
    let playerBoard = boardBase.add('cube').texture(() => {
        let i = currPlayerIndex
        let currPlayer = playerList[i];
        g2.setColor('white');
        g2.fillRect(0, 0, 1, 1);
        g2.textHeight(.04)
        g2.setColor('blue');
        g2.setColor('black');
        g2.textHeight(.03);
        g2.textHeight(.05);
        if (!playerBoard.drawMode) {
            g2.fillText('Player' + i + 'Board', .5, .95, 'center');
        } else {
            g2.fillText('Player' + i + 'Board' + ' (Draw Mode)', .5, .95, 'center');
        }
        //print initial position
        let initialPos = currPlayer.startFrameList.length === 0 ? 0 : currPlayer.startFrameList[0];
        g2.fillText((currPlayer.positions[initialPos][0].toFixed(1)) + ',' + (currPlayer.positions[initialPos][1].toFixed(1)), .9, .68, 'center');

        //print existing movements start and end time
        for (let j = 0; j < Math.min(4, currPlayer.startFrameList.length); j++) {
            g2.fillText(Math.floor(currPlayer.startFrameList[j] / timeButtonGap).toString(), .73, .68 - 0.08 * (j + 1), 'center');
            if (j < currPlayer.endFrameList.length) {
                g2.fillText('-', .77, .68 - 0.08 * (j + 1), 'center');
                g2.fillText((Math.floor(currPlayer.endFrameList[j] / timeButtonGap)).toString(), .81, .68 - 0.08 * (j + 1), 'center');
            }
        }
        // draw timeButton label
        g2.textHeight(.03);
        g2.fillText('↑', .51, .865, 'center');
        g2.fillText('0s', .51, .84, 'center');
        g2.fillText('↑', .961, .865, 'center');
        g2.fillText('23s', .961, .84, 'center');
        g2.fillText('-- Time Frames --', .72, .85, 'center');

        g2.drawWidgets(playerBoard);
    });

    playerBoard.timeButton = [];                                                //array used to store the time button widgets
    playerBoard.moveButton = [];                                                // button that indicates the movements of the ith player
    playerBoard.startEditingMovement = false;                          // true by clicking add movement -> can create new movement
    playerBoard.frameStart = -1;                                        //-1 if haven't set start time; start time if setting end time
    playerBoard.frameEnd = -1;                                          //-1 if haven't set end time;
    playerBoard.visible = false;
    playerBoard.ID = 0;
    playerBoard.drawMode = false;
    playerBoard.path = [];
    playerBoard.drawGap = numTimeFrames / NUM_POINTS_ON_BOARD;

    playerBoard.identity().scale(.9, .9, .0001).opacity(0);

// Add time buttons for the player i
    for (let k = 0; k < numTimeButtons; k++) {
        playerBoard.timeButton.push(g2.addWidget(playerBoard, 'button', .51 + k * .018, .90, '#a0aaba', " ", () => {
            let frameIndx = timeButtonGap * k;
            currTimeframe = frameIndx;
            if (playerBoard.startEditingMovement) {
                let currPlayer = playerList[playerBoard.ID];
                let lastEnd = currPlayer.endFrameList.length > 0 ? currPlayer.endFrameList[currPlayer.endFrameList.length - 1] : 0;
                if (playerBoard.frameStart === -1 && frameIndx >= lastEnd) {
                    playerBoard.frameStart = frameIndx;
                    playerBoard.frameEnd = -1;
                    currPlayer.startFrameList.push(frameIndx);
                } else if (playerBoard.frameEnd === -1 && frameIndx > playerBoard.frameStart) {
                    playerBoard.frameEnd = frameIndx;
                    currPlayer.endFrameList.push(frameIndx);
                    playerBoard.frameStart = -1;

                    playerBoard.startEditingMovement = false;
                }
                updateTimeButtonInPlayerBoard()
            }
        }, 0.36));
    }
    g2.addWidget(playerBoard, 'button', .75, .2, '#0cdfe0', "RETURN", () => {
        boardBase._children = [tacticBoard, fieldMap]
        playerBoard.visible = false;
        tacticBoard.visible = true;
        playerBoard.drawMode = false;
        playerBoard.path = [];
        currTimeframe = 0;
        tacticBoard.setTime(0);
    }, 0.9);

    g2.addWidget(playerBoard, 'button', .6, .78, '#d965bb', "ADD", () => {
        playerBoard.startEditingMovement = true
        playerBoard.drawMode = false;
        playerBoard.path = [];
    }, 0.6)

// Add delete button to delete the last interval
    g2.addWidget(playerBoard, 'button', .8, .78, '#7064e0', "DELETE", () => {
        let currPlayer = playerList[playerBoard.ID];
        if (currPlayer.startFrameList.length === currPlayer.endFrameList.length && currPlayer.startFrameList.length >= 0) {
            currPlayer.startFrameList.pop();
            currPlayer.endFrameList.pop();

            if (currPlayer.endFrameList.length > 0) {
                let last_end = currPlayer.endFrameList[currPlayer.endFrameList.length - 1];
                currPlayer.setAllFromEnd(last_end, true);
                playerBoard.frameEnd = last_end;
            } else {
                currPlayer.resetPosAndDirect();
            }
            updateTimeButtonInPlayerBoard();
        }
    }, 0.6)

    g2.addWidget(playerBoard, 'button', .6, .68, '#a0aaba', "initial POS", () => {
    }, 0.6)

    for (let j = 1; j < 5; j++) {
        playerBoard.moveButton.push(g2.addWidget(playerBoard, 'button', .6, .68 - 0.08 * j, '#a0aaba', "move " + j, () => {
        }, 0.6));
    }
    g2.addTrackpad(playerBoard, .25, .47, '#fad4d4', ' ', () => {
    }, 1, playerList, timeButtonGap);

    let isDrawingMode = () => playerList[playerBoard.ID].endFrameList.length > 0
        && playerList[playerBoard.ID].endFrameList.length === playerList[playerBoard.ID].startFrameList.length

// handle the on/off of drawMode. Same logic as HudButtonHandler().
    let drawButtonHandler = () => {
        if (isDrawingMode()) {
            if (buttonState.right[4] && buttonState.right[4].pressed && !drawButtonLock) {
                playerBoard.drawMode = !playerBoard.drawMode;
                drawButtonLock = true;
            }

            if (buttonState.right[4] && !buttonState.right[4].pressed) {
                drawButtonLock = false;
            }
        } else {
            drawButtonLock = false;
        }
    }

    let changeDirection = () => {
        if (currTimeframe >= 0) {
            console.assert(currPlayerIndex >= 0)
            playerList[currPlayerIndex].directions[currTimeframe] += 2 * model.deltaTime * joyStickState.right.x;
            if (joyStickState.right.x)
                console.log("directions:", playerList[currPlayerIndex].directions)
        }
    }

    let movementPlayHandler = () => {
        if (isPlaying && !isPausing) {
            delta_time += model.time - last_time;
            last_time = model.time;
            if (delta_time >= moveFreshTime) {
                if (currTimeframe < numTimeFrames - 1) {
                    currTimeframe += 1;
                    delta_time = 0;
                    tacticBoard.setTime(currTimeframe);
                } else {
                    isPlaying = false;
                    isPausing = true;
                }
            }
        }
    }

    model.animate(() => {
        boardBase.identity().boardHud().scale(1.3);


        // console.log("viewMatrix")
        // console.log(getMatrixXYZ(viewMatrix[0]))
        // console.log(viewMatrix)
        // console.log("global.gltfRoot.rotation")
        // console.log(global.gltfRoot.rotation)
        hudButtonHandler();
        if (playerBoard.visible) {
            // current board is player board
            drawButtonHandler();
            changeDirection()
        }

        if (HUDIsShown) {
            if (boardBase._children.length === 0) {
                boardBase._children = [tacticBoard, fieldMap]
                tacticBoard.visible = true;
            }
        } else {
            if (boardBase._children.length > 0) {
                boardBase._children[0].visible = false;
                boardBase._children = [];
                tacticBoard.visible = false;
            }

        }
        for (let i = 0; i < numPlayers; i++) {
            playerList[i].update(currTimeframe)
        }

        movementPlayHandler();
    });
}

