/*
 * Copyright © 2020 Endless OS LLC.
 *
 * This file is part of eos-tour-extension
 * (see https://github.com/endlessm/eos-tour-extension).
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/* exported rect, circle, widget, clean */

const Main = imports.ui.main;
const { Clutter, Cogl, GObject, Graphene, St } = imports.gi;
const Cairo = imports.cairo;

const Actors = [];
let clickEventHandler = null;

const overlayColor = new Clutter.Color({red: 0, green: 0, blue: 0, alpha: 200});
const borderColor = new Clutter.Color({red: 255, green: 120, blue: 0, alpha: 255});
const border = 3;

function _paintCircle(x, y, radius, area) {
    const cr = area.get_context();
    const [aw, ah] = area.get_surface_size();
    Clutter.cairo_set_source_color(cr, overlayColor);

    cr.moveTo(0, 0);
    cr.rectangle(0, 0, aw, ah);
    cr.fill();
    cr.setOperator(Cairo.Operator.CLEAR);
    cr.arc(x, y, radius + border, 0, Math.PI * 2);
    cr.fill();

    cr.setOperator(Cairo.Operator.OVER);

    Clutter.cairo_set_source_color(cr, borderColor);
    cr.setLineWidth(border);
    cr.arc(x, y, radius + border, 0, Math.PI * 2);
    cr.stroke();
}

function _paintRect(x, y, x2, y2, area) {
    const cr = area.get_context();
    const [aw, ah] = area.get_surface_size();
    Clutter.cairo_set_source_color(cr, overlayColor);

    cr.moveTo(0, 0);
    cr.rectangle(0, 0, aw, ah);
    cr.fill();

    Clutter.cairo_set_source_color(cr, borderColor);
    cr.setLineWidth(border);
    cr.setLineCap(Cairo.LineCap.SQUASH);
    cr.moveTo(x, y);
    cr.lineTo(x2, y2);
    cr.stroke();
}

function clean() {
    while(Actors.length) {
        const actor = Actors.pop();
        actor.destroy();
    }
    if (clickEventHandler) {
        global.stage.disconnect(clickEventHandler);
        clickEventHandler = null;
    }
}

function draw() {
    Actors.forEach((a) => {
        Main.layoutManager.addChrome(a);
        a.show();
    });
}

function _createActors(x, y, width, height) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];

    // Four panels to create an empty space just in the Highlight rectangle
    const bgColor = new Clutter.Color({red: 0, green: 0, blue: 0, alpha: 120});
    const topActor = new St.DrawingArea({
        x: monitor.x,
        y: monitor.y,
        width: monitor.width,
        height: y,
        reactive: true,
    });
    const bottomActor = new St.DrawingArea({
        x: monitor.x,
        y: monitor.y + y + height,
        width: monitor.width,
        height: monitor.height - (y + height),
        reactive: true,
    });
    const leftActor = new St.DrawingArea({
        x: monitor.x,
        y: monitor.y + y,
        width: x,
        height: height,
        reactive: true,
    });
    const rightActor = new St.DrawingArea({
        x: monitor.x + x + width,
        y: monitor.y + y,
        width: monitor.width - (x + width),
        height: height,
        reactive: true,
    });

    return [topActor, rightActor, bottomActor, leftActor];
}

function _reposSkipButton(x, y, width, height, button) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];

    const bottom = monitor.y + monitor.height;
    const right = monitor.x + monitor.width;
    const top = monitor.y;
    const left = monitor.x;
    const margin = 30;

    // Bottom Right by default
    button.set_x(right - button.get_width() - margin);
    button.set_y(bottom - button.get_height() - margin);

    const highRect = new Graphene.Rect();
    const buttonRect = new Graphene.Rect();

    highRect.origin.x = x;
    highRect.origin.y = y;
    highRect.size.width = width;
    highRect.size.height = height;

    buttonRect.origin.x = button.x;
    buttonRect.origin.y = button.y;
    buttonRect.size.width = button.width;
    buttonRect.size.height = button.height;

    let [intersection] = buttonRect.intersection(highRect);
    // Top right
    if (intersection) {
        button.set_y(top + margin);
        buttonRect.origin.y = top + margin;
        [intersection] = buttonRect.intersection(highRect);
        // Top left
        if (intersection) {
            button.set_x(left + margin);
            buttonRect.origin.x = left + margin;
            [intersection] = buttonRect.intersection(highRect);
            // Bottom left
            if (intersection) {
                button.set_y(bottom - button.get_height() - margin);
            }
        }
    }
}

function _createSkipButton(callback) {
    const button = new St.Button({
        label: 'Skip',
        reactive: true,
        x: 0,
        y: 0,
        style_class: 'modal-dialog-button button',
    });

    button.connect('clicked', () => {
        clean();
        callback(true);
    });

    return button;
}

function _reposText(x, y, width, height, label) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];
    const labelWidth = label.get_width();
    const labelHeight = label.get_height();

    // Wide rect, we'll show the text top or bottom
    if (width > height) {
        label.set_x(monitor.x + x + (width / 2) - (labelWidth / 2));
        if (y < monitor.height / 2) {
            label.set_y(monitor.y + y + height + 20);
        } else {
            label.set_y(monitor.y + y - 30);
        }
    // Left or right
    } else {
        label.set_y(monitor.y + y + (height / 2) - (labelHeight / 2));
        if (x < monitor.width / 2) {
            label.set_x(monitor.x + x + width + 20);
        } else {
            label.set_x(monitor.x + x - labelWidth - 30);
        }
    }
}

function _createText(text) {
    const label = new St.Label({ text: text, x: 0, y: 0 });
    return label;
}

function _findWidget(root, className) {
    let widgetClassName = '';
    let widgetName = '';
    let labelActorText = '';

    if ('get_style_class_name' in root) {
        widgetClassName = root.get_style_class_name();
    }
    if ('get_name' in root) {
        widgetName = root.get_name();
    }
    if ('get_label_actor' in root) {
        const labelActor = root.get_label_actor();
        if (labelActor) {
            labelActorText = root.get_label_actor().get_text();
        }
    }

    if (widgetClassName === className
        || widgetName === className
        || labelActorText === className) {
        return root;
    }

    for (const child of root.get_children()) {
        const found = _findWidget(child, className);
        if (found) {
            return found;
        }
    }

    return null;
}


function handleClick(x, y, width, height, service, callback) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];

    const clickActor = new Clutter.Actor({ x, y, width, height, reactive: true });
    Actors.push(clickActor);

    clickActor.connect('button-press-event', (actor, ev) => {
        clean();
        callback(false);

        if (service.PropagateEvents) {
            const [stageX, stageY] = ev.get_coords();
            const a = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, stageX, stageY);
            a.event(ev.copy(), false);
        }

        return Clutter.EVENT_PROPAGATE;
    });
}

function rect(x, y, width, height, text, service, callback) {
    clean();
    const b2 = border / 2;

    const [topActor, rightActor, bottomActor, leftActor] = _createActors(x, y, width, height);
    topActor.connect('repaint', _paintRect.bind(this, x - b2, y - b2, x + width + b2, y - b2));
    bottomActor.connect('repaint', _paintRect.bind(this, x - b2, b2, x + width + b2, b2));
    leftActor.connect('repaint', _paintRect.bind(this, x - b2, 0, x - b2, y + height));
    rightActor.connect('repaint', _paintRect.bind(this, b2, 0, b2, y + height));

    Actors.push(topActor);
    Actors.push(bottomActor);
    Actors.push(leftActor);
    Actors.push(rightActor);

    let textActor = null;
    if (text) {
        textActor = _createText(text);
        Actors.push(textActor);
    }

    let skipButton;
    if (service.Skippable) {
        skipButton = _createSkipButton(callback);
        Actors.push(skipButton);
    }

    handleClick(x, y, width, height, service, callback);
    draw();

    if (service.Skippable) {
        _reposSkipButton(x, y, width, height, skipButton);
    }

    if (text) {
        _reposText(x, y, width, height, textActor);
    }
}

function circle(x, y, radius, text, service, callback) {
    clean();

    const width = Math.sqrt(2 * radius * radius);
    const width2 = width / 2;
    const [topActor, rightActor, bottomActor, leftActor] = _createActors(x, y, width, width);

    topActor.connect('repaint', _paintCircle.bind(this, x + width2, y + width2, radius));
    bottomActor.connect('repaint', _paintCircle.bind(this, x + width2, -width2, radius));
    leftActor.connect('repaint', _paintCircle.bind(this, x + width2, width2, radius));
    rightActor.connect('repaint', _paintCircle.bind(this, -width2, width2, radius));

    Actors.push(topActor);
    Actors.push(bottomActor);
    Actors.push(leftActor);
    Actors.push(rightActor);

    let textActor = null;
    if (text) {
        textActor = _createText(text);
        Actors.push(textActor);
    }

    let skipButton;
    if (service.Skippable) {
        skipButton = _createSkipButton(callback);
        Actors.push(skipButton);
    }

    handleClick(x, y, width, width, service, callback);
    draw();

    if (service.Skippable) {
        _reposSkipButton(x, y, width, width, skipButton);
    }

    if (text) {
        _reposText(x, y, width, width, textActor);
    }
}

function widget(className, text, service, callback) {
    // Looking for a widget with this class name
    const root = Main.layoutManager.uiGroup;
    const w = _findWidget(root, className);
    if (w) {
        const [x, y] = w.get_transformed_position();
        global.w = w;
        const [width, height] = w.get_size();
        rect(x, y, width, height, text, service, callback);
    } else {
        callback(false);
    }
}
