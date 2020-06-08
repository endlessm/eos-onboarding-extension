/* exported skip, enable, disable */

const Main = imports.ui.main;
const { Gio, GLib, Shell } = imports.gi;
const ShellDBus = imports.ui.shellDBus;

const ExtensionUtils = imports.misc.extensionUtils;
const Tour = ExtensionUtils.getCurrentExtension();
const Utils = Tour.imports.utils;
const Highlight = Tour.imports.highlight;

const IFACE = Utils.loadInterfaceXML('com.endlessm.tour');

var Service = class {
    constructor() {
        this._propagateEvents = true;
        this._skippable = true;
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
        this._nameId = Gio.bus_own_name_on_connection(Gio.DBus.session, 'com.endlessm.tour',
            Gio.BusNameOwnerFlags.REPLACE, null, null);

        try {
            this._dbusImpl.export(Gio.DBus.session, '/com/endlessm/tour');
        } catch (e) {
            logError(e, 'Cannot export Tour service');
            return;
        }
    }

    stop() {
        try {
            this._dbusImpl.unexport();
        } catch (e) {
            logError(e, 'Cannot unexport Tour service');
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

    Overview(method) {
        // Overview method, this could be used to show/hide the overview with
        // the toggle method or to show the desktop on EOS with showApps
        const fn = Main.overview[method];
        if (fn) {
            fn.bind(Main.overview)();
        }
    }

    Clean() {
        Highlight.clean();
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
