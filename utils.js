/* exported loadInterfaceXML, gettext */

const { Gio } = imports.gi;
const Gettext = imports.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();

Gettext.textdomain('tour-extension')
var gettext = Gettext.gettext;

function loadInterfaceXML(iface) {
    const dir = Extension.dir.get_child('data').get_child('dbus-interfaces')
        .get_path();

    let xml = null;
    const uri = `file://${dir}/${iface}.xml`;
    const f = Gio.File.new_for_uri(uri);

    try {
        const [ok_, bytes] = f.load_contents(null);
        if (bytes instanceof Uint8Array)
            xml = imports.byteArray.toString(bytes);
        else
            xml = bytes.toString();
    } catch (e) {
        log(`Failed to load D-Bus interface ${iface}`);
    }

    return xml;
}
