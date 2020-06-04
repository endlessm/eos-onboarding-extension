const {Gio, GLib} = imports.gi;

let proxy = null;

function drawCircle(x, y, radius) {
    return new Promise((resolve, reject) => {
        const variant = new GLib.Variant('(uuusb)', [x, y, radius, 'This is a circle', false]);
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
        const variant = new GLib.Variant('(uuuusb)', [x, y, width, height, 'This is a rectangle', false]);
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
        const variant = new GLib.Variant('(ssb)', [className, text, false]);
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
        'com.endlessm.tour',
        '/com/endlessm/tour',
        'org.freedesktop.DBus.Properties',
        null);

    const variant = new GLib.Variant('(ssv)',
        ['com.endlessm.tour', prop, new GLib.Variant('b', value)]);

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
        'com.endlessm.tour',
        '/com/endlessm/tour',
        'com.endlessm.tour',
        null);

    proxy.call('ShowOverview', new GLib.Variant('(b)', [true]), Gio.DBusCallFlags.NONE, -1, null, (proxy, res) => {});
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
