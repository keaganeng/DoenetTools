import { R as RangeSet, V as ViewPlugin, B as BlockType, P as PluginField, c as Direction, E as EditorView, b as RangeValue } from './index-69193cdd.js';
import { M as MapMode, F as Facet, c as combineConfig } from './index-760ad7b2.js';

/**
A gutter marker represents a bit of information attached to a line
in a specific gutter. Your own custom markers have to extend this
class.
*/
class GutterMarker extends RangeValue {
    /**
    @internal
    */
    compare(other) {
        return this == other || this.constructor == other.constructor && this.eq(other);
    }
    /**
    Compare this marker to another marker of the same type.
    */
    eq(other) { return false; }
    /**
    @internal FIXME remove on next major version
    */
    at(pos) { return this.range(pos); }
}
GutterMarker.prototype.elementClass = "";
GutterMarker.prototype.toDOM = undefined;
GutterMarker.prototype.mapMode = MapMode.TrackBefore;
GutterMarker.prototype.point = true;
/**
Facet used to add a class to all gutter elements for a given line.
Markers given to this facet should _only_ define an
[`elementclass`](https://codemirror.net/6/docs/ref/#gutter.GutterMarker.elementClass), not a
[`toDOM`](https://codemirror.net/6/docs/ref/#gutter.GutterMarker.toDOM) (or the marker will appear
in all gutters for the line).
*/
const gutterLineClass = /*@__PURE__*/Facet.define();
const defaults = {
    class: "",
    renderEmptyElements: false,
    elementStyle: "",
    markers: () => RangeSet.empty,
    lineMarker: () => null,
    initialSpacer: null,
    updateSpacer: null,
    domEventHandlers: {}
};
const activeGutters = /*@__PURE__*/Facet.define();
/**
Define an editor gutter. The order in which the gutters appear is
determined by their extension priority.
*/
function gutter(config) {
    return [gutters(), activeGutters.of(Object.assign(Object.assign({}, defaults), config))];
}
const baseTheme = /*@__PURE__*/EditorView.baseTheme({
    ".cm-gutters": {
        display: "flex",
        height: "100%",
        boxSizing: "border-box",
        left: 0,
        zIndex: 200
    },
    "&light .cm-gutters": {
        backgroundColor: "#f5f5f5",
        color: "#999",
        borderRight: "1px solid #ddd"
    },
    "&dark .cm-gutters": {
        backgroundColor: "#333338",
        color: "#ccc"
    },
    ".cm-gutter": {
        display: "flex !important",
        flexDirection: "column",
        flexShrink: 0,
        boxSizing: "border-box",
        height: "100%",
        overflow: "hidden"
    },
    ".cm-gutterElement": {
        boxSizing: "border-box"
    },
    ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 3px 0 5px",
        minWidth: "20px",
        textAlign: "right",
        whiteSpace: "nowrap"
    },
    "&light .cm-activeLineGutter": {
        backgroundColor: "#e2f2ff"
    },
    "&dark .cm-activeLineGutter": {
        backgroundColor: "#222227"
    }
});
const unfixGutters = /*@__PURE__*/Facet.define({
    combine: values => values.some(x => x)
});
/**
The gutter-drawing plugin is automatically enabled when you add a
gutter, but you can use this function to explicitly configure it.

Unless `fixed` is explicitly set to `false`, the gutters are
fixed, meaning they don't scroll along with the content
horizontally (except on Internet Explorer, which doesn't support
CSS [`position:
sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)).
*/
function gutters(config) {
    let result = [
        gutterView,
        baseTheme
    ];
    if (config && config.fixed === false)
        result.push(unfixGutters.of(true));
    return result;
}
const gutterView = /*@__PURE__*/ViewPlugin.fromClass(class {
    constructor(view) {
        this.view = view;
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutters";
        this.dom.setAttribute("aria-hidden", "true");
        this.gutters = view.state.facet(activeGutters).map(conf => new SingleGutterView(view, conf));
        for (let gutter of this.gutters)
            this.dom.appendChild(gutter.dom);
        this.fixed = !view.state.facet(unfixGutters);
        if (this.fixed) {
            // FIXME IE11 fallback, which doesn't support position: sticky,
            // by using position: relative + event handlers that realign the
            // gutter (or just force fixed=false on IE11?)
            this.dom.style.position = "sticky";
        }
        view.scrollDOM.insertBefore(this.dom, view.contentDOM);
        this.syncGutters();
    }
    update(update) {
        if (this.updateGutters(update))
            this.syncGutters();
    }
    syncGutters() {
        let lineClasses = RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
        let classSet = [];
        let contexts = this.gutters.map(gutter => new UpdateContext(gutter, this.view.viewport));
        this.view.viewportLines(line => {
            let text;
            if (Array.isArray(line.type)) {
                for (let b of line.type)
                    if (b.type == BlockType.Text) {
                        text = b;
                        break;
                    }
            }
            else {
                text = line.type == BlockType.Text ? line : undefined;
            }
            if (!text)
                return;
            if (classSet.length)
                classSet = [];
            advanceCursor(lineClasses, classSet, line.from);
            for (let cx of contexts)
                cx.line(this.view, text, classSet);
        }, 0);
        for (let cx of contexts)
            cx.finish();
        this.dom.style.minHeight = this.view.contentHeight + "px";
        if (this.view.state.facet(unfixGutters) != !this.fixed) {
            this.fixed = !this.fixed;
            this.dom.style.position = this.fixed ? "sticky" : "";
        }
    }
    updateGutters(update) {
        let prev = update.startState.facet(activeGutters), cur = update.state.facet(activeGutters);
        let change = update.docChanged || update.heightChanged || update.viewportChanged ||
            !RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
        if (prev == cur) {
            for (let gutter of this.gutters)
                if (gutter.update(update))
                    change = true;
        }
        else {
            change = true;
            let gutters = [];
            for (let conf of cur) {
                let known = prev.indexOf(conf);
                if (known < 0) {
                    gutters.push(new SingleGutterView(this.view, conf));
                }
                else {
                    this.gutters[known].update(update);
                    gutters.push(this.gutters[known]);
                }
            }
            for (let g of this.gutters)
                g.dom.remove();
            for (let g of gutters)
                this.dom.appendChild(g.dom);
            this.gutters = gutters;
        }
        return change;
    }
    destroy() {
        this.dom.remove();
    }
}, {
    provide: /*@__PURE__*/PluginField.scrollMargins.from(value => {
        if (value.gutters.length == 0 || !value.fixed)
            return null;
        return value.view.textDirection == Direction.LTR ? { left: value.dom.offsetWidth } : { right: value.dom.offsetWidth };
    })
});
function asArray(val) { return (Array.isArray(val) ? val : [val]); }
function advanceCursor(cursor, collect, pos) {
    while (cursor.value && cursor.from <= pos) {
        if (cursor.from == pos)
            collect.push(cursor.value);
        cursor.next();
    }
}
class UpdateContext {
    constructor(gutter, viewport) {
        this.gutter = gutter;
        this.localMarkers = [];
        this.i = 0;
        this.height = 0;
        this.cursor = RangeSet.iter(gutter.markers, viewport.from);
    }
    line(view, line, extraMarkers) {
        if (this.localMarkers.length)
            this.localMarkers = [];
        advanceCursor(this.cursor, this.localMarkers, line.from);
        let localMarkers = extraMarkers.length ? this.localMarkers.concat(extraMarkers) : this.localMarkers;
        let forLine = this.gutter.config.lineMarker(view, line, localMarkers);
        if (forLine)
            localMarkers.unshift(forLine);
        let gutter = this.gutter;
        if (localMarkers.length == 0 && !gutter.config.renderEmptyElements)
            return;
        let above = line.top - this.height;
        if (this.i == gutter.elements.length) {
            let newElt = new GutterElement(view, line.height, above, localMarkers);
            gutter.elements.push(newElt);
            gutter.dom.appendChild(newElt.dom);
        }
        else {
            let elt = gutter.elements[this.i];
            if (sameMarkers(localMarkers, elt.markers))
                localMarkers = elt.markers;
            elt.update(view, line.height, above, localMarkers);
        }
        this.height = line.bottom;
        this.i++;
    }
    finish() {
        let gutter = this.gutter;
        while (gutter.elements.length > this.i)
            gutter.dom.removeChild(gutter.elements.pop().dom);
    }
}
class SingleGutterView {
    constructor(view, config) {
        this.view = view;
        this.config = config;
        this.elements = [];
        this.spacer = null;
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
        for (let prop in config.domEventHandlers) {
            this.dom.addEventListener(prop, (event) => {
                let line = view.visualLineAtHeight(event.clientY, view.contentDOM.getBoundingClientRect().top);
                if (config.domEventHandlers[prop](view, line, event))
                    event.preventDefault();
            });
        }
        this.markers = asArray(config.markers(view));
        if (config.initialSpacer) {
            this.spacer = new GutterElement(view, 0, 0, [config.initialSpacer(view)]);
            this.dom.appendChild(this.spacer.dom);
            this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
        }
    }
    update(update) {
        let prevMarkers = this.markers;
        this.markers = asArray(this.config.markers(update.view));
        if (this.spacer && this.config.updateSpacer) {
            let updated = this.config.updateSpacer(this.spacer.markers[0], update);
            if (updated != this.spacer.markers[0])
                this.spacer.update(update.view, 0, 0, [updated]);
        }
        let vp = update.view.viewport;
        return !RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to);
    }
}
class GutterElement {
    constructor(view, height, above, markers) {
        this.height = -1;
        this.above = 0;
        this.dom = document.createElement("div");
        this.update(view, height, above, markers);
    }
    update(view, height, above, markers) {
        if (this.height != height)
            this.dom.style.height = (this.height = height) + "px";
        if (this.above != above)
            this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
        if (this.markers != markers) {
            this.markers = markers;
            for (let ch; ch = this.dom.lastChild;)
                ch.remove();
            let cls = "cm-gutterElement";
            for (let m of markers) {
                if (m.toDOM)
                    this.dom.appendChild(m.toDOM(view));
                let c = m.elementClass;
                if (c)
                    cls += " " + c;
            }
            this.dom.className = cls;
        }
    }
}
function sameMarkers(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (!a[i].compare(b[i]))
            return false;
    return true;
}
/**
Facet used to provide markers to the line number gutter.
*/
const lineNumberMarkers = /*@__PURE__*/Facet.define();
const lineNumberConfig = /*@__PURE__*/Facet.define({
    combine(values) {
        return combineConfig(values, { formatNumber: String, domEventHandlers: {} }, {
            domEventHandlers(a, b) {
                let result = Object.assign({}, a);
                for (let event in b) {
                    let exists = result[event], add = b[event];
                    result[event] = exists ? (view, line, event) => exists(view, line, event) || add(view, line, event) : add;
                }
                return result;
            }
        });
    }
});
class NumberMarker extends GutterMarker {
    constructor(number) {
        super();
        this.number = number;
    }
    eq(other) { return this.number == other.number; }
    toDOM(_view) { return document.createTextNode(this.number); }
}
function formatNumber(view, number) {
    return view.state.facet(lineNumberConfig).formatNumber(number, view.state);
}
const lineNumberGutter = /*@__PURE__*/gutter({
    class: "cm-lineNumbers",
    markers(view) { return view.state.facet(lineNumberMarkers); },
    lineMarker(view, line, others) {
        if (others.some(m => m.toDOM))
            return null;
        return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line.from).number));
    },
    initialSpacer(view) {
        return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
    },
    updateSpacer(spacer, update) {
        let max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
        return max == spacer.number ? spacer : new NumberMarker(max);
    }
});
/**
Create a line number gutter extension.
*/
function lineNumbers(config = {}) {
    return [
        lineNumberConfig.of(config),
        lineNumberGutter
    ];
}
function maxLineNumber(lines) {
    let last = 9;
    while (last < lines)
        last = last * 10 + 9;
    return last;
}
const activeLineGutterMarker = /*@__PURE__*/new class extends GutterMarker {
    constructor() {
        super(...arguments);
        this.elementClass = "cm-activeLineGutter";
    }
    eq() { return true; }
};
const activeLineGutterHighlighter = /*@__PURE__*/gutterLineClass.compute(["selection"], state => {
    let marks = [], last = -1;
    for (let range of state.selection.ranges)
        if (range.empty) {
            let linePos = state.doc.lineAt(range.head).from;
            if (linePos > last) {
                last = linePos;
                marks.push(activeLineGutterMarker.range(linePos));
            }
        }
    return RangeSet.of(marks);
});
/**
Returns an extension that adds a `cm-activeLineGutter` class to
all gutter elements on the [active
line](https://codemirror.net/6/docs/ref/#view.highlightActiveLine).
*/
function highlightActiveLineGutter() {
    return activeLineGutterHighlighter;
}

export { GutterMarker as G, gutter as g, highlightActiveLineGutter as h, lineNumbers as l };
