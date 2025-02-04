import { T as Tree, N as NodeProp, a as TreeFragment, b as NodeType } from './tree.es-a8ccfba9.js';
import { F as Facet, S as StateField, j as EditorState, T as Transaction, l as Text, b as StateEffect, i as countColumn } from './index-760ad7b2.js';
import { V as ViewPlugin } from './index-69193cdd.js';

/**
Node prop stored in a grammar's top syntax node to provide the
facet that stores language data for that language.
*/
const languageDataProp = /*@__PURE__*/new NodeProp();
/**
Helper function to define a facet (to be added to the top syntax
node(s) for a language via
[`languageDataProp`](https://codemirror.net/6/docs/ref/#language.languageDataProp)), that will be
used to associate language data with the language. You
probably only need this when subclassing
[`Language`](https://codemirror.net/6/docs/ref/#language.Language).
*/
function defineLanguageFacet(baseData) {
    return Facet.define({
        combine: baseData ? values => values.concat(baseData) : undefined
    });
}
/**
A language object manages parsing and per-language
[metadata](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt). Parse data is
managed as a [Lezer](https://lezer.codemirror.net) tree. You'll
want to subclass this class for custom parsers, or use the
[`LezerLanguage`](https://codemirror.net/6/docs/ref/#language.LezerLanguage) or
[`StreamLanguage`](https://codemirror.net/6/docs/ref/#stream-parser.StreamLanguage) abstractions for
[Lezer](https://lezer.codemirror.net/) or stream parsers.
*/
class Language {
    /**
    Construct a language object. You usually don't need to invoke
    this directly. But when you do, make sure you use
    [`defineLanguageFacet`](https://codemirror.net/6/docs/ref/#language.defineLanguageFacet) to create
    the first argument.
    */
    constructor(
    /**
    The [language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) data
    facet used for this language.
    */
    data, parser, 
    /**
    The node type of the top node of trees produced by this parser.
    */
    topNode, extraExtensions = []) {
        this.data = data;
        this.topNode = topNode;
        // Kludge to define EditorState.tree as a debugging helper,
        // without the EditorState package actually knowing about
        // languages and lezer trees.
        if (!EditorState.prototype.hasOwnProperty("tree"))
            Object.defineProperty(EditorState.prototype, "tree", { get() { return syntaxTree(this); } });
        this.parser = parser;
        this.extension = [
            language.of(this),
            EditorState.languageData.of((state, pos) => state.facet(languageDataFacetAt(state, pos)))
        ].concat(extraExtensions);
    }
    /**
    Query whether this language is active at the given position.
    */
    isActiveAt(state, pos) {
        return languageDataFacetAt(state, pos) == this.data;
    }
    /**
    Find the document regions that were parsed using this language.
    The returned regions will _include_ any nested languages rooted
    in this language, when those exist.
    */
    findRegions(state) {
        let lang = state.facet(language);
        if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data)
            return [{ from: 0, to: state.doc.length }];
        if (!lang || !lang.allowsNesting)
            return [];
        let result = [];
        syntaxTree(state).iterate({
            enter: (type, from, to) => {
                if (type.isTop && type.prop(languageDataProp) == this.data) {
                    result.push({ from, to });
                    return false;
                }
                return undefined;
            }
        });
        return result;
    }
    /**
    Indicates whether this language allows nested languages. The
    default implementation returns true.
    */
    get allowsNesting() { return true; }
    /**
    Use this language to parse the given string into a tree.
    */
    parseString(code) {
        let doc = Text.of(code.split("\n"));
        let parse = this.parser.startParse(new DocInput(doc), 0, new EditorParseContext(this.parser, EditorState.create({ doc }), [], Tree.empty, { from: 0, to: code.length }, [], null));
        let tree;
        while (!(tree = parse.advance())) { }
        return tree;
    }
}
/**
@internal
*/
Language.setState = /*@__PURE__*/StateEffect.define();
function languageDataFacetAt(state, pos) {
    let topLang = state.facet(language);
    if (!topLang)
        return null;
    if (!topLang.allowsNesting)
        return topLang.data;
    let tree = syntaxTree(state);
    let target = tree.resolve(pos, -1);
    while (target) {
        let facet = target.type.prop(languageDataProp);
        if (facet)
            return facet;
        target = target.parent;
    }
    return topLang.data;
}
/**
A subclass of [`Language`](https://codemirror.net/6/docs/ref/#language.Language) for use with
[Lezer](https://lezer.codemirror.net/docs/ref#lezer.Parser)
parsers.
*/
class LezerLanguage extends Language {
    constructor(data, parser) {
        super(data, parser, parser.topNode);
        this.parser = parser;
    }
    /**
    Define a language from a parser.
    */
    static define(spec) {
        let data = defineLanguageFacet(spec.languageData);
        return new LezerLanguage(data, spec.parser.configure({
            props: [languageDataProp.add(type => type.isTop ? data : undefined)]
        }));
    }
    /**
    Create a new instance of this language with a reconfigured
    version of its parser.
    */
    configure(options) {
        return new LezerLanguage(this.data, this.parser.configure(options));
    }
    get allowsNesting() { return this.parser.hasNested; }
}
/**
Get the syntax tree for a state, which is the current (possibly
incomplete) parse tree of active [language](https://codemirror.net/6/docs/ref/#language.Language),
or the empty tree if there is no language available.
*/
function syntaxTree(state) {
    let field = state.field(Language.state, false);
    return field ? field.tree : Tree.empty;
}
// Lezer-style Input object for a Text document.
class DocInput {
    constructor(doc, length = doc.length) {
        this.doc = doc;
        this.length = length;
        this.cursorPos = 0;
        this.string = "";
        this.prevString = "";
        this.cursor = doc.iter();
    }
    syncTo(pos) {
        if (pos < this.cursorPos) { // Reset the cursor if we have to go back
            this.cursor = this.doc.iter();
            this.cursorPos = 0;
        }
        this.prevString = pos == this.cursorPos ? this.string : "";
        this.string = this.cursor.next(pos - this.cursorPos).value;
        this.cursorPos = pos + this.string.length;
        return this.cursorPos - this.string.length;
    }
    get(pos) {
        if (pos >= this.length)
            return -1;
        let stringStart = this.cursorPos - this.string.length;
        if (pos < stringStart || pos >= this.cursorPos) {
            if (pos < stringStart && pos >= stringStart - this.prevString.length)
                return this.prevString.charCodeAt(pos - (stringStart - this.prevString.length));
            stringStart = this.syncTo(pos);
        }
        return this.string.charCodeAt(pos - stringStart);
    }
    lineAfter(pos) {
        if (pos >= this.length || pos < 0)
            return "";
        let stringStart = this.cursorPos - this.string.length;
        if (pos < stringStart || pos >= this.cursorPos)
            stringStart = this.syncTo(pos);
        return this.cursor.lineBreak ? "" : this.string.slice(pos - stringStart, Math.min(this.length - stringStart, this.string.length));
    }
    read(from, to) {
        let stringStart = this.cursorPos - this.string.length;
        if (from < stringStart || to >= this.cursorPos)
            return this.doc.sliceString(from, to);
        else
            return this.string.slice(from - stringStart, to - stringStart);
    }
    clip(at) {
        return new DocInput(this.doc, at);
    }
}
/**
A parse context provided to parsers working on the editor content.
*/
class EditorParseContext {
    /**
    @internal
    */
    constructor(parser, 
    /**
    The current editor state.
    */
    state, 
    /**
    Tree fragments that can be reused by incremental re-parses.
    */
    fragments = [], 
    /**
    @internal
    */
    tree, 
    /**
    The current editor viewport (or some overapproximation
    thereof). Intended to be used for opportunistically avoiding
    work (in which case
    [`skipUntilInView`](https://codemirror.net/6/docs/ref/#language.EditorParseContext.skipUntilInView)
    should be called to make sure the parser is restarted when the
    skipped region becomes visible).
    */
    viewport, 
    /**
    @internal
    */
    skipped, 
    /**
    This is where skipping parsers can register a promise that,
    when resolved, will schedule a new parse. It is cleared when
    the parse worker picks up the promise. @internal
    */
    scheduleOn) {
        this.parser = parser;
        this.state = state;
        this.fragments = fragments;
        this.tree = tree;
        this.viewport = viewport;
        this.skipped = skipped;
        this.scheduleOn = scheduleOn;
        this.parse = null;
        /**
        @internal
        */
        this.tempSkipped = [];
    }
    /**
    @internal
    */
    work(time, upto) {
        if (this.tree != Tree.empty && (upto == null ? this.tree.length == this.state.doc.length : this.tree.length >= upto)) {
            this.takeTree();
            return true;
        }
        if (!this.parse)
            this.parse = this.parser.startParse(new DocInput(this.state.doc), 0, this);
        let endTime = Date.now() + time;
        for (;;) {
            let done = this.parse.advance();
            if (done) {
                this.fragments = this.withoutTempSkipped(TreeFragment.addTree(done));
                this.parse = null;
                this.tree = done;
                return true;
            }
            else if (upto != null && this.parse.pos >= upto) {
                this.takeTree();
                return true;
            }
            if (Date.now() > endTime)
                return false;
        }
    }
    /**
    @internal
    */
    takeTree() {
        if (this.parse && this.parse.pos > this.tree.length) {
            this.tree = this.parse.forceFinish();
            this.fragments = this.withoutTempSkipped(TreeFragment.addTree(this.tree, this.fragments, true));
        }
    }
    withoutTempSkipped(fragments) {
        for (let r; r = this.tempSkipped.pop();)
            fragments = cutFragments(fragments, r.from, r.to);
        return fragments;
    }
    /**
    @internal
    */
    changes(changes, newState) {
        let { fragments, tree, viewport, skipped } = this;
        this.takeTree();
        if (!changes.empty) {
            let ranges = [];
            changes.iterChangedRanges((fromA, toA, fromB, toB) => ranges.push({ fromA, toA, fromB, toB }));
            fragments = TreeFragment.applyChanges(fragments, ranges);
            tree = Tree.empty;
            viewport = { from: changes.mapPos(viewport.from, -1), to: changes.mapPos(viewport.to, 1) };
            if (this.skipped.length) {
                skipped = [];
                for (let r of this.skipped) {
                    let from = changes.mapPos(r.from, 1), to = changes.mapPos(r.to, -1);
                    if (from < to)
                        skipped.push({ from, to });
                }
            }
        }
        return new EditorParseContext(this.parser, newState, fragments, tree, viewport, skipped, this.scheduleOn);
    }
    /**
    @internal
    */
    updateViewport(viewport) {
        this.viewport = viewport;
        let startLen = this.skipped.length;
        for (let i = 0; i < this.skipped.length; i++) {
            let { from, to } = this.skipped[i];
            if (from < viewport.to && to > viewport.from) {
                this.fragments = cutFragments(this.fragments, from, to);
                this.skipped.splice(i--, 1);
            }
        }
        return this.skipped.length < startLen;
    }
    /**
    @internal
    */
    reset() {
        if (this.parse) {
            this.takeTree();
            this.parse = null;
        }
    }
    /**
    Notify the parse scheduler that the given region was skipped
    because it wasn't in view, and the parse should be restarted
    when it comes into view.
    */
    skipUntilInView(from, to) {
        this.skipped.push({ from, to });
    }
    /**
    Returns a parser intended to be used as placeholder when
    asynchronously loading a nested parser. It'll skip its input and
    mark it as not-really-parsed, so that the next update will parse
    it again.
    
    When `until` is given, a reparse will be scheduled when that
    promise resolves.
    */
    static getSkippingParser(until) {
        return {
            startParse(input, startPos, context) {
                return {
                    pos: startPos,
                    advance() {
                        let ecx = context;
                        ecx.tempSkipped.push({ from: startPos, to: input.length });
                        if (until)
                            ecx.scheduleOn = ecx.scheduleOn ? Promise.all([ecx.scheduleOn, until]) : until;
                        this.pos = input.length;
                        return new Tree(NodeType.none, [], [], input.length - startPos);
                    },
                    forceFinish() { return this.advance(); }
                };
            }
        };
    }
    /**
    @internal
    */
    movedPast(pos) {
        return this.tree.length < pos && this.parse && this.parse.pos >= pos;
    }
}
/**
FIXME backwards compatible shim, remove on next major @internal
*/
EditorParseContext.skippingParser = /*@__PURE__*/EditorParseContext.getSkippingParser();
function cutFragments(fragments, from, to) {
    return TreeFragment.applyChanges(fragments, [{ fromA: from, toA: to, fromB: from, toB: to }]);
}
class LanguageState {
    constructor(
    // A mutable parse state that is used to preserve work done during
    // the lifetime of a state when moving to the next state.
    context) {
        this.context = context;
        this.tree = context.tree;
    }
    apply(tr) {
        if (!tr.docChanged)
            return this;
        let newCx = this.context.changes(tr.changes, tr.state);
        // If the previous parse wasn't done, go forward only up to its
        // end position or the end of the viewport, to avoid slowing down
        // state updates with parse work beyond the viewport.
        let upto = this.context.tree.length == tr.startState.doc.length ? undefined
            : Math.max(tr.changes.mapPos(this.context.tree.length), newCx.viewport.to);
        if (!newCx.work(25 /* Apply */, upto))
            newCx.takeTree();
        return new LanguageState(newCx);
    }
    static init(state) {
        let parseState = new EditorParseContext(state.facet(language).parser, state, [], Tree.empty, { from: 0, to: state.doc.length }, [], null);
        if (!parseState.work(25 /* Apply */))
            parseState.takeTree();
        return new LanguageState(parseState);
    }
}
Language.state = /*@__PURE__*/StateField.define({
    create: LanguageState.init,
    update(value, tr) {
        for (let e of tr.effects)
            if (e.is(Language.setState))
                return e.value;
        if (tr.startState.facet(language) != tr.state.facet(language))
            return LanguageState.init(tr.state);
        return value.apply(tr);
    }
});
let requestIdle = typeof window != "undefined" && window.requestIdleCallback ||
    ((callback, { timeout }) => setTimeout(callback, timeout));
let cancelIdle = typeof window != "undefined" && window.cancelIdleCallback || clearTimeout;
const parseWorker = /*@__PURE__*/ViewPlugin.fromClass(class ParseWorker {
    constructor(view) {
        this.view = view;
        this.working = -1;
        // End of the current time chunk
        this.chunkEnd = -1;
        // Milliseconds of budget left for this chunk
        this.chunkBudget = -1;
        this.work = this.work.bind(this);
        this.scheduleWork();
    }
    update(update) {
        let cx = this.view.state.field(Language.state).context;
        if (update.viewportChanged) {
            if (cx.updateViewport(update.view.viewport))
                cx.reset();
            if (this.view.viewport.to > cx.tree.length)
                this.scheduleWork();
        }
        if (update.docChanged) {
            if (this.view.hasFocus)
                this.chunkBudget += 50 /* ChangeBonus */;
            this.scheduleWork();
        }
        this.checkAsyncSchedule(cx);
    }
    scheduleWork() {
        if (this.working > -1)
            return;
        let { state } = this.view, field = state.field(Language.state), frags = field.context.fragments;
        if (field.tree.length >= state.doc.length && frags.length && frags[0].from == 0 && frags[0].to >= state.doc.length)
            return;
        this.working = requestIdle(this.work, { timeout: 500 /* Pause */ });
    }
    work(deadline) {
        this.working = -1;
        let now = Date.now();
        if (this.chunkEnd < now && (this.chunkEnd < 0 || this.view.hasFocus)) { // Start a new chunk
            this.chunkEnd = now + 30000 /* ChunkTime */;
            this.chunkBudget = 3000 /* ChunkBudget */;
        }
        if (this.chunkBudget <= 0)
            return; // No more budget
        let { state, viewport: { to: vpTo } } = this.view, field = state.field(Language.state);
        if (field.tree.length >= vpTo + 1000000 /* MaxParseAhead */)
            return;
        let time = Math.min(this.chunkBudget, deadline ? Math.max(25 /* MinSlice */, deadline.timeRemaining()) : 100 /* Slice */);
        let done = field.context.work(time, vpTo + 1000000 /* MaxParseAhead */);
        this.chunkBudget -= Date.now() - now;
        if (done || this.chunkBudget <= 0 || field.context.movedPast(vpTo)) {
            field.context.takeTree();
            this.view.dispatch({ effects: Language.setState.of(new LanguageState(field.context)) });
        }
        if (!done && this.chunkBudget > 0)
            this.scheduleWork();
        this.checkAsyncSchedule(field.context);
    }
    checkAsyncSchedule(cx) {
        if (cx.scheduleOn) {
            cx.scheduleOn.then(() => this.scheduleWork());
            cx.scheduleOn = null;
        }
    }
    destroy() {
        if (this.working >= 0)
            cancelIdle(this.working);
    }
}, {
    eventHandlers: { focus() { this.scheduleWork(); } }
});
/**
The facet used to associate a language with an editor state.
*/
const language = /*@__PURE__*/Facet.define({
    combine(languages) { return languages.length ? languages[0] : null; },
    enables: [Language.state, parseWorker]
});
/**
This class bundles a [language object](https://codemirror.net/6/docs/ref/#language.Language) with an
optional set of supporting extensions. Language packages are
encouraged to export a function that optionally takes a
configuration object and returns a `LanguageSupport` instance, as
the main way for client code to use the package.
*/
class LanguageSupport {
    /**
    Create a support object.
    */
    constructor(
    /**
    The language object.
    */
    language, 
    /**
    An optional set of supporting extensions. When nesting a
    language in another language, the outer language is encouraged
    to include the supporting extensions for its inner languages
    in its own set of support extensions.
    */
    support = []) {
        this.language = language;
        this.support = support;
        this.extension = [language, support];
    }
}

/**
Facet that defines a way to provide a function that computes the
appropriate indentation depth at the start of a given line, or
`null` to indicate no appropriate indentation could be determined.
*/
const indentService = /*@__PURE__*/Facet.define();
/**
Facet for overriding the unit by which indentation happens.
Should be a string consisting either entirely of spaces or
entirely of tabs. When not set, this defaults to 2 spaces.
*/
const indentUnit = /*@__PURE__*/Facet.define({
    combine: values => {
        if (!values.length)
            return "  ";
        if (!/^(?: +|\t+)$/.test(values[0]))
            throw new Error("Invalid indent unit: " + JSON.stringify(values[0]));
        return values[0];
    }
});
/**
Return the _column width_ of an indent unit in the state.
Determined by the [`indentUnit`](https://codemirror.net/6/docs/ref/#language.indentUnit)
facet, and [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) when that
contains tabs.
*/
function getIndentUnit(state) {
    let unit = state.facet(indentUnit);
    return unit.charCodeAt(0) == 9 ? state.tabSize * unit.length : unit.length;
}
/**
Create an indentation string that covers columns 0 to `cols`.
Will use tabs for as much of the columns as possible when the
[`indentUnit`](https://codemirror.net/6/docs/ref/#language.indentUnit) facet contains
tabs.
*/
function indentString(state, cols) {
    let result = "", ts = state.tabSize;
    if (state.facet(indentUnit).charCodeAt(0) == 9)
        while (cols >= ts) {
            result += "\t";
            cols -= ts;
        }
    for (let i = 0; i < cols; i++)
        result += " ";
    return result;
}
/**
Get the indentation at the given position. Will first consult any
[indent services](https://codemirror.net/6/docs/ref/#language.indentService) that are registered,
and if none of those return an indentation, this will check the
syntax tree for the [indent node prop](https://codemirror.net/6/docs/ref/#language.indentNodeProp)
and use that if found. Returns a number when an indentation could
be determined, and null otherwise.
*/
function getIndentation(context, pos) {
    if (context instanceof EditorState)
        context = new IndentContext(context);
    for (let service of context.state.facet(indentService)) {
        let result = service(context, pos);
        if (result != null)
            return result;
    }
    let tree = syntaxTree(context.state);
    return tree ? syntaxIndentation(context, tree, pos) : null;
}
/**
Indentation contexts are used when calling [indentation
services](https://codemirror.net/6/docs/ref/#language.indentService). They provide helper utilities
useful in indentation logic, and can selectively override the
indentation reported for some lines.
*/
class IndentContext {
    /**
    Create an indent context.
    */
    constructor(
    /**
    The editor state.
    */
    state, 
    /**
    @internal
    */
    options = {}) {
        this.state = state;
        this.options = options;
        this.unit = getIndentUnit(state);
    }
    /**
    Get the text directly after `pos`, either the entire line
    or the next 100 characters, whichever is shorter.
    */
    textAfterPos(pos) {
        var _a, _b;
        let sim = (_a = this.options) === null || _a === void 0 ? void 0 : _a.simulateBreak;
        if (pos == sim && ((_b = this.options) === null || _b === void 0 ? void 0 : _b.simulateDoubleBreak))
            return "";
        return this.state.sliceDoc(pos, Math.min(pos + 100, sim != null && sim > pos ? sim : 1e9, this.state.doc.lineAt(pos).to));
    }
    /**
    Find the column for the given position.
    */
    column(pos) {
        var _a;
        let line = this.state.doc.lineAt(pos), text = line.text.slice(0, pos - line.from);
        let result = this.countColumn(text, pos - line.from);
        let override = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.overrideIndentation) ? this.options.overrideIndentation(line.from) : -1;
        if (override > -1)
            result += override - this.countColumn(text, text.search(/\S/));
        return result;
    }
    /**
    find the column position (taking tabs into account) of the given
    position in the given string.
    */
    countColumn(line, pos) {
        return countColumn(pos < 0 ? line : line.slice(0, pos), 0, this.state.tabSize);
    }
    /**
    Find the indentation column of the given document line.
    */
    lineIndent(line) {
        var _a;
        let override = (_a = this.options) === null || _a === void 0 ? void 0 : _a.overrideIndentation;
        if (override) {
            let overriden = override(line.from);
            if (overriden > -1)
                return overriden;
        }
        return this.countColumn(line.text, line.text.search(/\S/));
    }
}
/**
A syntax tree node prop used to associate indentation strategies
with node types. Such a strategy is a function from an indentation
context to a column number or null, where null indicates that no
definitive indentation can be determined.
*/
const indentNodeProp = /*@__PURE__*/new NodeProp();
// Compute the indentation for a given position from the syntax tree.
function syntaxIndentation(cx, ast, pos) {
    let tree = ast.resolve(pos);
    // Enter previous nodes that end in empty error terms, which means
    // they were broken off by error recovery, so that indentation
    // works even if the constructs haven't been finished.
    for (let scan = tree, scanPos = pos;;) {
        let last = scan.childBefore(scanPos);
        if (!last)
            break;
        if (last.type.isError && last.from == last.to) {
            tree = scan;
            scanPos = last.from;
        }
        else {
            scan = last;
            scanPos = scan.to + 1;
        }
    }
    return indentFrom(tree, pos, cx);
}
function ignoreClosed(cx) {
    var _a, _b;
    return cx.pos == ((_a = cx.options) === null || _a === void 0 ? void 0 : _a.simulateBreak) && ((_b = cx.options) === null || _b === void 0 ? void 0 : _b.simulateDoubleBreak);
}
function indentStrategy(tree) {
    let strategy = tree.type.prop(indentNodeProp);
    if (strategy)
        return strategy;
    let first = tree.firstChild, close;
    if (first && (close = first.type.prop(NodeProp.closedBy))) {
        let last = tree.lastChild, closed = last && close.indexOf(last.name) > -1;
        return cx => delimitedStrategy(cx, true, 1, undefined, closed && !ignoreClosed(cx) ? last.from : undefined);
    }
    return tree.parent == null ? topIndent : null;
}
function indentFrom(node, pos, base) {
    for (; node; node = node.parent) {
        let strategy = indentStrategy(node);
        if (strategy)
            return strategy(new TreeIndentContext(base, pos, node));
    }
    return null;
}
function topIndent() { return 0; }
/**
Objects of this type provide context information and helper
methods to indentation functions.
*/
class TreeIndentContext extends IndentContext {
    /**
    @internal
    */
    constructor(base, 
    /**
    The position at which indentation is being computed.
    */
    pos, 
    /**
    The syntax tree node to which the indentation strategy
    applies.
    */
    node) {
        super(base.state, base.options);
        this.base = base;
        this.pos = pos;
        this.node = node;
    }
    /**
    Get the text directly after `this.pos`, either the entire line
    or the next 100 characters, whichever is shorter.
    */
    get textAfter() {
        return this.textAfterPos(this.pos);
    }
    /**
    Get the indentation at the reference line for `this.node`, which
    is the line on which it starts, unless there is a node that is
    _not_ a parent of this node covering the start of that line. If
    so, the line at the start of that node is tried, again skipping
    on if it is covered by another such node.
    */
    get baseIndent() {
        let line = this.state.doc.lineAt(this.node.from);
        // Skip line starts that are covered by a sibling (or cousin, etc)
        for (;;) {
            let atBreak = this.node.resolve(line.from);
            while (atBreak.parent && atBreak.parent.from == atBreak.from)
                atBreak = atBreak.parent;
            if (isParent(atBreak, this.node))
                break;
            line = this.state.doc.lineAt(atBreak.from);
        }
        return this.lineIndent(line);
    }
    /**
    Continue looking for indentations in the node's parent nodes,
    and return the result of that.
    */
    continue() {
        let parent = this.node.parent;
        return parent ? indentFrom(parent, this.pos, this.base) : 0;
    }
}
function isParent(parent, of) {
    for (let cur = of; cur; cur = cur.parent)
        if (parent == cur)
            return true;
    return false;
}
// Check whether a delimited node is aligned (meaning there are
// non-skipped nodes on the same line as the opening delimiter). And
// if so, return the opening token.
function bracketedAligned(context) {
    var _a;
    let tree = context.node;
    let openToken = tree.childAfter(tree.from), last = tree.lastChild;
    if (!openToken)
        return null;
    let sim = (_a = context.options) === null || _a === void 0 ? void 0 : _a.simulateBreak;
    let openLine = context.state.doc.lineAt(openToken.from);
    let lineEnd = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim);
    for (let pos = openToken.to;;) {
        let next = tree.childAfter(pos);
        if (!next || next == last)
            return null;
        if (!next.type.isSkipped)
            return next.from < lineEnd ? openToken : null;
        pos = next.to;
    }
}
function delimitedStrategy(context, align, units, closing, closedAt) {
    let after = context.textAfter, space = after.match(/^\s*/)[0].length;
    let closed = closing && after.slice(space, space + closing.length) == closing || closedAt == context.pos + space;
    let aligned = align ? bracketedAligned(context) : null;
    if (aligned)
        return closed ? context.column(aligned.from) : context.column(aligned.to);
    return context.baseIndent + (closed ? 0 : context.unit * units);
}
const DontIndentBeyond = 200;
/**
Enables reindentation on input. When a language defines an
`indentOnInput` field in its [language
data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt), which must hold a regular
expression, the line at the cursor will be reindented whenever new
text is typed and the input from the start of the line up to the
cursor matches that regexp.

To avoid unneccesary reindents, it is recommended to start the
regexp with `^` (usually followed by `\s*`), and end it with `$`.
For example, `/^\s*\}$/` will reindent when a closing brace is
added at the start of a line.
*/
function indentOnInput() {
    return EditorState.transactionFilter.of(tr => {
        if (!tr.docChanged || tr.annotation(Transaction.userEvent) != "input")
            return tr;
        let rules = tr.startState.languageDataAt("indentOnInput", tr.startState.selection.main.head);
        if (!rules.length)
            return tr;
        let doc = tr.newDoc, { head } = tr.newSelection.main, line = doc.lineAt(head);
        if (head > line.from + DontIndentBeyond)
            return tr;
        let lineStart = doc.sliceString(line.from, head);
        if (!rules.some(r => r.test(lineStart)))
            return tr;
        let { state } = tr, last = -1, changes = [];
        for (let { head } of state.selection.ranges) {
            let line = state.doc.lineAt(head);
            if (line.from == last)
                continue;
            last = line.from;
            let indent = getIndentation(state, line.from);
            if (indent == null)
                continue;
            let cur = /^\s*/.exec(line.text)[0];
            let norm = indentString(state, indent);
            if (cur != norm)
                changes.push({ from: line.from, to: line.from + cur.length, insert: norm });
        }
        return changes.length ? [tr, { changes }] : tr;
    });
}

/**
A facet that registers a code folding service. When called with
the extent of a line, such a function should return a foldable
range that starts on that line (but continues beyond it), if one
can be found.
*/
const foldService = /*@__PURE__*/Facet.define();
/**
This node prop is used to associate folding information with
syntax node types. Given a syntax node, it should check whether
that tree is foldable and return the range that can be collapsed
when it is.
*/
const foldNodeProp = /*@__PURE__*/new NodeProp();
function syntaxFolding(state, start, end) {
    let tree = syntaxTree(state);
    if (tree.length == 0)
        return null;
    let inner = tree.resolve(end);
    let found = null;
    for (let cur = inner; cur; cur = cur.parent) {
        if (cur.to <= end || cur.from > end)
            continue;
        if (found && cur.from < start)
            break;
        let prop = cur.type.prop(foldNodeProp);
        if (prop) {
            let value = prop(cur, state);
            if (value && value.from <= end && value.from >= start && value.to > end)
                found = value;
        }
    }
    return found;
}
/**
Check whether the given line is foldable. First asks any fold
services registered through
[`foldService`](https://codemirror.net/6/docs/ref/#language.foldService), and if none of them return
a result, tries to query the [fold node
prop](https://codemirror.net/6/docs/ref/#language.foldNodeProp) of syntax nodes that cover the end
of the line.
*/
function foldable(state, lineStart, lineEnd) {
    for (let service of state.facet(foldService)) {
        let result = service(state, lineStart, lineEnd);
        if (result)
            return result;
    }
    return syntaxFolding(state, lineStart, lineEnd);
}

export { IndentContext as I, LezerLanguage as L, indentUnit as a, indentString as b, getIndentation as c, indentNodeProp as d, foldNodeProp as e, foldable as f, getIndentUnit as g, LanguageSupport as h, indentOnInput as i, language as l, syntaxTree as s };
