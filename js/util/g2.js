"use strict";

import * as cg from "../render/core/cg.js";
import {lcb, rcb} from "../handle_scenes.js";

// SUPPORT LIBRARY FOR 2D GRAPHICS

function G2() {

    let context = textureCanvas.getContext('2d');
    let width = textureCanvas.width;
    let height = textureCanvas.height;
    let mouseZPrev = false;
    let mouseState = 'move';

    let x2c = x => width * x;
    let y2c = y => height * (1 - y);
    let w2c = w => width * w;
    let h2c = h => height * h;
    let c2w = w => w / width;

    let i2c = i => ('0123456789abcdef').substring(i, i + 1);
    let i2h = i => i2c(i >> 4) + i2c(i % 15);
    let f2h = f => i2h(255 * Math.min(1, f));
    let rgbaToHex = (r, g, b, a) => '#' + f2h(r) + f2h(g) + f2h(b) + (a === undefined ? '' : f2h(a));

    let isRgba = arg => Array.isArray(arg);
    let isHex = arg => typeof arg === 'string' && arg.charAt(0) == '#';
    let c2i = c => c < 65 ? c - 48 : c < 65 ? c - 55 : c - 87;
    let h2f = h => c2i(h.charCodeAt(0)) / 16 + c2i(h.charCodeAt(1)) / 256;
    let hexToRgba = hex => [h2f(hex.substring(1, 3)), h2f(hex.substring(3, 5)), h2f(hex.substring(5, 7)),
        hex.length > 8 ? h2f(hex.substring(7, 9)) : 1];

    let textWidth = text => context.measureText(text).width / width;

    context.lineCap = 'round';

    let widgets = [];

    this.addWidget = (obj, type, x, y, color, label, action, size) => {
        switch (type) {
            case 'button'  :
                widgets.push(new Button(obj, x, y, color, label, action, size));
                break;
            case 'slider'  :
                widgets.push(new Slider(obj, x, y, color, label, action, size));
                break;
            case 'textbox' :
                widgets.push(new Textbox(obj, x, y, color, label, action, size));
                break;
            case 'trackpad':
                widgets.push(new Trackpad(obj, x, y, color, label, action, size));
                break;
        }
        return widgets[widgets.length - 1];
    }

    this.addTrackpad = (obj, x, y, color, label, action, size, pList, timeButtonGap) => {
        // console.log("Current Player ID in trackPad:" + obj.ID)
        if (obj.ID === -1){
            widgets.push(new tacticBoardTrackpad(obj, x, y, color, label, action, size, pList));
        }
        else{
            widgets.push(new playerBoardTrackpad(obj, x, y, color, label, action, size, pList, timeButtonGap));
        }

    }

    this.drawDirectionArrow = (x, y, w, h, player, t, scale) => {
        let position = player.positions[t]
        let positionOnTrackPad = [x + w * position[0] / 2, y + h * position[1] / 2]
        scale = cg.def(scale, 1);
        g2.setColor(player.color);
        g2.lineWidth(.005 * scale);
        g2.arrow(positionOnTrackPad, [positionOnTrackPad[0] + scale * Math.cos(player.directions[t]) * .05, positionOnTrackPad[1] + scale * Math.sin(player.directions[t]) * .05]);
    }

    let tacticBoardTrackpad = function (obj, x, y, color, label, action, size, pList){
        size = cg.def(size, 1);
        this.obj = obj;
        let w = .45 * size, h = .84 * size;
        this.isWithin = () => {
            let uvz = g2.getUVZ_R(obj);
            return uvz && uvz[0] > x - w / 2 && uvz[0] < x + w / 2 && uvz[1] > y - h / 2 && uvz[1] < y + h / 2;
        }

        this.handleEvent = () => {
            //nothing to do
        }

        // this.drawDirectionArrow = (player, t, scale) => {
        //     let position = player.positions[t]
        //     let positionOnTrackPad = [x + w * position[0] / 2, y + h * position[1] / 2]
        //     scale = cg.def(scale, 1);
        //     g2.setColor(player.color);
        //     g2.lineWidth(.005 * scale);
        //     g2.arrow(positionOnTrackPad, [positionOnTrackPad[0] + scale * Math.cos(player.directions[t]) * .05, positionOnTrackPad[1] + scale * Math.sin(player.directions[t]) * .05]);
        // }
        this.draw = () => {
            g2.textHeight(.09 * size);
            let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
            g2.setColor(color, isPressed ? .75 : this.isWithin() ? .85 : 1);
            g2.fillRect(x - w / 2, y - h / 2, w, h);
            g2.setColor(color, isPressed ? .375 : this.isWithin() ? .475 : .5);
            for (let i = 0; i < pList.length; i++) {
                let player = pList[i];
                let pos = player.positions[this.obj.timeFrameValue];;
                g2.setColor(player.color);
                console.log(pos);
                let posOnTrackPad = [x + w * pos[0] / 2, y + h * pos[1] / 2];
                g2.fillRect(posOnTrackPad[0] - .015 * size, posOnTrackPad[1] - .015 * size, .03 * size, .03 * size);
                g2.drawDirectionArrow(x, y, w, h, player, this.obj.timeFrameValue);
            }
        }
    }

    let playerBoardTrackpad = function (obj, x, y, color, label, action, size, pList, timeButtonGap) {
        size = cg.def(size, 1);
        this.obj = obj;
        let w = .45 * size, h = .84 * size;
        this.isWithin = () => {
            let uvz = g2.getUVZ_R(obj);
            return uvz && uvz[0] > x - w / 2 && uvz[0] < x + w / 2 && uvz[1] > y - h / 2 && uvz[1] < y + h / 2;
        }
        this.handleEvent = () => {
                console.log("Dragging from bbCoachingTrackpad ID:" + this.obj.ID)
                let uvz = g2.getUVZ_R(obj);
                let player = pList[this.obj.ID]
                if (uvz && this.obj.ID !== -1) {
                    // Determine position in which time point (start or end) is changing.
                    if (this.obj.frameStart !== -1) {
                        // console.log("Can start dragging")
                        if (player.endFrameList.length === 0) {
                            player.positions[this.obj.frameStart][0] = Math.max(0, Math.min(1, (uvz[0] - (x - w / 2)) / w)) * 2 - 1;
                            player.positions[this.obj.frameStart][1] = Math.max(0, Math.min(1, (uvz[1] - (y - h / 2)) / h)) * 2 - 1;
                            player.setAllToInitial(this.obj.frameStart, true);
                        }
                    } else if (this.obj.frameEnd !== -1) {
                        // Only in drawMode could user draw a movement path, otherwise the uvz represents the setting of the end point for the move.
                        if (!this.obj.drawMode) {
                            player.positions[this.obj.frameEnd][0] = Math.max(0, Math.min(1, (uvz[0] - (x - w / 2)) / w)) * 2 - 1;
                            player.positions[this.obj.frameEnd][1] = Math.max(0, Math.min(1, (uvz[1] - (y - h / 2)) / h)) * 2 - 1;
                            player.setAllFromEnd(this.obj.frameEnd, false)
                        } else {
                            if (g2.mouseState() == 'press') {
                                this.obj.path = []
                            } else {
                                let uvz = g2.getUVZ_R(this.obj);
                                if (uvz && uvz[0] > .01 && uvz[0] < .9) {
                                    if (g2.mouseState() == 'drag') {
                                        this.obj.path.push(uvz)
                                    } else if (g2.mouseState() == 'release') {
                                        if (this.obj.path.length > 0 && this.obj.path.length < 5) {
                                            this.obj.path = []
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (action && mouseState == 'drag')
                        console.log("dragging")
                    action();
                }

                // resample the draw path and map it to the intermedia points for the movement
                if (player.endFrameList.length > 0 && player.startFrameList.length === player.endFrameList.length) {
                    let start = player.startFrameList[player.startFrameList.length - 1]
                    let end = player.endFrameList[player.endFrameList.length - 1]
                    let resample_length = end - start + 1;
                    if (this.obj.path.length > 1) {
                        let re_line = cg.resampleCurve(this.obj.path, resample_length)
                        for (let i = end - start - 1; i >= 1; i--) {
                            player.positions[start + i][0] = Math.max(0, Math.min(1, (re_line[i][0] - (x - w / 2)) / w)) * 2 - 1;
                            player.positions[start + i][1] = Math.max(0, Math.min(1, (re_line[i][1] - (y - h / 2)) / h)) * 2 - 1;
                            player.positions[start + i][2] = 0
                            let dx = player.positions[start + i + 1][0] - player.positions[start + i][0];
                            let dy = player.positions[start + i + 1][1] - player.positions[start + i][1];
                            let arctan = Math.atan((dy * h) / (dx * w));
                            if ((dx > 0 && dy >= 0) || (dx > 0 && dy <= 0)) {
                                player.directions[start + i] = arctan;
                            } else if ((dx < 0 && dy >= 0) || (dx < 0 && dy < 0)) {
                                player.directions[start + i] = arctan + Math.PI
                            } else if (dx === 0) {
                                player.directions[start + i] = dy >= 0 ? Math.PI / 2 : -Math.PI;
                            }
                        }
                    }
                }
        }

        // this.drawDirectionArrow = (player, t, scale) => {
        //     let position = player.positions[t]
        //     let positionOnTrackPad = [x + w * position[0] / 2, y + h * position[1] / 2]
        //     scale = cg.def(scale, 1);
        //     g2.setColor(player.color);
        //     g2.lineWidth(.005 * scale);
        //     g2.arrow(positionOnTrackPad, [positionOnTrackPad[0] + scale * Math.cos(player.directions[t]) * .05, positionOnTrackPad[1] + scale * Math.sin(player.directions[t]) * .05]);
        // }

        this.draw = () => {
            g2.textHeight(.09 * size);
            let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
            g2.setColor(color, isPressed ? .75 : this.isWithin() ? .85 : 1);
            g2.fillRect(x - w / 2, y - h / 2, w, h);
            g2.setColor(color, isPressed ? .375 : this.isWithin() ? .475 : .5);
            for (let i = 0; i < pList.length; i++) {
                let player = pList[i];
                let start = player.startFrameList.length === 0 ? -1 : player.startFrameList[0];
                let endList = player.endFrameList;

                // if no point selected, draw the initial pos
                if (start === -1) {
                    let pos = player.initialPosition;
                    g2.setColor(player.color);
                    let posOnTrackPad = [x + w * pos[0] / 2, y + h * pos[1] / 2];
                    g2.fillRect(posOnTrackPad[0] - .015 * size, posOnTrackPad[1] - .015 * size, .03 * size, .03 * size);
                    g2.drawDirectionArrow(x, y, w, h, player, 0);
                } else {
                    // if having start point, draw it with time as label
                    let pos = player.positions[start];
                    g2.setColor(player.color);
                    let posOnTrackPad = [x + w * pos[0] / 2, y + h * pos[1] / 2];
                    g2.fillRect(posOnTrackPad[0] - .015 * size, posOnTrackPad[1] - .015 * size, .03 * size, .03 * size);
                    if (endList.length === 0) {
                        g2.drawDirectionArrow(x, y, w, h, player, start);
                    }
                    for (let j = 0; j < endList.length; j++) {
                        // if having end point, draw it with time as label
                        let end = endList[j];
                        let start = player.startFrameList[j];
                        g2.drawDirectionArrow(x, y, w, h, player, start);
                        g2.drawDirectionArrow(x, y, w, h, player, end);

                        let pos2 = player.positions[end];
                        g2.setColor(player.color);
                        let pos2OnTrackPad = [x + w * pos2[0] / 2, y + h * pos2[1] / 2];
                        g2.fillRect(pos2OnTrackPad[0] - .015 * size, pos2OnTrackPad[1] - .015 * size, .03 * size, .03 * size);

                        // draw the intermedia points from start to end
                        g2.setColor(player.color);
                        for (let k = start; k <= end; k = k + this.obj.drawGap) {
                            let posk = player.positions[k]
                            let poskOnTrackPad = [x + w * posk[0] / 2, y + h * posk[1] / 2]
                            g2.fillRect(poskOnTrackPad[0] - .005 * size, poskOnTrackPad[1] - .005 * size, .01 * size, .01 * size);
                            g2.drawDirectionArrow(x, y, w, h, player, k, .3);
                        }

                        g2.setColor('black');
                        g2.textHeight(.025);
                        g2.fillText(Math.floor(end / timeButtonGap) + '', pos2OnTrackPad[0], pos2OnTrackPad[1], 'center');
                    }

                    g2.setColor('black');
                    g2.textHeight(.025);
                    g2.fillText(Math.floor(start / timeButtonGap) + '', posOnTrackPad[0], posOnTrackPad[1], 'center');
                }
            }
            g2.setColor('black');
            g2.fillText(label, x, y, 'center');
            drawWidgetOutline(x, y, w, h, isPressed);
        }
    }

    this.getUVZ = obj => this.computeUVZ(obj.getGlobalMatrix());
    this.getUVZ_R = obj => this.computeUVZ_R(obj.getGlobalMatrix());

    let activeWidget = null;

    this.update = () => {
        if (window.vr)
            mouseZ = lcb.down || rcb.down;
        mouseState = !mouseZPrev && mouseZ ? 'press' :
            !mouseZ && mouseZPrev ? 'release' : mouseZ ? 'drag' : 'move';
        mouseZPrev = mouseZ;

        if (mouseState == 'press') {
            activeWidget = null;
            let nearestZ = 100000;
            for (let n = 0; n < widgets.length; n++)
                if (widgets[n].isWithin() && widgets[n].obj.visible) {
                    let uvz = this.getUVZ(widgets[n].obj);
                    if (uvz && uvz[2] < nearestZ ) {
                        activeWidget = widgets[n];
                        nearestZ = uvz[2];
                    }
                }
        }
        if (activeWidget && activeWidget.handleEvent && mouseState != 'move')
            activeWidget.handleEvent();
        if (activeWidget && activeWidget.handleKeyEvent)
            activeWidget.handleKeyEvent();
    }

    this.drawWidgets = obj => {
        for (let n = 0; n < widgets.length; n++)
            if (widgets[n].obj == obj)
                widgets[n].draw();
        return activeWidget != null;
    }

    let drawWidgetOutline = (x, y, w, h, isPressed) => {
        let s = .007;
        g2.setColor(isPressed ? 'black' : '#a0a0a0');
        g2.fillRect(x - w / 2 - s, y - h / 2, s, h + s);
        g2.fillRect(x - w / 2 - s, y + h / 2, w + s + s, s);
        g2.setColor(isPressed ? '#a0a0a0' : 'black');
        g2.fillRect(x - w / 2 - s, y - h / 2, w + s + s, s);
        g2.fillRect(x + w / 2, y - h / 2 + s, s, h);
    }

    let Button = function (obj, x, y, color, label, action, size) {

        size = cg.def(size, 1);
        this.obj = obj;
        this.state = 0;
        g2.textHeight(.09 * size);
        let w = textWidth(label) + .02 * size, h = .1 * size;
        this.setLabel = str => label = str;
        this.isWithin = () => {
            let uvz = g2.getUVZ_R(obj);
            return uvz && uvz[0] > x - w / 2 && uvz[0] < x + w / 2 && uvz[1] > y - h / 2 && uvz[1] < y + h / 2;
        }
        this.handleEvent = () => {
            // console.log("I clicked button from id:" + obj.ID)
            if (action && mouseState == 'release' && this.isWithin()) {
                action();
                activeWidget = null;
                if (Array.isArray(label))
                    this.state = (this.state + 1) % label.length;
            }
        }
        this.draw = () => {
            let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
            g2.textHeight(.09 * size);
            g2.setColor(color, isPressed ? .5 : this.isWithin() ? .7 : 1);
            g2.fillRect(x - w / 2, y - h / 2, w, h);
            g2.setColor('black');
            g2.textHeight(.07 * size);
            g2.fillText(Array.isArray(label) ? label[this.state] : label, x, y, 'center');
            // drawWidgetOutline(x, y, w, h, isPressed);
        }

        this.updateColor = (newColor) => {                  //update the color of the current buttona
            color = newColor;
        }
    }


    let Slider = function (obj, x, y, color, label, action, size) {
        size = cg.def(size, 1);
        this.obj = obj;
        let value = 0.5;
        let w = .5 * size, h = .1 * size;
        this.setLabel = str => label = str;
        this.isWithin = () => {
            let uvz = g2.getUVZ(obj);
            return uvz && uvz[0] > x - w / 2 && uvz[0] < x + w / 2 && uvz[1] > y - h / 2 && uvz[1] < y + h / 2;
        }
        this.setValue = v => value = v;
        this.handleEvent = () => {
            let uvz = g2.getUVZ(obj);
            if (uvz) {
                value = Math.max(0, Math.min(1, (uvz[0] - (x - w / 2)) / w));
                if (action && mouseState == 'drag')
                    action(value);
            }
        }
        this.draw = () => {
            g2.textHeight(.09 * size);
            let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
            g2.setColor(color, isPressed ? .75 : this.isWithin() ? .85 : 1);
            g2.fillRect(x - w / 2, y - h / 2, w, h);
            g2.setColor(color, isPressed ? .375 : this.isWithin() ? .475 : .5);
            g2.fillRect(x - w / 2, y - h / 2, w * value, h);
            g2.setColor('black');
            g2.fillText(label, x, y, 'center');
            drawWidgetOutline(x, y, w, h, isPressed);
        }
    }

    let Textbox = function (obj, x, y, color, text, action, size) {
        size = cg.def(size, 1);
        this.obj = obj;
        let model = obj;
        let cursor = text.length;
        while (model._parent._parent)
            model = model._parent;
        let w = .9 * size, h = .1 * size;
        this.isWithin = () => {
            let uvz = g2.getUVZ(obj);
            return uvz && uvz[0] > x - w / 2 && uvz[0] < x + w / 2 && uvz[1] > y - h / 2 && uvz[1] < y + h / 2;
        }
        this.handleEvent = () => {
            let uvz = g2.getUVZ(obj);
            if (uvz) {
                cursor = (uvz[0] - x) / (.053 * size) + text.length / 2;
                cursor = Math.max(0, Math.min(text.length, cursor + .5 >> 0));
            }
        }
        this.handleKeyEvent = () => {
            let key;
            while (model.keyQueue.length > 0) {
                switch (key = model.keyQueue.shift()) {
                    case 'ArrowLeft' :
                        cursor = Math.max(cursor - 1, 0);
                        break;
                    case 'ArrowRight':
                        cursor = Math.min(cursor + 1, text.length);
                        break;
                    case 'Backspace':
                        text = text.substring(0, cursor - 1) + text.substring(cursor, text.length);
                        cursor--;
                        break;
                    default:
                        if (key.length == 1) {
                            text = text.substring(0, cursor) + key + text.substring(cursor, text.length);
                            cursor++;
                        }
                        break;
                }
            }
            if (action)
                action(text);
        }
        this.draw = () => {
            context.save();
            context.font = (height * .09 * size) + 'px courier';
            g2.setColor(color, this.isWithin() ? .7 : 1);
            g2.fillRect(x - w / 2, y - h / 2, w, h);
            g2.setColor('black');
            g2.fillText(text, x, y, 'center');
            if (this == activeWidget) { // IF THIS IS THE ACTIVE WIDGET, THEN DRAW THE CURSOR.
                let cx = x + .053 * size * (cursor - text.length / 2);
                g2.fillRect(cx - .005 * size, y - h / 2, .01 * size, h);
            }
            drawWidgetOutline(x, y, w, h, true);
            context.restore();
        }
    }

    let Trackpad = function (obj, x, y, color, label, action, size) {
        size = cg.def(size, 1);
        this.obj = obj;
        let value = [0.5, 0.5];
        let w = .5 * size, h = .5 * size;
        this.isWithin = () => {
            let uvz = g2.getUVZ(obj);
            return uvz && uvz[0] > x - w / 2 && uvz[0] < x + w / 2 && uvz[1] > y - h / 2 && uvz[1] < y + h / 2;
        }
        this.handleEvent = () => {
            let uvz = g2.getUVZ(obj);
            if (uvz) {
                value[0] = Math.max(0, Math.min(1, (uvz[0] - (x - w / 2)) / w));
                value[1] = Math.max(0, Math.min(1, (uvz[1] - (y - h / 2)) / h));
                if (action && mouseState == 'drag')
                    action(value);
            }
        }
        this.draw = () => {
            g2.textHeight(.09 * size);
            let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
            g2.setColor(color, isPressed ? .75 : this.isWithin() ? .85 : 1);
            g2.fillRect(x - w / 2, y - h / 2, w, h);
            g2.setColor(color, isPressed ? .375 : this.isWithin() ? .475 : .5);
            g2.setColor('#00000080');
            g2.fillRect(x - w / 2 + w * value[0] - .005 * size, y - h / 2, .01 * size, h);
            g2.fillRect(x - w / 2, y - h / 2 + h * value[1] - .005 * size, w, .01 * size);
            g2.setColor('black');
            g2.fillText(label, x, y, 'center');
            drawWidgetOutline(x, y, w, h, isPressed);
        }
    }


    this.arrow = (a, b) => {
        this.drawPath([a, b]);
        let r = c2w(context.lineWidth);
        let d = cg.normalize([b[0] - a[0], b[1] - a[1], 0]);
        this.fillPath([[b[0] + 2 * d[0] * r, b[1] + 2 * d[1] * r],
            [b[0] - d[0] * r - 2 * d[1] * r, b[1] - d[1] * r + 2 * d[0] * r],
            [b[0] - d[0] * r + 2 * d[1] * r, b[1] - d[1] * r - 2 * d[0] * r]]);
    }
    this.computeUVZ = objMatrix => {
        if (!window.vr) {
            let w = screen.width, h = screen.height;
            return cg.mHitRect(cg.mMultiply(cg.mInverse(views[0].viewMatrix),
                cg.mAimZ([.965 * (1 - mouseX / (w / 2)),
                    .965 * (mouseY / (w / 2) - h / w), 5])), objMatrix);
        } else {
            let L = lcb.hitRect(objMatrix);
            let R = rcb.hitRect(objMatrix);
            return L ? L : R ? R : null;
        }
    }

    this.computeUVZ_R = objMatrix => {
        if (!window.vr) {
            let w = screen.width, h = screen.height;
            return cg.mHitRect(cg.mMultiply(cg.mInverse(views[0].viewMatrix),
                cg.mAimZ([.965 * (1 - mouseX / (w / 2)),
                    .965 * (mouseY / (w / 2) - h / w), 5])), objMatrix);
        } else {
            let R = rcb.hitRect(objMatrix);
            return R ? R : null;
        }
    }
    this.drawOval = (x, y, w, h) => {
        context.beginPath();
        context.arc(x2c(x + w / 2), y2c(y + h / 2), w2c(w / 2), 0, 2 * Math.PI);
        context.stroke();
    }
    this.drawPath = path => {
        context.beginPath();
        for (let n = 0; n < path.length; n++)
            context[n == 0 ? 'moveTo' : 'lineTo'](x2c(path[n][0]), y2c(path[n][1]));
        context.stroke();
    }
    this.drawRect = (x, y, w, h) => this.drawPath([[x, y], [x + w, y], [x + w, y + w], [x, y + w], [x, y]]);
    this.fillOval = (x, y, w, h) => {
        context.beginPath();
        context.arc(x2c(x + w / 2), y2c(y + h / 2), w2c(w / 2), 0, 2 * Math.PI);
        context.fill();
    }
    this.fillPath = path => {
        context.beginPath();
        for (let n = 0; n < path.length; n++)
            context[n == 0 ? 'moveTo' : 'lineTo'](x2c(path[n][0]), y2c(path[n][1]));
        context.fill();
    }
    this.fillRect = (x, y, w, h) => context.fillRect(x2c(x), y2c(y + h), w2c(w), h2c(h));
    this.fillText = (text, x, y, alignment, rotation) => {
        context.save();
        let lines = text.split('\n');
        let dy = parseFloat(context.font) / height;
        context.translate(x2c(x), y2c(y - dy / 3));
        if (rotation)
            context.rotate(-Math.PI / 2 * rotation);
        if (alignment)
            context.textAlign = alignment;
        for (let n = 0; n < lines.length; n++, y -= dy)
            context.fillText(lines[n], 0, h2c(n * dy));
        context.restore();
    }
    this.line = (a, b) => this.drawPath([a, b]);
    this.lineWidth = w => context.lineWidth = width * w;

    this.mouseState = () => mouseState;

    this.setColor = (color, dim) => {
        if (dim !== undefined && (isHex(color) || isRgba(color))) {
            let rgba = isHex(color) ? hexToRgba(color) : color;
            context.fillStyle = context.strokeStyle = rgbaToHex(dim * rgba[0], dim * rgba[1], dim * rgba[2], rgba[3]);
        } else
            context.fillStyle = context.strokeStyle = isRgba(color) ? rgbaToHex(color[0], color[1], color[2], color[3]) : color;
    }
    this.textHeight = h => context.font = (height * h) + 'px helvetica';

    this.barChart = (x, y, w, h, values, labels, colors) => {
        context.save();

        let uh = .25 / values.length;
        if (labels)
            this.textHeight(uh);

        for (let n = 0; n < values.length; n++) {
            let u = h * (n + .5) / values.length;
            if (colors)
                this.setColor(colors[n]);
            this.fillRect(x, y + u - uh / 2, w * values[n], uh);
            if (labels)
                this.fillText(labels[n], x - w / 50, y + u, 'right', 0.5);
        }

        this.setColor('black');
        this.fillRect(x, y, .02, w);
        this.fillRect(x, y, w, .02);

        context.restore();
    }

    this.clock = (x, y, w, h) => {
        context.save();
        context.translate(x2c(x), y2c(1 - y));
        context.scale(w, h);
        this.setColor('black');
        this.fillOval(0, 0, 1, 1);
        this.setColor('white');
        this.fillOval(.01, .01, .98, .98);

        this.setColor('black');
        let c = t => Math.cos(2 * Math.PI * t);
        let s = t => Math.sin(2 * Math.PI * t);
        for (let n = 1; n <= 12; n++)
            this.fillText('' + n, .5 + .43 * s(n / 12), .5 + .42 * c(n / 12), 'center');

        let now = new Date();
        let hour = now.getHours();
        let minute = now.getMinutes();
        let second = now.getSeconds();
        let clockHand = (w, t, r) => {
            this.lineWidth(w);
            this.arrow([.5, .5], [.5 + r * s(t), .5 + r * c(t)]);
        }
        clockHand(.037, (hour + minute / 60) / 12, .25);
        clockHand(.028, (minute + second / 60) / 60, .32);
        clockHand(.010, second / 60, .42);
        context.restore();
    }
}

export let g2 = new G2();

