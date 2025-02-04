import {parser} from './doenet.js'

/**
 *  takes in a string an outputs a TreeCursor
 * @param {string} inText 
 */
export function parse(inText) {
    return parser.parse(inText).cursor();
}

/**
 * parse string and output a convinent to use object. 
 * @param {string} inText
 */
export function parseAndCompile(inText){
    function compileElement(cursor){
        if(cursor.name != "Element"){
            throw Error("compileElement() called on a non-Element");
        }

        cursor.firstChild();

        if (cursor.name === "OpenTag"){
            //skip the start tag node
            cursor.firstChild();
            cursor.nextSibling()
            let tagName = inText.substring(cursor.from,cursor.to);

            let attrs = [];
            while(cursor.nextSibling()){

                //All of the siblings must be Attributes, but we're checking just in case the grammar changes
                if(cursor.name != "Attribute"){
                    throw Error("Expected an Attribute in OpenTag, got ", cursor);
                }

                //Attributes always have exactly two children, an AttributeName and an Attribute Value
                //We scrape the content of both from the in string and add them to the attribute array here
                cursor.firstChild();
                let attrName = inText.substring(cursor.from,cursor.to);
                cursor.nextSibling();
                //TODO see if one can have a macro and other attribute contents
                //boundry fuddling to ignore the quotes
                let attrValue = inText.substring(cursor.from+1,cursor.to-1);

                //move out of Attribute to maintain loop invariant
                cursor.parent();

                let attr = {};
                attr[attrName] = attrValue;

                attrs.push(attr);

            }

            //get back to the level of OpenTag in order to parse tag body
            cursor.parent();

            let element = {contentType : tagName, attributes : attrs, children : []}
            // now we go through all of the other non-terminals in this row until we get to the closing tag,
            // adding the compiled version of each non-terminal to the children section of the object we're going to return
            // for the time being we're just going to handle 2 cases:
            // the text case, in which case we'll just push a string into the children,
            // and the element case, in which case we recurse

            //Corrosponds to the entity non-terminal in the grammar
            while(cursor.nextSibling()){
                if(cursor.name === "Text"){
                    let txt = inText.substring(cursor.from,cursor.to).trimEnd();
                    if(txt !== ""){
                        element.children.push(txt);
                    }
                } else if (cursor.name === "Element") {
                    element.children.push(compileElement(cursor.node.cursor))
                } else if (cursor.name === "CloseTag") {
                    // Will always be the matching tag (and the last tag in the list)
                    break;
                } else if (cursor.name === "Macro"){
                    //add the macro to the children, ignoring the dollar sign in the name.
                    //TODO decide if this format (a singleton object with the tag macroName) is ideal.
                    element.children.push({macroName : inText.substring(cursor.from+1,cursor.to)});
                } else if (cursor.name === "Comment") {
                    //ignore comments
                    continue;
                } else {
                    // There are a couple of other things in the entity non-terminal, but nothing of immediate importance
                    throw Error("Non text/element non-terminal not supported as child of compile Element");
                }
            }
            return element;

        } else if (cursor.name === "SelfClosingTag"){
            cursor.firstChild();
            cursor.nextSibling();

            let tagName = inText.substring(cursor.from,cursor.to);

            let attrs = [];
            while(cursor.nextSibling()){
                //All of the siblings must be Attributes, but we're checking just in case the grammar changes
                if(cursor.name != "Attribute"){
                    throw Error("Expected an Attribute in SelfClosingTag");
                }
                //Attributes always have exactly two children, an AttributeName and an Attribute Value
                //We scrape the content of both from the in string and add them to the attribute array here
                cursor.firstChild();
                let attrName = inText.substring(cursor.from,cursor.to);
                cursor.nextSibling();
                //fuddling to ignore the quotes
                let attrValue = inText.substring(cursor.from + 1,cursor.to - 1);

                cursor.parent();

                let attr = {};
                attr[attrName] = attrValue;

                attrs.push(attr);

            }

            return {contentType :  tagName, attributes : attrs, children : []};
            
        } else {
            //Unreachable case, see the grammar for why
            throw Error("Non SelfClosingTag/OpenTag in Element. How did you do that?");
        }
    }
     
    let tc = parse(inText);
    let out = [];
    if(!tc.firstChild()){
        return out; 
    }
    //TODO handle things that aren't elements here.
    // the way the parser is structured is that the first row of the tree is just going to be Elements
    // We traverse the first row, each compiled Element it all to an array, and return that
    // We create a new cursor for each element to avoid having to worry about cursor state between elements 
    // This should only create n many pointers for n elements, which is a very small amount of memory in the grand scheme here
    out.push(compileElement(tc.node.cursor))
    while(tc.nextSibling()){
        if(tc.node.name === "Element"){
            out.push(compileElement(tc.node.cursor));
        } else if (tc.node.name === "Comment") {
            continue;
        } else if (tc.node.name === "Macro") {
            //add the macro to the children, ignoring the dollar sign in the name.
            //TODO decide if this format (a singleton object with the tag macroName) is ideal.
            out.push({macroName : inText.substring(tc.node.from+1,tc.node.to)});
        } else if(tc.node.name === "Text"){
            let txt = inText.substring(tc.node.from,tc.node.to).trimEnd();
            if(txt !== ""){
                out.push(txt);
             }
        }
    }
    return out;
}

/**
 * pretty-print the tree pointed to by a tree-cursor.
 * Intended for demonstration/debugging
 * @param {treeCursor} cursor 
 * @returns {string}
 */
export function showCursor(cursor){
    return showNode(cursor.node);
}

export function showNode(node){
    let str = node.name
    if(node.firstChild != null){
        str+= "(" + showNode(node.firstChild) + ")"
    }
    if(node.nextSibling != null){
        str+= "," + showNode(node.nextSibling)
    }
    return str

}