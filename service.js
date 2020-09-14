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
/* exported skip, enable, disable */

const Main = imports.ui.main;
const { Gio, GLib, Shell } = imports.gi;
const ShellDBus = imports.ui.shellDBus;

const ExtensionUtils = imports.misc.extensionUtils;
const Onboarding = ExtensionUtils.getCurrentExtension();
const Utils = Onboarding.imports.utils;
const Highlight = Onboarding.imports.highlight;

const IFACE = Utils.loadInterfaceXML('com.endlessm.onboarding');

var Service = class {
    constructor() {
        this._isHighlight = false;
        this._propagateEvents = true;
        this._skippable = true;
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
        this._nameId = Gio.bus_own_name_on_connection(Gio.DBus.session, 'com.endlessm.onboarding',
            Gio.BusNameOwnerFlags.REPLACE, null, null);

        try {
            this._dbusImpl.export(Gio.DBus.session, '/com/endlessm/onboarding');
        } catch (e) {
            logError(e, 'Cannot export Onboarding service');
            return;
        }
    }

    stop() {
        try {
            this._dbusImpl.unexport();
        } catch (e) {
            logError(e, 'Cannot unexport Onboarding service');
        }

        if (this._nameId != 0) {
            Gio.bus_unown_name(this._nameId);
            this._nameId = 0;
        }
    }

    HighlightRectAsync([x, y, width, height, text], invocation) {
        Highlight.rect(x, y, width, height, text, this, (ret) => {
            const variant = new GLib.Variant('(b)', [ret]);
            invocation.return_value(variant);
        });
    }

    HighlightCircleAsync([x, y, radius, text], invocation) {
        Highlight.circle(x, y, radius, text, this, (ret) => {
            const variant = new GLib.Variant('(b)', [ret]);
            invocation.return_value(variant);
        });
    }

    HighlightWidgetAsync([className, text], invocation) {
        Highlight.widget(className, text, this, (ret) => {
            const variant = new GLib.Variant('(b)', [ret]);
            invocation.return_value(variant);
        });
    }

    HighlightDesktopIconAsync([appId, text], invocation) {
        Highlight.icon(appId, text, this, (ret) => {
            const variant = new GLib.Variant('(b)', [ret]);
            invocation.return_value(variant);
        });
    }

    HighlightFuzzyAsync([position, size, shape, text], invocation) {
        Highlight.fuzzy(position, size, shape, text, this, (ret) => {
            const variant = new GLib.Variant('(b)', [ret]);
            invocation.return_value(variant);
        });
    }

    ShowImageAsync([path, size, text], invocation) {
        Highlight.showImage(path, size, text, this, (ret) => {
            const variant = new GLib.Variant('(b)', [ret]);
            invocation.return_value(variant);
        });
    }

    Overview(method) {
        // Overview method, this could be used to show/hide the overview with
        // the toggle method or to show the desktop on EOS with showApps
        const fn = Main.overview[method];
        if (fn) {
            fn.bind(Main.overview)();
        }
    }

    Clean() {
        Highlight.clean(this);
    }

    skip() {
        this._dbusImpl.emit_property_changed('Skip', new GLib.Variant('b', true));
    }

    get Skippable() {
        return this._skippable;
    }

    set Skippable(enabled) {
        this._skippable = enabled;
        this._dbusImpl.emit_property_changed('Skippable', new GLib.Variant('b', enabled));
    }

    get IsHighlight() {
        return this._isHighlight;
    }

    set IsHighlight(enabled) {
        this._isHighlight = enabled;
        this._dbusImpl.emit_property_changed('IsHighlight', new GLib.Variant('b', enabled));
    }

    get PropagateEvents() {
        return this._propagateEvents;
    }

    set PropagateEvents(enabled) {
        this._propagateEvents = enabled;
        this._dbusImpl.emit_property_changed('PropagateEvents', new GLib.Variant('b', enabled));
    }
};

var SHELL_DBUS_SERVICE = null;

function enable() {
    SHELL_DBUS_SERVICE = new Service();
}

function disable() {
    if (SHELL_DBUS_SERVICE) {
        SHELL_DBUS_SERVICE.stop();
        SHELL_DBUS_SERVICE = null;
    }
}

function skip() {
    if (SHELL_DBUS_SERVICE) {
        SHELL_DBUS_SERVICE.skip();
    }
}
