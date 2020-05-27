const {Gio, GLib} = imports.gi;

function testInit() {
    const _loop = new GLib.MainLoop(null, false);
    const _proxy = new Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SESSION,
        0, null,
        'com.endlessm.Tour',
        '/com/endlessm/Tour',
        'com.endlessm.Tour',
        null);

    const variant = new GLib.Variant('(uuuusb)', [10, 10, 400, 200, 'Notification text', false]);
    _proxy.call('HighlightRect', variant, Gio.DBusCallFlags.NONE, -1, null,
        (proxy, res) => {
            const [result] = proxy.call_finish(res).deep_unpack();
            print(`Rect finished with result with result: ${result}`);
            _loop.quit();
        });

    _loop.run();
}

testInit();
