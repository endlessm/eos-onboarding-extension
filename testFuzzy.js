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

function drawFuzzy(position, size, shape = 'rect', text = 'This is fuzzy') {
    shape = shape || 'rect';
    text = text || 'This is fuzzy';

    return new Promise((resolve, reject) => {
        const variant = new GLib.Variant('(ssss)', [position, size, shape, text]);
        proxy.call('HighlightFuzzy', variant, Gio.DBusCallFlags.NONE, 20000, null,
            (proxy, res) => {
                const [result] = proxy.call_finish(res).deep_unpack();
                if (result) {
                    reject(result);
                }
                resolve(result);
            });
    });
}

function testInit() {
    const _loop = new GLib.MainLoop(null, false);
    proxy = new Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SESSION,
        0, null,
        'org.endlessos.onboarding',
        '/org/endlessos/onboarding',
        'org.endlessos.onboarding',
        null);

    drawFuzzy('top left', '20% 10%', 'rect')
        .then(drawFuzzy.bind(this, 'center', '10%', 'circle'))
        .then(drawFuzzy.bind(this, 'bottom', '200px 3:1'))
        .then(drawFuzzy.bind(this, 'bottom right', '40% 50px'))
        .then(drawFuzzy.bind(this, 'left', '200px 90%'))
        .catch((out) => log(`reject ${out}`))
        .finally(() => { _loop.quit() });

    _loop.run();
}

testInit();
