const {Gio, GLib} = imports.gi;

let proxy = null;

function drawCircle(x, y, radius) {
    return new Promise((resolve, reject) => {
        const variant = new GLib.Variant('(uuusb)', [x, y, radius, 'This is a circle', false]);
        proxy.call('HighlightCircle', variant, Gio.DBusCallFlags.NONE, 20000, null,
            (proxy, res) => {
                const [result] = proxy.call_finish(res).deep_unpack();
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
                resolve(result);
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

    drawRectangle(1920 / 2 - 30, 5, 60, 20)
        .then(drawCircle.bind(this, 800, 400, 50))
        .then(drawRectangle.bind(this, 1000, 1040, 920, 40))
        .then(() => { _loop.quit() });

    _loop.run();
}

testInit();
