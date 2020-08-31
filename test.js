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
const {Gio, GLib} = imports.gi;

let proxy = null;

function drawCircle(x, y, radius) {
    return new Promise((resolve, reject) => {
        const variant = new GLib.Variant('(uuus)', [x, y, radius, 'This is a circle']);
        proxy.call('HighlightCircle', variant, Gio.DBusCallFlags.NONE, 20000, null,
            (proxy, res) => {
                const [result] = proxy.call_finish(res).deep_unpack();
                if (result) {
                    reject(result);
                }
                resolve(result);
            });
    });
}

function drawRectangle(x, y, width, height) {
    return new Promise((resolve, reject) => {
        const variant = new GLib.Variant('(uuuus)', [x, y, width, height, 'This is a rectangle']);
        proxy.call('HighlightRect', variant, Gio.DBusCallFlags.NONE, 20000, null,
            (proxy, res) => {
                const [result] = proxy.call_finish(res).deep_unpack();
                if (result) {
                    reject(result);
                }
                resolve(result);
            });
    });
}

function drawWidget(className, text) {
    return new Promise((resolve, reject) => {
        const variant = new GLib.Variant('(ss)', [className, text]);
        proxy.call('HighlightWidget', variant, Gio.DBusCallFlags.NONE, 20000, null,
            (proxy, res) => {
                const [result] = proxy.call_finish(res).deep_unpack();
                if (result) {
                    reject(result);
                }
                resolve(result);
            });
    });
}

function changeProp(prop, value) {
    const propProxy = new Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SESSION,
        0, null,
        'com.endlessm.onboarding',
        '/com/endlessm/onboarding',
        'org.freedesktop.DBus.Properties',
        null);

    const variant = new GLib.Variant('(ssv)',
        ['com.endlessm.onboarding', prop, new GLib.Variant('b', value)]);

    return new Promise((resolve, reject) => {
        propProxy.call('Set', variant, Gio.DBusCallFlags.NONE, -1, null, (proxy, res) => {
            const [result] = proxy.call_finish(res).deep_unpack();
            resolve(res);
        });
    });
}

function testInit() {
    const _loop = new GLib.MainLoop(null, false);
    proxy = new Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SESSION,
        0, null,
        'com.endlessm.onboarding',
        '/com/endlessm/onboarding',
        'com.endlessm.onboarding',
        null);

    proxy.call('Overview', new GLib.Variant('(s)', ['show']), Gio.DBusCallFlags.NONE, -1, null, (proxy, res) => {});
    drawRectangle(1920 / 2 - 30, 5, 60, 20)
        .then(changeProp.bind(this, 'Skippable', false))
        .then(changeProp.bind(this, 'PropagateEvents', false))
        .then(drawCircle.bind(this, 1200, 400, 50))
        .then(changeProp.bind(this, 'Skippable', true))
        .then(drawWidget.bind(this, 'workspace-thumbnails', 'Here you can change between virtual desktops'))
        .then(drawWidget.bind(this, 'search-entry', 'You can find new applications or anything here'))
        .then(changeProp.bind(this, 'PropagateEvents', true))
        .then(drawWidget.bind(this, 'dash', 'Here you have your running applications'))
        .finally(() => { _loop.quit() });

    _loop.run();
}

testInit();
