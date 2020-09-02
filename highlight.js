/*
 * Copyright © 2020 Endless OS LLC.
 *
 * This file is part of eos-onboarding-extension
 * (see https://github.com/endlessm/eos-onboarding-extension).
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
/* exported rect, circle, widget, icon, clean, fuzzy, image */

const Main = imports.ui.main;
const { Clutter, Cogl, Gio, GObject, Graphene, St } = imports.gi;
const Cairo = imports.cairo;

const ExtensionUtils = imports.misc.extensionUtils;
const Onboarding = ExtensionUtils.getCurrentExtension();
const _ = Onboarding.imports.utils.gettext;

const Actors = [];
let clickEventHandler = null;

const overlayColor = new Clutter.Color({red: 0, green: 0, blue: 0, alpha: 200});
const borderColor = new Clutter.Color({red: 255, green: 120, blue: 0, alpha: 255});
const border = 3;

// This is from the osd-window margin: in
// gnome-shell:data/theme/gnome-shell-sass/widgets/_osd.scss
// > margin: $base_margin * 8; // 32px
const imageMargin = 32;

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

function clean(service) {
    while(Actors.length) {
        const actor = Actors.pop();
        actor.destroy();
    }
    if (clickEventHandler) {
        global.stage.disconnect(clickEventHandler);
        clickEventHandler = null;
    }
    service.IsHighlight = false;
}

function draw(service) {
    Actors.forEach((a) => {
        Main.layoutManager.addChrome(a);
        a.show();
    });

    service.IsHighlight = true;
}

function _createActors(x, y, width, height) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];

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

function _createSkipButton(callback, service) {
    const button = new St.Button({
        label: _('Skip'),
        reactive: true,
        x: 0,
        y: 0,
        style_class: 'modal-dialog-button button',
    });

    button.connect('clicked', () => {
        clean(service);
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

    const mx = monitor.x + x;
    const my = monitor.y + y;

    const clickActor = new Clutter.Actor({ x: mx, y: my, width, height, reactive: true });
    Actors.push(clickActor);

    clickActor.connect('button-press-event', (actor, ev) => {
        clean(service);
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
    clean(service);
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
        skipButton = _createSkipButton(callback, service);
        Actors.push(skipButton);
    }

    handleClick(x, y, width, height, service, callback);
    draw(service);

    if (service.Skippable) {
        _reposSkipButton(x, y, width, height, skipButton);
    }

    if (text) {
        _reposText(x, y, width, height, textActor);
    }
}

function circle(x, y, radius, text, service, callback) {
    clean(service);

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
        skipButton = _createSkipButton(callback, service);
        Actors.push(skipButton);
    }

    handleClick(x, y, width, width, service, callback);
    draw(service);

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

function icon(appId, text, service, callback) {
    Main.overview.viewSelector.showApps();
    // Looking for an icon with this app or name
    const id = `${appId}.desktop`;
    const [page, pos] = Main.overview.viewSelector.appDisplay._pageManager.getAppPosition(id);
    if (page < 0) {
        callback(false);
        return;
    }

    Main.overview.viewSelector.appDisplay.goToPage(page, false);
    const item = Main.overview.viewSelector.appDisplay._grid.getItemAt(page, pos);
    const [x, y] = item.get_transformed_position();
    const [width, height] = item.get_transformed_size();
    rect(x, y, width, height, text, service, callback);

}

class FuzzyParser {
    constructor() {
        this._numberRe = '((\\d+)(%|px))';
        this._yaxisRe = `(top|center|bottom|${this._numberRe})`;
        this._xaxisRe = `(left|center|right|${this._numberRe})`;
        this._ARRe = '((\\d+):(\\d+))';

        this.number = () => new RegExp(this._numberRe);
        this.yaxis = () => new RegExp(this._yaxisRe);
        this.xaxis = () => new RegExp(this._xaxisRe);
        this.pos = () => new RegExp(this._posRe);
        this.ar = () => new RegExp(this._ARRe);
    }

    applyAr(width, ar) {
        let [, , w, h] = ar.match(this.ar());
        w = parseInt(w, 10);
        h = parseInt(h, 10);
        return width / (w / h);
    }

    parseNumber(n, total = 100) {
        const [, , number, suffix] = n.match(this.number());

        if (suffix === 'px') {
            return parseInt(number, 10);
        }

        // calculate the number using the total variable as total and number as a
        // percentage
        return parseInt(number, 10) * total / 100;
    }

    parseXaxis(xaxis, width) {
        const monitors = Main.layoutManager.monitors;
        const primary = Main.layoutManager.primaryIndex;
        const monitor = monitors[primary];

        switch (xaxis) {
            case 'left':
                return 0;
            case 'right':
                return monitor.width - width;
            case 'center':
                return monitor.width / 2 - width / 2;
            default:
                return this.parseNumber(xaxis, monitor.width);
        }
    }

    parseYaxis(yaxis, height) {
        const monitors = Main.layoutManager.monitors;
        const primary = Main.layoutManager.primaryIndex;
        const monitor = monitors[primary];

        switch (yaxis) {
            case 'top':
                return monitor.y;
            case 'bottom':
                return monitor.height - height;
            case 'center':
                return monitor.height / 2 - height / 2;
            default:
                return this.parseNumber(yaxis, monitor.height);
        }
    }

    parsePos(pos, width, height) {
        let match = null;

        match = pos.match(new RegExp(`${this._yaxisRe} ${this._xaxisRe}`));
        if (match) {
            const [yaxis, xaxis] = match[0].split(' ');
            return [this.parseXaxis(xaxis, width), this.parseYaxis(yaxis, height)];
        }

        match = pos.match(this.yaxis());
        if (match) {
            return [this.parseXaxis('center', width), this.parseYaxis(match[0], height)];
        }

        match = pos.match(this.xaxis());
        if (match) {
            return [this.parseXaxis(match[0], width), this.parseYaxis('center', height)];
        }

        return [0, 0];
    }

    parseSize(size) {
        const monitors = Main.layoutManager.monitors;
        const primary = Main.layoutManager.primaryIndex;
        const monitor = monitors[primary];
        let match = null;

        let regex = new RegExp(`${this._numberRe} ${this._numberRe}`);
        match = size.match(new RegExp(`${this._numberRe} ${this._numberRe}`));
        if (match) {
            const [width, height] = match[0].split(' ');
            return [
                this.parseNumber(width, monitor.width),
                this.parseNumber(height, monitor.height),
            ];
        }

        match = size.match(new RegExp(`${this._numberRe} ${this._ARRe}`));
        if (match) {
            const [width, ar] = match[0].split(' ');
            const finalWidth = this.parseNumber(width, monitor.width);
            const finalHeight = this.applyAr(finalWidth, ar);
            return [finalWidth, finalHeight];
        }

        match = size.match(this.number());
        if (match) {
            const width = this.parseNumber(match[0], monitor.width);
            return [width, width];
        }

        return [0, 0];
    }
};

const fuzzyParser = new FuzzyParser();

function fuzzy(position, size, shape, text, service, callback) {
    /**
     * The fuzzy function takes fuzzy position and size description and
     * translates that to screen pixels
     *
     * position: "y-axis x-axis|y-axis|x-axis"
     * size: "width height|width w:h|width"
     * shape: "rect|circle"
     *
     * y-axis: "top|center|bottom|N%|Npx"
     * x-axis: "left|center|right|N%|Npx"
     *
     * width, height: "N%|Npx"
     */

    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];

    const [width, height] = fuzzyParser.parseSize(size);
    let [x, y] = fuzzyParser.parsePos(position, width, height);

    if (x === 0) {
        x += border;
    }
    if (x + width === monitor.width) {
        x -= border;
    }
    if (y === 0) {
        y += border;
    }
    if (y + height === monitor.height) {
        y -= border;
    }

    if (shape === 'circle') {
        circle(x, y, width / 2.0, text, service, callback);
    } else {
        rect(x, y, width, height, text, service, callback);
    }
}

function showImage(path, size, text, service, callback) {
    // background overlay
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];
    const [width, height] = fuzzyParser.parseSize(size);

    let textActor = null;
    let skipButton = null;

    if (service.Skippable) {
        skipButton = _createSkipButton(callback);
        Actors.push(skipButton);
    }

    if (text) {
        textActor = _createText(text);
        Actors.push(textActor);
    }

    const cache = St.TextureCache.get_default();
    const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    const file = Gio.file_new_for_path(path);
    const actor = cache.load_file_async(file, -1, -1, scaleFactor, 1);
    actor.set_size(width, height);
    const container = new St.BoxLayout({
        style_class: 'osd-window',
        vertical: true,
    });
    container.add_actor(actor);

    actor.connect('notify::allocation', () => {
        const [w, h] = container.get_size();
        const x = monitor.x + monitor.width / 2 - w / 2;
        const y = monitor.y + monitor.height / 2 - h / 2;

        container.set_position(x - imageMargin, y - imageMargin);

        if (service.Skippable) {
            _reposSkipButton(x, y, w, h, skipButton);
        }

        if (text) {
            _reposText(x, y, w, h, textActor);
        }
    });

    Actors.push(container);
    draw();
}

