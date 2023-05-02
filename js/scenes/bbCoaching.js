import * as global from "../global.js";
import * as cg from "../render/core/cg.js";
import {Gltf2Node} from "../render/nodes/gltf2.js";
import {g2} from "../util/g2.js";
import {buttonState, joyStickState} from "../render/core/controllerInput.js";
import {COLORS, MAX_TIME} from "./const.js";
import {resampleCurve} from "../render/core/cg.js";

let currTime = 0
let HUDIsShown = false;      // press right[1] to show hud, press again to hide it
let hudButtonLock = false;
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

class Player {
    constructor(gltfUrl, index, initialPosition, c) {
        this.node = new Gltf2Node({url: gltfUrl});
        global.gltfRoot.addNode(this.node);
        this.initialPosition = initialPosition;
        this.index = index;
        this.color = c;
        // store the position of each time frame for this player
        this.positions = Array.from({length: 24}, () => Object.assign([], initialPosition));
        this.directions = Array(24).fill(0);
        // check if a specific time frame is within a movement, and be used to find the start/end of a move.
        this.isMoving = Array(24).fill(false);
    }

    // get the start and end time frame of the move
    // if no action selected return [24,23]
    // if start point selected but no end point return [s,s], s is the selected point.
    // if start and end both selected, return [s,e], s < e.
    getStartAndEnd() {
        let t = 0;
        while (t < MAX_TIME && !this.isMoving[t]) {
            t++;
        }
        let start = t;
        while (t < MAX_TIME && this.isMoving[t]) {
            t++;
        }
        let end = t - 1;
        return [start, end];
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

class States {
    let currentPlayer = -1
}

export const init = async model => {
    model.setTable(false)
    model.setRoom(false)
    let currCourt = new Court('./media/gltf/bbCourt/scene.gltf')
    let boardBase = model.add()
    let fieldMap = boardBase.add('cube').texture('../media/textures/field.png');

    let playerList = []
    let playerBoardList = []
    const numPlayers = 5
    let currentPlayer = -1                              // when no player selected, should be -1.

    for (let i = 0; i < numPlayers; i++) {
        playerList.push(new Player("./media/gltf/Basketball_Player/Basketball_Player.gltf", i, initialPosList[i], COLORS[i]));
    }

    let tacticBoard = boardBase.add('cube').texture(() => {
        g2.setColor('white');
        g2.fillRect(0, 0, 1, 1);
        g2.textHeight(.04)
        g2.setColor('blue');
        // g2.fillText('Moving Player: #' + (tacticBoard.currPlayer + 1), .75, .84, 'center');
        g2.setColor('black');
        g2.textHeight(.03);
        for (let i = 0; i < playerList.length; i++) {
            // mark the selected player
            if (i === currentPlayer) {
                g2.textHeight(.08);
                g2.fillText('*', .55, .12 + i * .14, 'center');
                g2.textHeight(.03);
            }
        }
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
    tacticBoard.isPlayerBoard = false;

    // add trackpad
    g2.addTrackpad(tacticBoard, .25, .47, '#ff8080', ' ', () => {
    }, 1, playerList, tacticBoard);

    // add buttons for all players
    for (let i = 0; i < numPlayers; i++) {
        g2.addWidget(tacticBoard, 'button', .65, .12 + i * .14, COLORS[i], '#' + i, () => {
            boardBase._children = [playerBoardList[i], fieldMap]
            currentPlayer = i;
        }, 0.9);
    }

    for (let i = 0; i < 24; i++) {
        tacticBoard.timeButton.push(g2.addWidget(tacticBoard, 'button', .55 + i * .018, .84, '#a0aaba', " ", () => {
        }, 0.36));
    }

    tacticBoard.identity().scale(.9, .9, .0001).opacity(0);
    fieldMap.identity().move(-0.45, -0.045, 0.0002).scale(.70, .76, .0001).opacity(0.2);

    // update the color of each time button based on the player and time frame selected
    let updateTimeButtonInPlayerBoard = () => {
        console.assert(currentPlayer !== -1)
        let currBoard = boardBase._children[0];
        for (let j = 0; j < 24; j++) {
            // console.log("playerList: ", playerList)
            // console.log("playerList[tacticBoard.currPlayer]: ", playerList[tacticBoard.currPlayer])
            if (playerList[currentPlayer].isMoving[j]) {
                currBoard.timeButton[j].updateColor(COLORS[currentPlayer]);
            } else {
                currBoard.timeButton[j].updateColor('#a0aaba');
            }
        }
    }

    for (let i = 0; i < numPlayers; i++) {                                                          //create player board
        let playerBoard = boardBase.add('cube').texture(() => {
            g2.setColor('white');
            g2.fillRect(0, 0, 1, 1);
            g2.textHeight(.04)
            g2.setColor('blue');
            g2.setColor('black');
            g2.textHeight(.03);
            g2.textHeight(.05);
            g2.fillText('Player' + i + 'Board', .5, .95, 'center');

            // draw timeButton label
            g2.textHeight(.03);
            g2.fillText('↑', .51, .865, 'center');
            g2.fillText('0s', .51, .84, 'center');
            g2.fillText('↑', .961, .865, 'center');
            g2.fillText('23s', .961, .84, 'center');
            g2.fillText('-- Time Frames --', .72, .85, 'center');
            g2.drawWidgets(playerBoard);
        });

        playerBoardList.push(playerBoard);
        playerBoard.timeButton = [];                                                //array used to store the time button widgets
        playerBoard.moveButton = [];
        playerBoard.currentEditingMovement = -1;
        playerBoard.timeStart = -1;                                        //-1 if setting start time; start time if setting end time; assert currentEditingMovement !== -1
        playerBoard.isPlayerBoard = true;

        playerBoard.identity().scale(.9, .9, .0001).opacity(0);

        // Add timebuttons for the player i
        for (let k = 0; k < 24; k++) {
            playerBoard.timeButton.push(g2.addWidget(playerBoard, 'button', .51 + k * .018, .90, '#a0aaba', " ", () => {
                currTime = k;
                console.log("i: ", i)
                // console.assert(currentPlayer === i)
                if (currentPlayer.currentEditingMovement !== -1) {
                    console.log("time button clicked")
                    console.log("current player: ", currentPlayer)
                    if (playerBoard.timeStart === -1) {
                        console.log("Setting start time")
                        console.log("playerBoard.timeStart:", playerBoard.timeStart)
                        playerBoard.timeStart = currTime;
                        playerList[currentPlayer].isMoving[currTime] = true;
                        // playerBoard.timeButton[currTime].updateColor(COLORS[currentPlayer]);
                    } else {
                        console.log("Setting end time to:  ", currTime)
                        for (let j = playerBoard.timeStart; j < currTime + 1; j++) {
                            playerList[currentPlayer].isMoving[j] = true;
                        }
                    }
                    updateTimeButtonInPlayerBoard()
                }
            }, 0.36));
        }
        g2.addWidget(playerBoard, 'button', .75, .2, '#0cdfe0', "RETURN", () => {
            boardBase._children = [tacticBoard, fieldMap]
            currentPlayer = -1
        }, 0.9);

        g2.addWidget(playerBoard, 'button', .75, .78, '#d965bb', "ADD MOVEMENT", () => {
            console.log("Adding Movement")
            playerBoard.currentEditingMovement = 0
        }, 0.6)

        g2.addWidget(playerBoard, 'button', .6, .68, '#a0aaba', "initial POS", () => {}, 0.6)

        for (let j = 1; j < 5; j++) {
            playerBoard.moveButton.push(g2.addWidget(playerBoard, 'button', .6, .68 - 0.08 * j, '#a0aaba', "move " + j, () => {
            }, 0.6));
        }
        g2.addTrackpad(playerBoard, .25, .47, '#ff8080', ' ', () => {}, 1, playerList, playerBoard);
    }

    model.animate(() => {
        // console.log("playerList:", playerList)
        // console.log("tac: ", tacticBoard)
        // console.log("currentPlayer:", currentPlayer)
        boardBase.identity().boardHud().scale(1.3);

        hudButtonHandler();

        if (HUDIsShown) {
            if (boardBase._children.length === 0) {
                boardBase._children.push(tacticBoard)
                boardBase._children.push(fieldMap)
            }
        } else {
            boardBase._children = [];
        }
        for (let i = 0; i < numPlayers; i++) {
            playerList[i].update(currTime)
        }
    });
}

