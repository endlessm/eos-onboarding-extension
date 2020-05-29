/* exported rect, circle, widget, text, button */

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
        Main.layoutManager.addTopChrome(a);
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

function _createText(x, y, width, height, text) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];
    const label = new St.Label({ text: text, x: monitor.x + x });
    if (y < monitor.height / 2) {
        label.set_y(monitor.y + y + height + 20);
    } else {
        label.set_y(monitor.y + y - 30);
    }

    return label;
}

// TODO: find a way to fix this, the captured event is not working correctly...
function handleClick(x, y, width, height, callback) {
    const monitors = Main.layoutManager.monitors;
    const primary = Main.layoutManager.primaryIndex;
    const monitor = monitors[primary];

    clickEventHandler = global.stage.connect('button-press-event', (actor, ev) => {
        log('************** TOUR: button-press-event');
        const [evx, evy] = ev.get_coords();
        const point = new Graphene.Point({x: evx, y: evy});
        const rect = new Graphene.Rect();
        rect.size.width = width;
        rect.size.height = height;
        rect.origin.x = monitor.x + x;
        rect.origin.y = monitor.y + y;
        if (rect.contains_point(point)) {
            clean();
            callback(true);
        }
        return Clutter.EVENT_PROPAGATE;
    });
}

function rect(x, y, width, height, text, callback) {
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

    const textActor = _createText(x, y, width, height, text);
    Actors.push(textActor);

    draw();
    handleClick(x, y, width, height, callback);
}

function circle(x, y, radius, text, callback) {
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

    const textActor = _createText(x, y, width, width, text);
    Actors.push(textActor);

    draw();
    handleClick(x, y, width, width, callback);
}

function button() {
    // TODO
}
