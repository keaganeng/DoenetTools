import me from '../../_snowpack/pkg/math-expressions.js';
import { createUniqueName } from './naming.js';
import { flattenDeep } from './array.js';
import { deepClone } from './deepFunctions.js';
import readOnlyProxyHandler from '../ReadOnlyProxyHandler.js';
import { breakEmbeddedStringByCommas } from '../components/commonsugar/breakstrings.js';
import sha256 from '../../_snowpack/pkg/crypto-js/sha256.js';
import Hex from '../../_snowpack/pkg/crypto-js/enc-hex.js'
import subsets from './subset-of-reals.js';

export function scrapeOffAllDoumentRelated(serializedComponents) {

  if (serializedComponents.length === 1 && serializedComponents[0].componentType === "document") {
    serializedComponents = serializedComponents[0].children;
  }

  for (let ind = serializedComponents.length - 1; ind >= 0; ind--) {
    let component = serializedComponents[ind];

    // delete any title or meta components
    if (["title", "meta"].includes(component.componentType)) {
      let numberToDelete = 1;
      let followingComponent = serializedComponents[ind + 1];
      if (followingComponent.componentType === "string" && followingComponent.state.value.trim() === "") {
        numberToDelete = 2;
      }
      serializedComponents.splice(ind, numberToDelete);
    }
  }

  // strip off any blank strings at beginning or end
  let firstNonblankInd, lastNonblankInd;
  for (let [ind, component] of serializedComponents.entries()) {
    if (component.componentType !== "string" || component.state.value.trim() !== "") {
      if (firstNonblankInd === undefined) {
        firstNonblankInd = ind;
      }
      lastNonblankInd = ind;
    }
  }
  serializedComponents = serializedComponents.slice(firstNonblankInd, lastNonblankInd + 1);

  return serializedComponents;

}

function findNextTag(text) {
  let tagRegEx = /<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[\^'">\s]+))?)+\s*|\s*)\/?>/;
  let matchObj = tagRegEx.exec(text);
  if (matchObj === null) { return false; } //no tags so return
  let tagString = matchObj[0];
  //make tags lower case
  tagString = tagString.toLowerCase();
  let tagIndex = matchObj.index;

  //Find tagType
  let parts = tagString.split(" ");
  let tagType = parts[0].substring(1, parts[0].length - 1);
  if (parts.length > 1) {
    tagType = parts[0].substring(1, parts[0].length);
  }
  if (tagType.substring(tagType.length - 1, tagType.length) === '/') {
    tagType = tagType.substring(0, tagType.length - 1);
  }

  let tagPropsString = matchObj[1];
  tagPropsString = tagPropsString.trim();
  let tagProps = {};

  //Process Double Quoted Props
  let startPropDoubleRegEx = /\w+\s*=\s*["]/;
  matchObj = "not null";
  while (matchObj !== null) {
    matchObj = startPropDoubleRegEx.exec(tagPropsString);
    if (matchObj !== null) {
      let followingCode = tagPropsString.substring(matchObj.index + matchObj[0].length - 1, tagPropsString.length);
      let doubleQuoteRegEx = /"[^"\\]*(?:\\.[^"\\]*)*"/;
      let doubleMatchObj = doubleQuoteRegEx.exec(followingCode);
      let insideDoubleQuotes = doubleMatchObj[0].substring(1, doubleMatchObj[0].length - 1);
      let nameParts = matchObj[0].split('=');
      let propName = nameParts[0].trim();
      if (propName.substring(0, 1) === '_') {
        throw Error("The prop " + propName + " is reserved for internal use only.");
      }
      insideDoubleQuotes = insideDoubleQuotes.replace(/\\"/g, '"');
      if (propName in tagProps) {
        throw Error("Duplicate attribute " + propName + " in tag " + tagType);
      }
      tagProps[propName] = insideDoubleQuotes;
      tagPropsString = tagPropsString.substring(0, matchObj.index) +
        tagPropsString.substring(matchObj.index + matchObj[0].length +
          doubleMatchObj[0].length, tagPropsString.length);
    }
  }

  //Process Single Quoted Props
  let startPropSingleRegEx = /\w+\s*=\s*[']/;
  matchObj = "not null";
  while (matchObj !== null) {
    matchObj = startPropSingleRegEx.exec(tagPropsString);
    if (matchObj !== null) {
      let followingCode = tagPropsString.substring(matchObj.index + matchObj[0].length - 1, tagPropsString.length);
      let singleQuoteRegEx = /'[^'\\]*(?:\\.[^'\\]*)*'/;
      let singleMatchObj = singleQuoteRegEx.exec(followingCode);
      let insideSingleQuotes = singleMatchObj[0].substring(1, singleMatchObj[0].length - 1);
      let nameParts = matchObj[0].split('=');
      let propName = nameParts[0].trim();
      if (propName.substring(0, 1) === '_') {
        throw Error("The prop " + propName + " is reserved for internal use only.");
      }
      insideSingleQuotes = insideSingleQuotes.replace(/\\'/g, "'");
      if (propName in tagProps) {
        throw Error("Duplicate attribute " + propName + " in tag " + tagType);
      }
      tagProps[propName] = insideSingleQuotes;
      tagPropsString = tagPropsString.substring(0, matchObj.index) +
        tagPropsString.substring(matchObj.index + matchObj[0].length +
          singleMatchObj[0].length, tagPropsString.length);

    }
  }

  //Process Unquoted Props
  if (/\S/.test(tagPropsString)) {
    let unquotedParts = tagPropsString.split(" ");
    for (let propName of unquotedParts) {
      if (/\S/.test(propName)) {
        tagProps[propName] = true;
      }
    }
  }
  return { tagString: tagString, tagType: tagType, tagIndex: tagIndex, tagProps: tagProps };
}

export function expandDoenetMLsToFullSerializedComponents({
  contentIds, doenetMLs, callBack,
  componentInfoObjects, componentTypeLowerCaseMapping, flags, contentIdsToDoenetMLs
}) {

  let arrayOfSerializedComponents = [];
  let contentIdComponents = {};

  for (let doenetML of doenetMLs) {

    let serializedComponents = doenetMLToSerializedComponents(doenetML);

    correctComponentTypeCapitalization(serializedComponents, componentTypeLowerCaseMapping);

    createAttributesFromProps(serializedComponents, componentInfoObjects, flags);

    serializedComponents = applyMacros(serializedComponents, componentInfoObjects, flags);

    // remove blank string children after applying macros,
    // as applying macros could create additional blank string children
    removeBlankStringChildren(serializedComponents, componentInfoObjects)

    decodeXMLEntities(serializedComponents);

    applySugar({ serializedComponents, componentInfoObjects });

    arrayOfSerializedComponents.push(serializedComponents);

    let newContentComponents = findContentCopies({ serializedComponents });

    for (let contentId in newContentComponents.contentIdComponents) {
      if (contentIdComponents[contentId] === undefined) {
        contentIdComponents[contentId] = []
      }
      contentIdComponents[contentId].push(...newContentComponents.contentIdComponents[contentId])
    }
  }

  let contentIdList = Object.keys(contentIdComponents);
  if (contentIdList.length > 0) {
    // found copies with contentIds 
    // so look up those contentIds
    // convert to doenetMLs, and recurse on those doenetMLs

    let mergeContentIdNameSerializedComponentsIntoCopy = function ({
      fullSerializedComponents
    }) {

      for (let [ind, contentId] of contentIdList.entries()) {
        let serializedComponentsForContentId = fullSerializedComponents[ind];

        for (let originalCopyWithUri of contentIdComponents[contentId]) {
          if (originalCopyWithUri.children === undefined) {
            originalCopyWithUri.children = [];
          }
          originalCopyWithUri.children.push({
            componentType: "externalContent",
            children: JSON.parse(JSON.stringify(serializedComponentsForContentId)),
            attributes: { newNamespace: { primitive: true } },
            doenetAttributes: { createUniqueName: true }
          });
        }
      }


      // Note: this is the callback from the enclosing expandDoenetMLsToFullSerializedComponents
      // so we call it with the contentIds and serializedComponents from that context
      // This callBack will either be finishCoreConstruction
      // or mergeContentIdNameSerializedComponentsIntoCopy
      callBack({
        contentIds,
        fullSerializedComponents: arrayOfSerializedComponents,
        calledAsynchronously: true,
      })
    };

    let recurseToAdditionalDoenetMLs = function ({ newDoenetMLs, newContentIds, success, message }) {

      if (!success) {
        console.warn(message);
      }

      // check to see if got the contentIds requested
      for (let [ind, contentId] of contentIdList.entries()) {
        if (newContentIds[ind] && newContentIds[ind].substring(0, contentId.length) !== contentId) {
          throw Error(`Requested contentId ${contentId} but got back ${newContentIds[ind]}!`)
        }
      }

      // check to see if the doenetMLs hash to the contentIds
      let expectedN = contentIdList.length;
      for (let ind = 0; ind < expectedN; ind++) {
        let contentId = newContentIds[ind];
        if (contentId) {
          let doenetML = newDoenetMLs[ind];
          let calculatedContentId = Hex.stringify(sha256(doenetML));
          if (contentId !== calculatedContentId) {
            throw Error(`Incorrect DoenetML returned for contentId: ${contentId}`)
          }
        } else {
          // wasn't able to retrieve content
          console.warn(`Unable to retrieve content with contentId = ${contentIdList[ind]}`)
          newDoenetMLs[ind] = "";
        }
      }

      expandDoenetMLsToFullSerializedComponents({
        doenetMLs: newDoenetMLs,
        contentIds: newContentIds,
        callBack: mergeContentIdNameSerializedComponentsIntoCopy,
        componentInfoObjects, componentTypeLowerCaseMapping, flags,
        contentIdsToDoenetMLs
      });
    }

    contentIdsToDoenetMLs({
      contentIds: contentIdList,
      callBack: recurseToAdditionalDoenetMLs
    });

  } else {
    // end recursion when don't find additional refs with contentIds
    // Note: this callBack will either be this.finishCoreConstruction
    // or mergeContentIdNameSerializedComponentsIntoCopy
    callBack({
      contentIds,
      fullSerializedComponents: arrayOfSerializedComponents,
      calledAsynchronously: false,
    });
  }

}

export function doenetMLToSerializedComponents(doenetML, init = true) {
  if (doenetML === undefined) { return []; }
  if (init) {

    let startCommentIndex = doenetML.search('<!--');
    while (startCommentIndex !== -1) {
      let endCommentIndex = doenetML.search('-->');
      //if no end comment then the rest of the doenetML is commented out
      if (endCommentIndex === -1) { endCommentIndex = doenetML.length; } else { endCommentIndex = endCommentIndex + 3 }
      doenetML = doenetML.substring(0, startCommentIndex) + doenetML.substring(endCommentIndex, doenetML.length);
      startCommentIndex = doenetML.search('<!--');
    }

  }
  let json = [];

  //starting and ending index candidates
  let stringBeforeCode = "";
  let betweenTagsCode = "";
  while (doenetML.length > 0) {

    let startTag = findNextTag(doenetML);

    if (startTag === false) {
      //just text remains so return it if it has something in it
      if (doenetML.length > 0) {
        json.push({ componentType: "string", state: { value: doenetML } });
      }
      return json;
    }

    let lastCharactorInsideStartTag =
      startTag.tagString.substring(startTag.tagString.length - 2, startTag.tagString.length - 1);
    if (lastCharactorInsideStartTag === '/') {
      //empty tag
      stringBeforeCode = doenetML.substring(0, startTag.tagIndex);
      betweenTagsCode = "";
      doenetML = doenetML.substring(startTag.tagIndex + startTag.tagString.length, doenetML.length);
    } else {
      //find the matching end tag
      let numStarts = 1;
      let numEnds = 0;
      let nextTag = JSON.parse(JSON.stringify(startTag));
      let searchForNextTagBeginingAtIndex = 0;
      let afterStartCode = "";

      while (numStarts > numEnds) {
        // console.log(numStarts+" --- "+numEnds);
        searchForNextTagBeginingAtIndex = Number(searchForNextTagBeginingAtIndex) + Number(nextTag.tagString.length) + Number(nextTag.tagIndex);
        afterStartCode = doenetML.substring(searchForNextTagBeginingAtIndex, doenetML.length);
        nextTag = findNextTag(afterStartCode);
        if (nextTag === false) {
          throw Error("No matching </" + startTag.tagType + "> end tag")
        }
        if (nextTag.tagType === startTag.tagType) { numStarts++; }
        if (nextTag.tagType === "/" + startTag.tagType) { numEnds++; }
      }

      stringBeforeCode = doenetML.substring(0, startTag.tagIndex);
      let startBetweenIndex = Number(startTag.tagIndex) + Number(startTag.tagString.length);
      let endBetweenIndex = Number(searchForNextTagBeginingAtIndex) + Number(nextTag.tagIndex);
      betweenTagsCode = doenetML.substring(startBetweenIndex, endBetweenIndex);
      doenetML = doenetML.substring(Number(endBetweenIndex) + Number(nextTag.tagString.length), doenetML.length);
    }

    if (/\S/.test(stringBeforeCode)) {
      // have non-blank string before code
      json.push({ componentType: "string", state: { value: stringBeforeCode } });

    } else if (stringBeforeCode.length > 0) {
      json.push({ componentType: "string", state: { value: stringBeforeCode } });
    }


    let children = [];

    if (betweenTagsCode.length > 0) {
      children = doenetMLToSerializedComponents(betweenTagsCode, false);
    }

    json.push({ componentType: startTag.tagType, children: children, props: startTag.tagProps });

    if (!/\S/.test(doenetML)) {
      if (doenetML.length > 0) {
        json.push({ componentType: "string", state: { value: doenetML } });
      }

      if (init) {
        // if this is the initial call, strip off any blank strings
        // at beginning or end
        let firstNonblankInd, lastNonblankInd;
        for (let [ind, component] of json.entries()) {
          if (component.componentType !== "string" || component.state.value.trim() !== "") {
            if (firstNonblankInd === undefined) {
              firstNonblankInd = ind;
            }
            lastNonblankInd = ind;
          }
        }
        json = json.slice(firstNonblankInd, lastNonblankInd + 1);
      }


      return json;
    }

  }

  return json;
}

export function removeBlankStringChildren(serializedComponents, componentInfoObjects) {

  for (let component of serializedComponents) {
    if (component.children) {
      let componentClass = componentInfoObjects.allComponentClasses[component.componentType];
      if (componentClass && !componentClass.includeBlankStringChildren) {
        component.children = component.children.filter(
          x => x.componentType !== "string" || x.state.value.trim() !== ""
        )
      }

      removeBlankStringChildren(component.children, componentInfoObjects)

    }

    // TODO: do we also need to remove blank string components
    // from childrenForComponent of an attribute that is not yet a component?
    for (let attrName in component.attributes) {
      let comp = component.attributes[attrName].component;
      if (comp && comp.children) {
        removeBlankStringChildren([comp], componentInfoObjects)
      }
    }
  }

}

export function findContentCopies({ serializedComponents }) {

  let contentIdComponents = {};
  for (let serializedComponent of serializedComponents) {
    if (serializedComponent.componentType === "copy") {
      if (serializedComponent.attributes && serializedComponent.attributes.uri) {
        let uri = serializedComponent.attributes.uri.primitive;

        if (uri && uri.substring(0, 7).toLowerCase() === "doenet:") {

          let result = uri.match(/[:&]contentid=([^&]+)/i);
          if (result) {
            let contentId = result[1];
            if (contentIdComponents[contentId] === undefined) {
              contentIdComponents[contentId] = [];
            }
            contentIdComponents[contentId].push(serializedComponent);
          }

        }
      }
    } else {
      if (serializedComponent.children !== undefined) {
        let results = findContentCopies({ serializedComponents: serializedComponent.children })

        // append results on to contentIdComponents
        for (let contentId in results.contentIdComponents) {
          if (contentIdComponents[contentId] === undefined) {
            contentIdComponents[contentId] = [];
          }
          contentIdComponents[contentId].push(...results.contentIdComponents[contentId]);
        }
      }
    }
  }
  return { contentIdComponents };
}

export function addDocumentIfItsMissing(serializedComponents) {

  if (serializedComponents.length !== 1 || serializedComponents[0].componentType !== 'document') {
    let components = serializedComponents.splice(0);
    serializedComponents.push({ componentType: 'document', children: components });
  }
}

export function correctComponentTypeCapitalization(serializedComponents, componentTypeLowerCaseMapping) {

  for (let component of serializedComponents) {
    let componentTypeFixed = componentTypeLowerCaseMapping[component.componentType.toLowerCase()];

    if (componentTypeFixed) {
      component.componentType = componentTypeFixed;
    } else {
      throw Error(`Invalid component type: ${component.componentType}`);
    }

    if (component.children) {
      correctComponentTypeCapitalization(component.children, componentTypeLowerCaseMapping);
    }

  }

}


export function createAttributesFromProps(serializedComponents, componentInfoObjects, flags) {
  for (let component of serializedComponents) {

    let componentClass = componentInfoObjects.allComponentClasses[component.componentType];
    let classAttributes = componentClass.createAttributesObject({ flags });

    let attributeLowerCaseMapping = {};

    for (let propName in classAttributes) {
      attributeLowerCaseMapping[propName.toLowerCase()] = propName;
    }

    let attributes = {};

    // if there are any props of json that match attributes for component class
    // create the specified components or primitives

    let originalComponentProps = Object.assign({}, component.props)
    if (component.props) {
      for (let prop in component.props) {
        let propName = attributeLowerCaseMapping[prop.toLowerCase()]
        let attrObj = classAttributes[propName];
        if (attrObj) {

          if (propName in attributes) {
            throw Error(`Cannot repeat prop ${propName}`)
          }

          attributes[propName] = componentFromAttribute({
            attrObj,
            value: component.props[prop],
            originalComponentProps,
            componentInfoObjects,
            flags
          });
          delete component.props[prop];
        } else if (!["name", "assignnames", "tname"].includes(prop.toLowerCase())) {

          if (componentClass.acceptAnyAttribute) {
            attributes[prop] = componentFromAttribute({
              value: component.props[prop],
              originalComponentProps,
              componentInfoObjects,
              flags
            });
          } else {
            throw Error(`Invalid attribute for component of type ${component.componentType}: ${prop}`);
          }

        }
      }
    }


    // if there are any primitive attributes that define a default value
    // but were not specified via props, add them with their default value

    for (let attrName in classAttributes) {
      let attrObj = classAttributes[attrName];

      if (attrObj.createPrimitiveOfType && ("defaultPrimitiveValue" in attrObj) && !(attrName in attributes)) {
        attributes[attrName] = componentFromAttribute({
          attrObj,
          originalComponentProps,
          value: attrObj.defaultPrimitiveValue.toString(),
          componentInfoObjects,
          flags
        });
      }
    }

    component.attributes = attributes;

    //recurse on children
    if (component.children !== undefined) {
      createAttributesFromProps(component.children, componentInfoObjects, flags);
    }
  }
}

export function componentFromAttribute({ attrObj, value, originalComponentProps,
  componentInfoObjects, flags
}) {
  if (typeof value !== "object") {
    // typically this would mean value is a string.
    // However, if had an attribute with no value, would get true.
    // Also, when get stateVariablesPrescribingAdditionalAttributes,
    // it is possible their values are not strings
    value = { rawString: value.toString() }
  }

  if (attrObj && attrObj.createComponentOfType) {
    let newComponent;
    let valueTrimLower = value.rawString.trim().toLowerCase();

    if (valueTrimLower === "true" && attrObj.valueForTrue !== undefined) {
      newComponent = {
        componentType: attrObj.createComponentOfType,
        state: { value: attrObj.valueForTrue }
      };
    } else if (valueTrimLower === "false" && attrObj.valueForFalse !== undefined) {
      newComponent = {
        componentType: attrObj.createComponentOfType,
        state: { value: attrObj.valueForFalse }
      };
    } else if (componentInfoObjects.isInheritedComponentType({
      inheritedComponentType: attrObj.createComponentOfType,
      baseComponentType: "boolean",
    }) && ["true", "false"].includes(valueTrimLower)) {
      newComponent = {
        componentType: attrObj.createComponentOfType,
        state: { value: valueTrimLower === "true" }
      };
    } else {
      let children = value.childrenForComponent;
      if (children) {
        children = JSON.parse(JSON.stringify(children));
      } else {
        children = [
          { componentType: "string", state: { value: value.rawString } }
        ]
      }
      newComponent = {
        componentType: attrObj.createComponentOfType,
        children
      };
    }

    if (attrObj.attributesForCreatedComponent || attrObj.copyComponentAttributesForCreatedComponent) {
      if (attrObj.attributesForCreatedComponent) {
        newComponent.props = attrObj.attributesForCreatedComponent;
      } else {
        newComponent.props = {};
      }

      if (attrObj.copyComponentAttributesForCreatedComponent) {
        for (let attrName of attrObj.copyComponentAttributesForCreatedComponent) {
          if (originalComponentProps[attrName]) {
            newComponent.props[attrName] = JSON.parse(JSON.stringify(originalComponentProps[attrName]))
          }
        }

      }

      createAttributesFromProps([newComponent], componentInfoObjects, flags)
    }

    return { component: newComponent };
  } else if (attrObj && attrObj.createPrimitiveOfType) {
    let newPrimitive;
    if (attrObj.createPrimitiveOfType === "boolean") {
      let valueTrimLower = value.rawString.trim().toLowerCase();
      newPrimitive = valueTrimLower === "true";
    } else if (attrObj.createPrimitiveOfType === "number") {
      newPrimitive = Number(value.rawString);
    } else if (attrObj.createPrimitiveOfType === "integer") {
      newPrimitive = Math.round(Number(value.rawString));
    } else {
      // else assume string
      newPrimitive = value.rawString;
    }

    if (attrObj.validationFunction) {
      newPrimitive = attrObj.validationFunction(newPrimitive);
    }
    return { primitive: newPrimitive };
  } else {
    if (!value.childrenForComponent) {
      value.childrenForComponent = [
        { componentType: "string", state: { value: value.rawString } }
      ]
    }
    return value;
  }
}

function findPreSugarIndsAndMarkFromSugar(components) {
  let preSugarIndsFound = [];
  for (let component of components) {
    if (component.preSugarInd !== undefined) {
      preSugarIndsFound.push(component.preSugarInd)
    } else {
      if (!component.doenetAttributes) {
        component.doenetAttributes = {};
      }
      component.doenetAttributes.createdFromSugar = true;
      if (component.children) {
        let inds = findPreSugarIndsAndMarkFromSugar(component.children);
        preSugarIndsFound.push(...inds);
      }
    }
  }

  return preSugarIndsFound;
}


export function applyMacros(serializedComponents, componentInfoObjects, flags) {

  for (let component of serializedComponents) {
    if (component.children) {
      component.children = applyMacros(component.children, componentInfoObjects, flags);
    }
    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];
        if (attribute.component) {
          let comp = attribute.component;
          if (comp.children) {
            comp.children = applyMacros(comp.children, componentInfoObjects, flags);
          }
        } else if (attribute.childrenForComponent) {
          attribute.childrenForComponent = applyMacros(attribute.childrenForComponent, componentInfoObjects, flags);
        }
      }
    }
  }

  serializedComponents = substituteMacros(serializedComponents, componentInfoObjects, flags);

  return serializedComponents;

}

function substituteMacros(serializedComponents, componentInfoObjects, flags) {

  for (let componentInd = 0; componentInd < serializedComponents.length; componentInd++) {
    let component = serializedComponents[componentInd];

    if (component.componentType === "string") {

      let startInd = 0;
      while (startInd < component.state.value.length) {

        let str = component.state.value;
        let result = findFirstFullMacroInString(str.slice(startInd));

        if (!result.success) {
          break;
        }

        let firstIndMatched = result.firstIndMatched + startInd;
        let matchLength = result.matchLength;
        let nDollarSigns = result.nDollarSigns;

        let componentsFromMacro;

        if (result.additionalAttributes) {
          let newDoenetML = `<copy tname="${result.targetName}" ${result.additionalAttributes} />`;

          let newComponents = doenetMLToSerializedComponents(newDoenetML);
          createAttributesFromProps(newComponents, componentInfoObjects, flags);
          markCreatedFromMacro(newComponents);

          // recurse in case there were more macros in the additionalAttributes
          newComponents = applyMacros(newComponents, componentInfoObjects)

          componentsFromMacro = newComponents;

        } else {
          // no additional attributes, so no need to reparse

          let doenetAttributes = { tName: result.targetName, createdFromMacro: true };

          // check here if additionalAttributes is undefined
          // (even though know it is falsy)
          // so that an empty string removes the default isPlainMacro
          if (result.additionalAttributes === undefined) {
            doenetAttributes.isPlainMacro = true;
          }

          componentsFromMacro = [{
            componentType: "copy",
            doenetAttributes
          }];
        }

        let nComponentsToRemove = 1;
        let stringToAddAtEnd = str.substring(firstIndMatched + matchLength);

        if (nDollarSigns === 2) {

          let matchOpeningParens = str.slice(firstIndMatched + matchLength).match(/^\s*\(/);

          if (!matchOpeningParens) {
            // if don't match function,
            // don't replace double dollar sign macro
            startInd = firstIndMatched + 2;
            continue;
          }

          let matchLengthWithOpeningParens = matchLength + matchOpeningParens[0].length;

          // look for a closing parenthesis

          // get array of the component with the rest of this string
          // plus the rest of the components in the array
          let remainingComponents = [];
          let includeFirstInRemaining = false;

          if (str.length > firstIndMatched + matchLengthWithOpeningParens) {
            includeFirstInRemaining = true;
            remainingComponents.push({
              componentType: "string",
              state: { value: str.substring(firstIndMatched + matchLengthWithOpeningParens) }
            })
          }

          remainingComponents.push(...serializedComponents.slice(componentInd + 1));

          let evaluateResult = createEvaluateIfFindMatchedClosingParens({
            componentsFromMacro,
            remainingComponents,
            includeFirstInRemaining,
            componentInfoObjects
          })

          if (!evaluateResult.success) {
            // if couldn't create evaluate,
            // don't replace double dollar macro
            startInd = firstIndMatched + 2;
            continue;
          }

          componentsFromMacro = evaluateResult.componentsFromMacro;

          nComponentsToRemove = evaluateResult.lastComponentIndMatched + 1;
          if (!includeFirstInRemaining) {
            nComponentsToRemove++;
          }

          // leftover string already included in componentsFromMacro
          stringToAddAtEnd = "";


        }

        let replacements = [];

        // the string before the function name
        if (firstIndMatched > 0) {
          replacements.push({
            componentType: "string",
            state: { value: str.substring(0, firstIndMatched) }
          })
        }

        replacements.push(...componentsFromMacro);

        if (stringToAddAtEnd.length > 0) {
          replacements.push({
            componentType: "string",
            state: { value: stringToAddAtEnd }
          })
        }

        // splice new replacements into serializedComponents
        serializedComponents.splice(componentInd, nComponentsToRemove, ...replacements)

        if (firstIndMatched > 0) {
          // increment componentInd because we now have to skip
          // over two components 
          // (the component made from the beginning of the string 
          // as well as the component made from the macro)
          componentInd++;
        }

        // break out of loop processing string,
        // as finished current one 
        // (possibly breaking it into pieces, so will address remainder as other component)

        break;

      }
    }

    if (component.componentType === "award" && component.children) {
      let targetsAreResponses = component.attributes.targetsAreResponses;
      if (targetsAreResponses) {
        let targetNames = targetsAreResponses.primitive.split(/\s+/).filter(s => s);
        for (let tName of targetNames) {
          addResponsesToDescendantsWithTname(component.children, tName);
        }

      }

    }

  }

  return serializedComponents;

}

function addResponsesToDescendantsWithTname(components, tName) {

  for (let component of components) {
    let propsOrDAttrs = component.props;
    if (!propsOrDAttrs) {
      propsOrDAttrs = component.doenetAttributes;
    }
    if (propsOrDAttrs) {
      for (let prop in propsOrDAttrs) {
        if (prop.toLowerCase() === "tname" && propsOrDAttrs[prop] === tName) {
          if (!component.attributes) {
            component.attributes = {};
          }
          let foundIsResponse = Object.keys(component.attributes).map(x => x.toLowerCase()).includes("isresponse");
          if (!foundIsResponse) {
            component.attributes.isResponse = true;
          }
        }
      }

    }

    if (component.children) {
      addResponsesToDescendantsWithTname(component.children, tName)
    }
  }

}

function findFirstFullMacroInString(str) {

  // One or two $ follwed by either
  // - a word (starting with a letter), capturing word as third group, or
  // - an identifier in parentheses, capturing identifier as fourth group,
  //   where the closing parenthesis could be replaced by an open brace,
  //   capturing the open brace or closing parens as fifth group
  let reForBeginning = /(\$\$?)(([a-zA-Z_]\w*\b)|\(([a-zA-Z0-9_:.\/\-]+)\s*(\)|{))/;

  let offset = 0;
  let match;

  // since Safari doesn't allow a negative lookbehind to make sure
  // that match isn't preceeded by third dollar sign,
  // we instead just skip any matches that include a third dollar sign
  while (true) {
    // look for a function macro
    match = str.substring(offset).match(reForBeginning);

    if (!match) {
      return { success: false };
    }

    if (match.index === 0 || str[offset + match.index - 1] !== "$") {
      break;
    }

    // found a third dollar sign preceeding match
    // so skip this match and look for another match later in the string
    offset += match.index + match[0].length;

  }


  let firstIndMatched = match.index + offset;
  let matchLength = match[0].length;
  let nDollarSigns = match[1].length;

  if (match[3]) {
    // found word outside parans
    return {
      success: true,
      firstIndMatched,
      matchLength,
      targetName: match[3],
      nDollarSigns
    }
  }

  // found identifier in parens
  let targetName = match[4];

  if (match[5] === ")") {
    // found closing parens
    return {
      success: true,
      firstIndMatched,
      matchLength,
      targetName,
      nDollarSigns,
    }
  }

  // have opening brace rather than closing parens
  // need to find matching closing brace and parens

  let strAfterMatch = str.substring(firstIndMatched + matchLength);

  let resultForClosingBrace = findFirstUnmatchedClosingBraceParen(strAfterMatch);

  if (resultForClosingBrace.success) {
    // found matching closing brace and parens
    // return string enclosed by braces as additional attributes
    return {
      success: true,
      firstIndMatched,
      matchLength: matchLength + resultForClosingBrace.parenInd + 1,
      targetName,
      nDollarSigns,
      additionalAttributes: strAfterMatch.substring(0, resultForClosingBrace.braceInd)
    }

  } else {
    // the beginning found didn't end up matching the pattern,
    // so we ignore that match and see if there is another one in the rest of the string
    let findAnotherResult = findFirstFullMacroInString(strAfterMatch);

    if (!findAnotherResult.success) {
      // the rest of the string didn't have a match, so no match in the original string
      return { success: false }
    }

    // return match found in rest of string, with indices adjusted to be for original string
    return {
      success: true,
      firstIndMatched: firstIndMatched + matchLength + findAnotherResult.firstIndMatched,
      matchLength: findAnotherResult.matchLength,
      targetName: findAnotherResult.targetName,
      nDollarSigns: findAnotherResult.nDollarSigns,
      additionalAttributes: findAnotherResult.additionalAttributes
    }

  }

}

function findFirstUnmatchedClosingBraceParen(strAfterMatch) {
  let nBraces = 0;

  for (let ind = 0; ind < strAfterMatch.length; ind++) {
    let char = strAfterMatch[ind];
    if (char === "}") {
      if (nBraces === 0) {
        // found unmatched closing brace
        // now need next non whitespace character to be closing parenthesis

        if (strAfterMatch.substring(ind + 1).trim()[0] === ")") {
          let parenInd = strAfterMatch.substring(ind + 1).indexOf(")") + ind + 1;
          return { success: true, braceInd: ind, parenInd }
        }
        // found closing brace, but not followed by closing parens
        return { success: false }

      }
      nBraces--;
    } else if (char === "{") {
      nBraces++;
    }
  }

  return { success: false };

}

function markCreatedFromMacro(serializedComponents) {
  for (let serializedComponent of serializedComponents) {
    if (!serializedComponent.doenetAttributes) {
      serializedComponent.doenetAttributes = {};
    }
    serializedComponent.doenetAttributes.createdFromMacro = true;

    if (serializedComponent.children) {
      markCreatedFromMacro(serializedComponent.children);
    }
  }
}

function createEvaluateIfFindMatchedClosingParens({
  componentsFromMacro, remainingComponents, includeFirstInRemaining, componentInfoObjects
}) {

  let result = findFirstUnmatchedClosingParens(remainingComponents);

  if (!result.success) {
    return result;
  }
  // found unmatched closing parenthesis, so is the one
  // matching the opening parenthesis

  let lastComponentInd = result.componentInd;

  remainingComponents = remainingComponents.slice(0, lastComponentInd + 1);

  let lastComponentOfFunction = remainingComponents[lastComponentInd];

  let stringAfterFunction = "";

  // if have text after closing parenthesis
  // save in stringAfterFunction
  if (result.charInd + 1 < lastComponentOfFunction.state.value.length) {
    stringAfterFunction = lastComponentOfFunction.state.value.substring(result.charInd + 1);
  }

  // remove closing parenthesis and any subsequent text
  // from the last component
  if (result.charInd > 0) {
    lastComponentOfFunction.state.value
      = lastComponentOfFunction.state.value.substring(0, result.charInd)
  } else {
    // remove this component altogether as there is nothing left
    remainingComponents = remainingComponents.slice(0, lastComponentInd);
  }


  let breakResults = breakEmbeddedStringByCommas({ childrenList: remainingComponents });

  // recurse on pieces
  let pieces = breakResults.pieces.map(x => applyMacros(x, componentInfoObjects));

  let inputArray = pieces.map(x => {
    if (x.length === 1 && x[0].componentType !== "string") {
      return x[0]
    } else {
      return {
        componentType: "math",
        doenetAttributes: { createdFromMacro: true },
        children: x
      }
    }
  })

  let evaluateComponent = {
    componentType: "evaluate",
    doenetAttributes: { createdFromMacro: true },
    attributes: {
      function: {
        component: {
          componentType: "function",
          doenetAttributes: { createdFromMacro: true },
          children: componentsFromMacro
        }
      },
      input: {
        component: {
          componentType: "mathList",
          doenetAttributes: { createdFromMacro: true },
          children: inputArray
        }
      }
    }
  }

  let replacements = [evaluateComponent];

  // if have text after function
  // include string component at end containing that text
  if (stringAfterFunction.length > 0) {
    replacements.push({
      componentType: "string",
      state: { value: stringAfterFunction }
    })
  }

  return {
    success: true,
    componentsFromMacro: replacements,
    lastComponentIndMatched: lastComponentInd,
  }


}

function findFirstUnmatchedClosingParens(components) {

  let Nparens = 0;

  for (let [componentInd, component] of components.entries()) {
    if (component.componentType === "string") {
      let s = component.state.value;

      for (let charInd = 0; charInd < s.length; charInd++) {
        let char = s[charInd];
        if (char === "(") {
          Nparens++;
        } else if (char === ")") {
          if (Nparens === 0) {
            // parens didn't match
            return {
              success: true,
              componentInd,
              charInd
            }
          } else {
            Nparens--;
          }
        }
      }

    }
  }

  // never found a closing parenthesis that wasn't matched
  return { success: false }
}

export function decodeXMLEntities(serializedComponents) {

  function replaceEntities(s) {
    return s
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&dollar;/g, '$')
      .replace(/&amp;/g, '&');
  }

  for (let serializedComponent of serializedComponents) {
    if (serializedComponent.componentType === "string") {
      serializedComponent.state.value = replaceEntities(serializedComponent.state.value)
    } else {

      if (serializedComponent.children) {
        decodeXMLEntities(serializedComponent.children)
      }

      if (serializedComponent.attributes) {
        for (let attrName in serializedComponent.attributes) {
          let attribute = serializedComponent.attributes[attrName];

          if (attribute.component) {
            decodeXMLEntities([attribute.component])
          } else if (attribute.primitive) {
            if (typeof attribute.primitive === "string") {
              attribute.primitive = replaceEntities(attribute.primitive);
            }
          } else {
            if (attribute.childrenForComponent) {
              decodeXMLEntities(attribute.childrenForComponent);
            }
            if (attribute.rawString) {
              attribute.rawString = replaceEntities(attribute.rawString);
            }
          }
        }
      }
    }
  }
}

export function applySugar({ serializedComponents, parentParametersFromSugar = {},
  parentAttributes = {},
  componentInfoObjects,
  parentUniqueId = "",
  isAttributeComponent = false,
}) {

  for (let [componentInd, component] of serializedComponents.entries()) {
    let componentType = component.componentType;
    let componentClass = componentInfoObjects.allComponentClasses[componentType];
    if (!componentClass) {
      throw Error(`Unrecognized component type ${componentType}`)
    }
    let uniqueId = parentUniqueId + '|' + componentType + componentInd;

    let componentAttributes = {};
    // add primitive attributes to componentAttributes
    for (let attrName in component.attributes) {
      let attribute = component.attributes[attrName];
      if (attribute.primitive !== undefined) {
        componentAttributes[attrName] = attribute.primitive;
      }
    }

    componentAttributes = new Proxy(componentAttributes, readOnlyProxyHandler);

    if (component.children) {

      let newParentParametersFromSugar = {};

      if (!component.skipSugar) {

        for (let [sugarInd, sugarInstruction] of componentClass.returnSugarInstructions().entries()) {

          if (component.children.length === 0) {
            break;
          }

          let childTypes = component.children
            .map(x => x.componentType === "string" ? "s" : "n")
            .join("");

          if (sugarInstruction.childrenRegex) {
            let match = childTypes.match(sugarInstruction.childrenRegex);

            if (!match || match[0].length !== component.children.length) {
              // sugar pattern didn't match all children
              // so don't apply sugar

              continue;
            }

          }


          let matchedChildren = deepClone(component.children);

          let nNonStrings = 0;
          for (let child of matchedChildren) {
            if (child.componentType !== "string") {
              child.preSugarInd = nNonStrings;
              nNonStrings++;
            }
          }

          let createdFromMacro = false;
          if (component.doenetAttributes && component.doenetAttributes.createdFromMacro) {
            createdFromMacro = true;
          }

          let sugarResults = sugarInstruction.replacementFunction({
            matchedChildren,
            parentParametersFromSugar,
            parentAttributes,
            componentAttributes,
            uniqueId: uniqueId + '|sugar' + sugarInd,
            componentInfoObjects,
            isAttributeComponent,
            createdFromMacro
          });

          // console.log("sugarResults")
          // console.log(sugarResults)

          if (sugarResults.success) {

            let newChildren = sugarResults.newChildren;
            let newAttributes = sugarResults.newAttributes;

            let preSugarIndsFoundInChildren = [], preSugarIndsFoundInAttributes = [];

            if (newChildren) {
              preSugarIndsFoundInChildren = findPreSugarIndsAndMarkFromSugar(newChildren);
            }
            if (newAttributes) {
              for (let attrName in newAttributes) {
                let comp = newAttributes[attrName].component;
                if (comp) {
                  preSugarIndsFoundInAttributes.push(...findPreSugarIndsAndMarkFromSugar(comp.children));
                }
              }
            }

            let preSugarIndsFound = [...preSugarIndsFoundInChildren, ...preSugarIndsFoundInAttributes];

            if (preSugarIndsFound.length !== nNonStrings ||
              !preSugarIndsFound.sort((a, b) => a - b).every((v, i) => v === i)
            ) {
              throw Error(`Invalid sugar for ${componentType} as didn't return set of original components`)
            }

            if (preSugarIndsFoundInChildren.length > 0) {
              let sortedList = [...preSugarIndsFoundInChildren].sort((a, b) => a - b);
              if (!sortedList.every((v, i) => v === preSugarIndsFoundInChildren[i])) {
                throw Error(`Invalid sugar for ${componentType} as didn't return original components in order`)
              }
            }


            if (sugarResults.parametersForChildrenSugar) {
              Object.assign(newParentParametersFromSugar, sugarResults.parametersForChildrenSugar)
            }

            if (newChildren) {
              component.children = newChildren;
            } else {
              component.children = [];
            }

            if (newAttributes) {
              if (!component.attributes) {
                component.attributes = {}
              }
              Object.assign(component.attributes, newAttributes)

            }

          }

        }
      }

      // Note: don't pass in isAttributeComponent
      // as that flag should be set just for the top level attribute component

      applySugar({
        serializedComponents: component.children,
        parentParametersFromSugar: newParentParametersFromSugar,
        parentAttributes: componentAttributes,
        componentInfoObjects,
        parentUniqueId: uniqueId,
      })
    }

    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];

        if (attribute.component) {

          applySugar({
            serializedComponents: [attribute.component],
            parentAttributes: componentAttributes,
            componentInfoObjects,
            parentUniqueId: uniqueId,
            isAttributeComponent: true,
          })
        }
      }
    }
  }
}


// function lowercaseDeep(arr1) {
//   return arr1.map(val => Array.isArray(val) ? lowercaseDeep(val) : val.toLowerCase());
// }


function breakStringInPiecesBySpacesOrParens(string) {
  let Nparens = 0;
  let pieces = [];

  string = string.trim();
  let beginInd = 0;

  for (let ind = 0; ind < string.length; ind++) {
    let char = string[ind];
    if (char === "(") {
      if (Nparens === 0) {
        // beginning new parens piece
        // what have so far is a new piece
        let newPiece = string.substring(beginInd, ind).trim();
        if (newPiece.length > 0) {
          pieces.push(newPiece);
        }
        beginInd = ind;
      }

      Nparens++;
    } else if (char === ")") {
      if (Nparens === 0) {
        // parens didn't match, so return failure
        return { success: false };
      }
      if (Nparens === 1) {
        // found end of piece in parens
        let newPiece = string.substring(beginInd + 1, ind).trim();
        if (newPiece.length > 0) {
          // try to break further
          let result = breakStringInPiecesBySpacesOrParens(newPiece);
          if (result.success === true) {
            pieces.push(result.pieces);
          } else {
            pieces.push(newPiece);
          }
        }
        beginInd = ind + 1;
      }
      Nparens--
    } else if (Nparens === 0 && char.match(/\s/)) {
      // not in parens and found a space so potentially have a new piece
      let newPiece = string.substring(beginInd, ind).trim();
      if (newPiece.length > 0) {
        pieces.push(newPiece);
      }
      beginInd = ind;
    }

  }

  // parens didn't match, so return failure
  if (Nparens !== 0) {
    return { success: false };
  }

  let newPiece = string.substring(beginInd, string.length).trim();
  if (newPiece.length > 0) {
    pieces.push(newPiece);
  }

  return {
    success: true,
    pieces: pieces,
  }

}

export function createComponentNames({ serializedComponents, namespaceStack = [],
  componentInfoObjects,
  parentDoenetAttributes = {},
  parentName,
  useOriginalNames = false,
  doenetAttributesByFullTName,
  indOffset = 0,
  createNameContext = "",
}) {

  if (namespaceStack.length === 0) {
    namespaceStack.push({ namespace: '', componentCounts: {}, namesUsed: {} });
  }
  let level = namespaceStack.length - 1;

  // console.log("createComponentNames " + level);
  // console.log(serializedComponents);
  // console.log(namespaceStack);

  let currentNamespace = namespaceStack[level];

  for (let [componentInd, serializedComponent] of serializedComponents.entries()) {
    let componentType = serializedComponent.componentType;
    let componentClass = componentInfoObjects.allComponentClasses[componentType];

    let doenetAttributes = serializedComponent.doenetAttributes;
    if (doenetAttributes === undefined) {
      doenetAttributes = serializedComponent.doenetAttributes = {};
    }

    let attributes = serializedComponent.attributes;
    if (!attributes) {
      attributes = serializedComponent.attributes = {};
    }


    let prescribedName = doenetAttributes.prescribedName;
    let assignNames = doenetAttributes.assignNames;
    let tName = doenetAttributes.tName;
    // let propName = doenetAttributes.propName;
    // let type = doenetAttributes.type;
    // let alias = doenetAttributes.alias;
    // let indexAlias = doenetAttributes.indexAlias;

    let mustCreateUniqueName =
      componentType === "string"
      || doenetAttributes.isAttributeChild
      || doenetAttributes.createdFromSugar
      || doenetAttributes.createdFromMacro
      || doenetAttributes.createUniqueName;


    let newNamespace;
    if (attributes.newNamespace && attributes.newNamespace.primitive ||
      (useOriginalNames && serializedComponent.originalAttributes
        && serializedComponent.originalAttributes.newNamespace)
    ) {
      newNamespace = true;
    }

    let prescribedNameFromDoenetAttributes = prescribedName !== undefined;

    let props = serializedComponent.props;
    if (props === undefined) {
      props = serializedComponent.props = {};
    } else {
      // look for a attribute that matches an prop
      // but case insensitive
      for (let key in props) {
        let lowercaseKey = key.toLowerCase();
        if (lowercaseKey === "name") {
          if (prescribedName === undefined) {
            prescribedName = props[key];
            delete props[key];
          } else {
            throw Error("Cannot define name twice for a component");
          }
        } else if (lowercaseKey === "assignnames") {
          if (assignNames === undefined) {
            let result = breakStringInPiecesBySpacesOrParens(props[key]);
            if (result.success) {
              assignNames = result.pieces;
            } else {
              throw Error("Invalid format for assignnames");
            }
            delete props[key];
          } else {
            throw Error("Cannot define assignNames twice for a component");
          }
        } else if (lowercaseKey === "tname") {
          if (tName === undefined) {
            tName = props[key];
            delete props[key];
          } else {
            throw Error("Cannot define tName twice for a component");
          }
        }
      }
    }


    if (prescribedName) {

      if (!prescribedNameFromDoenetAttributes && !doenetAttributes.createdFromSugar) {

        if (!(/[a-zA-Z]/.test(prescribedName.substring(0, 1)))) {
          throw Error(`Invalid component name: ${prescribedName}.  Component name must begin with a letter`);
        }
        if (!(/^[a-zA-Z0-9_\-]+$/.test(prescribedName))) {
          throw Error(`Invalid component name: ${prescribedName}.  Component name can contain only letters, numbers, hyphens, and underscores`);
        }
      }

      // name was specified
      // put it into doenetAttributes
      doenetAttributes.prescribedName = prescribedName;

    } else if (mustCreateUniqueName) {
      let longNameId = parentName + "|createUniqueName|";

      if (serializedComponent.downstreamDependencies) {
        longNameId += JSON.stringify(serializedComponent.downstreamDependencies);
      } else {
        longNameId += componentInd + "|" + indOffset + "|" + createNameContext;
      }

      prescribedName = createUniqueName(componentType.toLowerCase(), longNameId);
    }

    if (!assignNames && useOriginalNames
      && serializedComponent.originalDoenetAttributes
      && serializedComponent.originalDoenetAttributes.assignNames
    ) {
      assignNames = serializedComponent.originalDoenetAttributes.assignNames;
    }

    if (assignNames) {

      let assignNamesToReplacements = componentClass.assignNamesToReplacements;
      if (!assignNamesToReplacements) {
        throw Error("Cannot assign names for component type " + serializedComponent.componentType);
      }

      // assignNames was specified
      // put in doenetAttributes as assignNames array
      doenetAttributes.assignNames = assignNames;

      if (!doenetAttributes.createUniqueAssignNames) {
        let flattedNames = flattenDeep(assignNames);
        for (let name of flattedNames) {
          if (!(/[a-zA-Z]/.test(name.substring(0, 1)))) {
            throw Error("All assigned names must begin with a letter");
          }
          if (!(/^[a-zA-Z0-9_\-]+$/.test(name))) {
            throw Error("Assigned names can contain only letters, numbers, hyphens, and underscores");
          }
        }
        // check if unique names
        if (flattedNames.length !== new Set(flattedNames).size) {
          throw Error("Duplicate assigned names");
        }
      }
    }


    if (newNamespace) {
      // newNamespace was specified
      // put in attributes as boolean
      attributes.newNamespace = { primitive: newNamespace };
    }


    let count = currentNamespace.componentCounts[componentType];
    if (count === undefined) {
      count = 0;
    }

    // if created from a attribute/sugar/macro, don't include in component counts
    if (!(doenetAttributes.isAttributeChild || doenetAttributes.createdFromSugar
      || doenetAttributes.createdFromMacro
    )) {
      currentNamespace.componentCounts[componentType] = ++count;
    }

    let componentName = '';
    for (let l = 0; l <= level; l++) {
      componentName += namespaceStack[l].namespace + '/';
    }
    if (!prescribedName) {
      if (useOriginalNames) {

        if (serializedComponent.originalName) {
          let lastInd = serializedComponent.originalName.lastIndexOf("/");
          prescribedName = serializedComponent.originalName.substring(lastInd + 1);
          // } else if (serializedComponent.componentName) {
          //   let lastInd = serializedComponent.componentName.lastIndexOf("/");
          //   prescribedName = serializedComponent.componentName.substring(lastInd + 1);
        }
      }
      if (!prescribedName) {
        prescribedName = '_' + componentType.toLowerCase() + count;
      }
    }

    componentName += prescribedName;

    serializedComponent.componentName = componentName;
    if (prescribedName) {
      if (prescribedName in currentNamespace.namesUsed) {
        throw Error("Duplicate component name " + componentName)
      }
      currentNamespace.namesUsed[prescribedName] = true;
    }

    // if newNamespace is false,
    // then register assignNames as belonging to current namespace
    if (!newNamespace) {
      if (assignNames) {
        for (let name of flattenDeep(assignNames)) {
          if (name in currentNamespace.namesUsed) {
            throw Error(`Duplicate component name (from assignNames of ${componentName}): ${name}`)
          }
          currentNamespace.namesUsed[name] = true;
        }
      }
    }


    if (serializedComponent.doenetAttributes.createUniqueAssignNames &&
      serializedComponent.originalName
    ) {

      let originalAssignNames = serializedComponent.doenetAttributes.assignNames;
      if (!originalAssignNames) {
        originalAssignNames = serializedComponent.doenetAttributes.originalAssignNames;
      }

      let longNameIdBase = componentName + "|createUniqueName|assignNames|";

      let namespace = '';
      let oldNamespace;
      if (!newNamespace) {
        for (let l = 0; l <= level; l++) {
          namespace += namespaceStack[l].namespace + '/';
        }
        let lastInd = serializedComponent.originalName.lastIndexOf("/");
        oldNamespace = serializedComponent.originalName.slice(0, lastInd + 1)
      } else {
        namespace = componentName + '/';
        oldNamespace = serializedComponent.originalName + '/';
      }

      let newAssignNames = createNewAssignNamesAndRenameMatchingTNames({
        originalAssignNames, longNameIdBase,
        namespace, oldNamespace, doenetAttributesByFullTName
      });

      assignNames = serializedComponent.doenetAttributes.assignNames = newAssignNames;

    }

    renameMatchingTNames(serializedComponent, doenetAttributesByFullTName);

    if (tName) {
      if (!componentClass.acceptTname) {
        throw Error(`Component type ${componentType} does not accept a tname attribute`);
      }

      // convert tname to full name
      doenetAttributes.tName = tName;

      doenetAttributes.fullTName = convertComponentTarget({
        tName,
        oldFullTName: doenetAttributes.fullTName,
        namespaceStack,
        acceptDoubleUnderscore: doenetAttributes.createdFromSugar
      });

    }


    if (serializedComponent.children) {


      // recurse on child, creating new namespace if specified

      if (!newNamespace) {
        createComponentNames({
          serializedComponents: serializedComponent.children,
          namespaceStack,
          componentInfoObjects,
          parentDoenetAttributes: doenetAttributes,
          parentName: componentName,
          useOriginalNames,
          doenetAttributesByFullTName,
        });
      } else {


        // if newNamespace, then need to make sure that assigned names
        // don't conflict with new names added,
        // so include in namesused
        let namesUsed = {};
        if (assignNames) {
          flattenDeep(assignNames).forEach(x => namesUsed[x] = true);
        }

        let newNamespaceInfo = { namespace: prescribedName, componentCounts: {}, namesUsed };
        namespaceStack.push(newNamespaceInfo);
        createComponentNames({
          serializedComponents: serializedComponent.children,
          namespaceStack,
          componentInfoObjects,
          parentDoenetAttributes: doenetAttributes,
          parentName: componentName,
          useOriginalNames,
          doenetAttributesByFullTName,
        });
        namespaceStack.pop();
      }
    }

    if (serializedComponent.attributes) {

      // recurse on attributes that are components

      for (let attrName in serializedComponent.attributes) {

        let attribute = serializedComponent.attributes[attrName];

        if (attribute.component) {

          let comp = attribute.component;

          if (!comp.doenetAttributes) {
            comp.doenetAttributes = {};
          }

          comp.doenetAttributes.isAttributeChild = true;

          createComponentNames({
            serializedComponents: [comp],
            namespaceStack,
            componentInfoObjects,
            parentDoenetAttributes: doenetAttributes,
            parentName: componentName,
            useOriginalNames,
            doenetAttributesByFullTName,
            createNameContext: attrName
          });

        } else if (attribute.childrenForComponent) {

          // TODO: what to do about parentName/parentDoenetAttributes
          // since parent of these isn't created
          // Note: the main (only?) to recurse here is to rename tNames
          createComponentNames({
            serializedComponents: attribute.childrenForComponent,
            namespaceStack,
            componentInfoObjects,
            parentDoenetAttributes: doenetAttributes,
            parentName: componentName,
            useOriginalNames,
            doenetAttributesByFullTName,
            createNameContext: attrName
          });
        }

      }
    }

    // TODO: is there any reason to run createComponentNames on attribute components?

  }

  return serializedComponents;

}


function createNewAssignNamesAndRenameMatchingTNames({
  originalAssignNames, longNameIdBase,
  namespace, oldNamespace, doenetAttributesByFullTName
}) {

  let assignNames = [];

  for (let [ind, originalName] of originalAssignNames.entries()) {

    if (Array.isArray(originalName)) {
      // recurse to next level
      let assignNamesSub = createNewAssignNamesAndRenameMatchingTNames({
        originalAssignNames: originalName,
        longNameIdBase: longNameIdBase + ind + "_",
        namespace, oldNamespace, doenetAttributesByFullTName
      })
      assignNames.push(assignNamesSub);
    } else {

      let longNameId = longNameIdBase + ind;
      let newName = createUniqueName("fromAssignNames", longNameId);
      assignNames.push(newName);

      let infoForRenaming = {
        componentName: namespace + newName,
        originalName: oldNamespace + originalName
      };

      renameMatchingTNames(infoForRenaming, doenetAttributesByFullTName, true);
    }

  }

  return assignNames;

}

export function convertComponentTarget({
  tName,
  oldFullTName,
  namespaceStack,
  acceptDoubleUnderscore,
}) {


  if (!oldFullTName && /__/.test(tName) && !acceptDoubleUnderscore) {
    throw Error("Invalid reference target: " + tName);

  }

  let target = tName;

  let fullTName;

  // console.log(`target: ${target}`)
  // console.log(JSON.parse(JSON.stringify(namespaceStack)))

  if (target.substring(0, 1) === '/') {
    // if starts with /, then don't add anything to path
    fullTName = target;
  } else {

    // calculate full target from target
    // putting it into the context of the current namespace

    let lastLevel = namespaceStack.length - 1;

    while (target.substring(0, 3) === '../') {
      // take off one level for every ../
      target = target.substring(3);
      lastLevel--;
    }

    if (lastLevel < 0) {
      // the target cannot possibly be valid
      // if there were more ../s than namespace levels
      lastLevel = 0;
    }

    fullTName = '';
    for (let l = 0; l <= lastLevel; l++) {
      fullTName += namespaceStack[l].namespace + '/';
    }
    fullTName += target;

  }

  return fullTName;

}

export function serializedComponentsReplacer(key, value) {
  if (value !== value) {
    return { objectType: 'special-numeric', stringValue: 'NaN' };
  } else if (value === Infinity) {
    return { objectType: 'special-numeric', stringValue: 'Infinity' };
  } else if (value === -Infinity) {
    return { objectType: 'special-numeric', stringValue: '-Infinity' };
  }
  return value;
}

let nanInfinityReviver = function (key, value) {

  if (value && value.objectType === "special-numeric") {
    if (value.stringValue === "NaN") {
      return NaN;
    } else if (value.stringValue === "Infinity") {
      return Infinity;
    } else if (value.stringValue === "-Infinity") {
      return -Infinity;
    }
  }

  return value;
}

export function serializedComponentsReviver(key, value) {
  return me.reviver(key, subsets.Subset.reviver(key, nanInfinityReviver(key, value)))
}

export function gatherVariantComponents({ serializedComponents, componentInfoObjects }) {

  // a list of lists of variantComponents
  // where each component is a list of variantComponents 
  // of corresponding serializedComponent
  let variantComponents = [];

  for (let serializedComponent of serializedComponents) {
    let componentType = serializedComponent.componentType;

    if (componentType in componentInfoObjects.componentTypesCreatingVariants) {
      serializedComponent.variants = {
        isVariantComponent: true
      }
      variantComponents.push(serializedComponent);
      continue;
    }


    if (!serializedComponent.children) {
      continue;
    }

    // check if have a variant control child, which means this component
    // is a variant component
    if (serializedComponent.children.some(x => x.componentType === "variantControl")) {
      serializedComponent.variants = {
        isVariantComponent: true
      }
      variantComponents.push(serializedComponent);
      continue;
    }
    // if class has have setUpVariantUnlessAttributePrimitive
    // component doesn't have the attribute set to true
    // is a variant component
    if (componentInfoObjects.allComponentClasses[serializedComponent.componentType]
      .setUpVariantUnlessAttributePrimitive) {
      let attribute = componentInfoObjects.allComponentClasses[serializedComponent.componentType]
        .setUpVariantUnlessAttributePrimitive;

      if (!(serializedComponent.attributes && serializedComponent.attributes[attribute]
        && serializedComponent.attributes[attribute].primitive)) {
        serializedComponent.variants = {
          isVariantComponent: true
        }
        variantComponents.push(serializedComponent);
        continue;
      }

    }

    // recurse on children

    let descendantVariantComponents = gatherVariantComponents({
      serializedComponents: serializedComponent.children,
      componentInfoObjects,
    });

    if (descendantVariantComponents.length > 0) {

      serializedComponent.variants = {
        descendantVariantComponents: descendantVariantComponents
      }

      variantComponents.push(...descendantVariantComponents)

      // // if have a variant control child
      // // check if it specifies remove duplicates
      // // if so, then attempt determine number of variants available
      // if (variantControlChild !== undefined) {
      //   let uniqueVariants = false;
      //   if (variantControlChild.state !== undefined &&
      //     variantControlChild.state.uniqueVariants !== undefined) {
      //     uniqueVariants = variantControlChild.state.uniqueVariants;
      //   }
      //   if (variantControlChild.attributes &&
      //     variantControlChild.attributes.uniqueVariants !== undefined
      //   ) {
      //     let uniqueVariantsComp = variantControlChild.attributes.uniqueVariants;

      //     if (uniqueVariantsComp.state !== undefined) {
      //       if (uniqueVariantsComp.state.value !== undefined) {
      //         uniqueVariants = uniqueVariantsComp.state.value;
      //       }
      //     }
      //     if (uniqueVariantsComp.children !== undefined) {
      //       for (let grandchild of uniqueVariantsComp.children) {
      //         if (grandchild.componentType === "string") {
      //           uniqueVariants = grandchild.state.value;
      //           break;
      //         }
      //       }
      //     }
      //   }
      //   if (typeof uniqueVariants === "string") {
      //     if (uniqueVariants.trim().toLowerCase() === "true") {
      //       uniqueVariants = true;
      //     } else {
      //       uniqueVariants = false;
      //     }
      //   }

      //   if (uniqueVariants) {
      //     serializedComponent.variants.uniqueVariants = true;
      //     determineNumVariants({ serializedComponent, allComponentClasses });
      //   }
      // }
    }
  }

  return variantComponents;
}

export function determineNumVariants({ serializedComponent, allComponentClasses }) {
  let childVariantProduct = 1;
  if (serializedComponent.children !== undefined) {
    for (let child of serializedComponent.children) {
      if (child.variants !== undefined) {
        if (child.variants.isVariantComponent ||
          child.variants.descendantVariantComponents !== undefined) {
          let result = determineNumVariants({ serializedComponent: child, allComponentClasses });
          if (!result.success) {
            return { success: false }
          }
          childVariantProduct *= result.numberOfVariants;
        }
      }
    }
  }
  let numberOfVariants;

  if (serializedComponent.variants === undefined) {
    serializedComponent.variants = {};
  }

  let compClass = allComponentClasses[serializedComponent.componentType];
  if (compClass.determineNumberOfUniqueVariants !== undefined) {

    let result = compClass.determineNumberOfUniqueVariants({
      serializedComponent: serializedComponent,
    })
    if (!result.success) {
      return { success: false }
    }
    numberOfVariants = result.numberOfVariants;
    serializedComponent.variants.uniqueVariantData = result.uniqueVariantData;
  }
  if (numberOfVariants === undefined) {
    numberOfVariants = childVariantProduct;
    // serializedComponent.variants.uniqueVariantData = {
    //   numberOfVariantsByChild: numberOfVariantsByChild,
    // }
  }

  serializedComponent.variants.numberOfVariants = numberOfVariants;
  // console.log("For " + serializedComponent.componentType +
  //   " numberOfVariants is " + numberOfVariants)
  return { success: true, numberOfVariants: numberOfVariants }

}


export function processAssignNames({
  assignNames = [],
  serializedComponents,
  parentName,
  parentCreatesNewNamespace,
  componentInfoObjects,
  indOffset = 0,
  originalNamesAreConsistent = false,
}) {


  // console.log(`process assign names`)
  // console.log(deepClone(serializedComponents));
  // console.log(`originalNamesAreConsistent: ${originalNamesAreConsistent}`)

  let nComponents = serializedComponents.length;

  // normalize form so all names are originalNames,
  // independent of whether the components originated from a copy
  // or directly from a serialized state that was already given names
  moveComponentNamesToOriginalNames(serializedComponents);

  let doenetAttributesByFullTName = {};

  let originalNamespace = null;

  if (originalNamesAreConsistent) {

    // need to use a component for original name, as parentName is the new name
    if (nComponents > 0 && serializedComponents[0].originalName) {
      let lastSlash = serializedComponents[0].originalName.lastIndexOf('/');
      originalNamespace = serializedComponents[0].originalName.substring(0, lastSlash);
    }

    if (originalNamespace !== null) {
      for (let component of serializedComponents) {
        setTNamesOutsideNamespaceToAbsoluteAndRecordAllFullTNames({
          namespace: originalNamespace,
          components: [component],
          doenetAttributesByFullTName
        });
      }
    }
  } else {
    for (let ind = 0; ind < nComponents; ind++) {

      let component = serializedComponents[ind];

      originalNamespace = null;
      // need to use a component for original name, as parentName is the new name
      if (nComponents > 0 && component.originalName) {
        let lastSlash = component.originalName.lastIndexOf('/');
        originalNamespace = component.originalName.substring(0, lastSlash);
      }

      if (originalNamespace !== null) {
        setTNamesOutsideNamespaceToAbsoluteAndRecordAllFullTNames({
          namespace: originalNamespace,
          components: [component],
          doenetAttributesByFullTName
        });
      }

    }
  }


  let processedComponents = [];

  // don't name strings
  let numStrings = 0;

  for (let ind = 0; ind < nComponents; ind++) {

    let indForNames = ind + indOffset;

    let component = serializedComponents[ind];

    if (component.componentType === "string") {
      numStrings++;
      processedComponents.push(component);
      continue;
    }

    let name = assignNames[indForNames - numStrings];


    if (!component.doenetAttributes) {
      component.doenetAttributes = {};
    }

    if (!originalNamesAreConsistent) {
      // doenetAttributesByFullTName = {};

      originalNamespace = null;
      // need to use a component for original name, as parentName is the new name
      if (nComponents > 0 && component.originalName) {
        let lastSlash = component.originalName.lastIndexOf('/');
        originalNamespace = component.originalName.substring(0, lastSlash);
      }

    }

    if (componentInfoObjects.allComponentClasses[
      component.componentType].assignNamesSkipOver
    ) {
      name = [name];
    } else if (component.attributes && component.attributes.assignNamesSkip) {
      let numberToSkip = component.attributes.assignNamesSkip.primitive;
      if (numberToSkip > 0) {
        for (let i = 0; i < numberToSkip; i++) {
          name = [name];
        }
      }
    }

    if (Array.isArray(name)) {

      if (componentInfoObjects.allComponentClasses[
        component.componentType].assignNamesToReplacements
      ) {

        // give component itself an unreachable name
        let longNameId = parentName + "|assignName|" + indForNames.toString();
        component.doenetAttributes.prescribedName = createUniqueName(component.componentType.toLowerCase(), longNameId);

        let componentName = parentName;
        if (!parentCreatesNewNamespace) {
          let lastSlash = parentName.lastIndexOf("/");
          componentName = parentName.substring(0, lastSlash);
        }
        componentName += "/" + component.doenetAttributes.prescribedName;
        component.componentName = componentName;

        component.doenetAttributes.assignNames = name;

        processedComponents.push(component);
        continue;

      } else {

        // TODO: what to do when try to assign names recursively to non-composite?
        console.warn(`Cannot assign names recursively to ${component.componentType}`)
        name = null;

      }

    }


    if (!name) {
      if (originalNamesAreConsistent && component.originalName) {
        name = component.originalName.slice(originalNamespace.length + 1);
      } else {
        let longNameId = parentName + "|assignName|" + (indForNames).toString();
        name = createUniqueName(component.componentType.toLowerCase(), longNameId);
      }
    }


    component.doenetAttributes.prescribedName = name;
    // delete component.originalName;

    // even if original names are consistent, we still use component's original assignNames
    // (we wouldn't use assignNames of the component's children as they should have unique names)
    if (originalNamesAreConsistent && !component.doenetAttributes.assignNames
      && component.originalDoenetAttributes
      && component.originalDoenetAttributes.assignNames
    ) {
      component.doenetAttributes.assignNames = component.originalDoenetAttributes.assignNames;
    }

    createComponentNamesFromParentName({
      parentName,
      ind: indForNames,
      component,
      parentCreatesNewNamespace, componentInfoObjects,
      doenetAttributesByFullTName,
      originalNamesAreConsistent,
    });

    processedComponents.push(component);

  }


  return {
    serializedComponents: processedComponents,
  };

}

export function createComponentNamesFromParentName({
  parentName, component,
  ind,
  parentCreatesNewNamespace, componentInfoObjects,
  doenetAttributesByFullTName,
  originalNamesAreConsistent,
}) {


  let namespacePieces = parentName.split('/');

  if (!parentCreatesNewNamespace) {
    namespacePieces.pop();
  }

  let namespaceStack = namespacePieces.map(x => ({
    namespace: x,
    componentCounts: {},
    namesUsed: {}
  }));

  if (!(parentName[0] === '/')) {
    // if componentName doesn't begin with a /
    // still add a namespace for the root namespace at the beginning
    namespaceStack.splice(0, 0, {
      componentCounts: {},
      namesUsed: {},
      namespace: ""
    });
  }

  if (!component.doenetAttributes) {
    component.doenetAttributes = {};
  }
  if (!component.attributes) {
    component.attributes = {};
  }

  // let originalNamespaceForComponentChildren = parentName;
  // if (!parentCreatesNewNamespace) {
  //   let lastSlash = parentName.lastIndexOf("/");
  //   namespaceForComponent = parentName.substring(0, lastSlash);
  // }


  let useOriginalNames;
  if (component.attributes.newNamespace && component.attributes.newNamespace.primitive
    || originalNamesAreConsistent
  ) {
    useOriginalNames = true;
  } else {
    useOriginalNames = false;

    if (component.children) {
      markToCreateAllUniqueNames(component.children)
    }
  }

  // always mark component attributes to create unique names
  for (let attrName in component.attributes) {
    let attribute = component.attributes[attrName];
    if (attribute.component) {
      markToCreateAllUniqueNames([attribute.component]);
    } else if (attribute.childrenForComponent) {
      markToCreateAllUniqueNames(attribute.childrenForComponent);
    }
  }


  // console.log(`before create componentName`)
  // console.log(deepClone(component))
  // console.log(useOriginalNames);
  // console.log(component.attributes.newNamespace);

  createComponentNames({
    serializedComponents: [component],
    namespaceStack,
    componentInfoObjects,
    parentName,
    useOriginalNames,
    doenetAttributesByFullTName,
    indOffset: ind,
  });

  // console.log(`result of create componentName`)
  // console.log(deepClone(component))

}


function setTNamesOutsideNamespaceToAbsoluteAndRecordAllFullTNames({ namespace, components, doenetAttributesByFullTName }) {

  let namespaceLength = namespace.length;
  for (let component of components) {
    if (component.doenetAttributes && component.doenetAttributes.tName) {
      let fullTName = component.doenetAttributes.fullTName;
      if (fullTName !== undefined) {
        if (fullTName.substring(0, namespaceLength) !== namespace) {
          component.doenetAttributes.tName = fullTName;
        }
        if (!doenetAttributesByFullTName[fullTName]) {
          doenetAttributesByFullTName[fullTName] = [];
        }
        doenetAttributesByFullTName[fullTName].push(component.doenetAttributes);
      }
    }

    if (component.children) {
      setTNamesOutsideNamespaceToAbsoluteAndRecordAllFullTNames({ namespace, components: component.children, doenetAttributesByFullTName })
    }
    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];
        if (attribute.component) {
          setTNamesOutsideNamespaceToAbsoluteAndRecordAllFullTNames({ namespace, components: [attribute.component], doenetAttributesByFullTName })
        } else if (attribute.childrenForComponent) {
          setTNamesOutsideNamespaceToAbsoluteAndRecordAllFullTNames({ namespace, components: attribute.childrenForComponent, doenetAttributesByFullTName })
        }
      }
    }
  }
}

function renameMatchingTNames(component, doenetAttributesByFullTName, renameMatchingNamespaces = false) {

  if (component.originalName &&
    doenetAttributesByFullTName

    && component.componentName !== component.originalName) {
    // we have a component who has been named and there are other components
    // whose fullTName refers to this component
    // Modify the tName and fullTName of the other components to refer to the new name
    // (Must modify fullTName as we don't know if this component has been processed yet)
    if (doenetAttributesByFullTName[component.originalName]) {
      for (let dAttributes of doenetAttributesByFullTName[component.originalName]) {
        dAttributes.tName = component.componentName;
        dAttributes.fullTName = component.componentName;
      }
    }
    if (renameMatchingNamespaces) {
      let originalNamespace = component.originalName + "/";
      let nSpaceLen = originalNamespace.length;
      for (let originalFullTName in doenetAttributesByFullTName) {
        if (originalFullTName.substring(0, nSpaceLen) === originalNamespace) {
          let originalEnding = originalFullTName.substring(nSpaceLen);
          for (let dAttributes of doenetAttributesByFullTName[originalFullTName]) {
            dAttributes.tName = component.componentName + "/" + originalEnding;
            dAttributes.fullTName = component.componentName + "/" + originalEnding;
          }
        }
      }
    }
  }
}


function moveComponentNamesToOriginalNames(components) {
  for (let component of components) {
    if (component.componentName) {
      component.originalName = component.componentName;
      delete component.componentName;
    }
    if (component.children) {
      moveComponentNamesToOriginalNames(component.children);
    }
    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];
        if (attribute.component) {
          moveComponentNamesToOriginalNames([attribute.component]);
        } else if (attribute.childrenForComponent) {
          moveComponentNamesToOriginalNames(attribute.childrenForComponent);
        }
      }
    }
  }
}

function markToCreateAllUniqueNames(components) {
  for (let component of components) {
    if (!component.doenetAttributes) {
      component.doenetAttributes = {};
    }
    component.doenetAttributes.createUniqueName = true;
    if (component.doenetAttributes.assignNames) {
      component.doenetAttributes.createUniqueAssignNames = true;
      component.doenetAttributes.originalAssignNames = component.doenetAttributes.assignNames;
      delete component.doenetAttributes.assignNames;
    } else if (component.originalDoenetAttributes && component.originalDoenetAttributes.assignNames) {
      component.doenetAttributes.createUniqueAssignNames = true;
      component.doenetAttributes.originalAssignNames = component.originalDoenetAttributes.assignNames;
    }
    delete component.doenetAttributes.prescribedName;
    if (component.children) {
      markToCreateAllUniqueNames(component.children);
    }
    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];
        if (attribute.component) {
          markToCreateAllUniqueNames([attribute.component]);
        } else if (attribute.childrenForComponent) {
          markToCreateAllUniqueNames(attribute.childrenForComponent);
        }
      }
    }
  }
}

export function setTNamesToAbsolute(components) {

  for (let component of components) {
    if (component.doenetAttributes && component.doenetAttributes.tName) {
      let fullTName = component.doenetAttributes.fullTName;
      if (fullTName !== undefined) {
        component.doenetAttributes.tName = fullTName;
      }
    }

    if (component.children) {
      setTNamesToAbsolute(component.children)
    }
    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];
        if (attribute.component) {
          setTNamesToAbsolute([attribute.component])
        } else if (attribute.childrenForComponent) {
          setTNamesToAbsolute(attribute.childrenForComponent)
        }
      }
    }
  }
}


export function restrictTNamesToNamespace({ components, namespace, parentNamespace, parentIsCopy = false }) {

  if (parentNamespace === undefined) {
    parentNamespace = namespace;
  }

  let nSpace = namespace.length;

  for (let component of components) {

    if (component.doenetAttributes && component.doenetAttributes.tName) {
      let tName = component.doenetAttributes.tName;

      if (tName[0] === "/") {
        if (tName.substring(0, nSpace) !== namespace) {
          let fullTName = namespace + tName.substring(1);
          component.doenetAttributes.tName = fullTName;
          component.doenetAttributes.fullTName = fullTName;
        }
      } else if (tName.substring(0, 3) === "../") {
        let tNamePart = tName;
        let namespacePart = parentNamespace;
        while (tNamePart.substring(0, 3) === "../") {
          tNamePart = tNamePart.substring(3);
          let lastSlash = namespacePart.substring(0, namespacePart.length - 1).lastIndexOf("/");
          namespacePart = namespacePart.substring(0, lastSlash + 1);
          if (namespacePart.substring(0, nSpace) !== namespace) {
            while (tNamePart.substring(0, 3) === "../") {
              tNamePart = tNamePart.substring(3);
            }

            let fullTName = namespace + tNamePart;
            component.doenetAttributes.tName = fullTName;
            component.doenetAttributes.fullTName = fullTName;
            break;
          }
        }


      }
    }

    if (component.children) {
      let adjustedNamespace = namespace;
      if (parentIsCopy && component.componentType === "externalContent") {
        // if have a external content inside a copy,
        // then restrict children to the namespace of the externalContent
        adjustedNamespace = component.componentName + "/";
      }
      let namespaceForChildren = parentNamespace;
      if (component.attributes.newNamespace && component.attributes.newNamespace.primitive) {
        namespaceForChildren = component.componentName;
      }
      restrictTNamesToNamespace({
        components: component.children,
        namespace: adjustedNamespace,
        parentNamespace: namespaceForChildren,
        parentIsCopy: component.componentType === "copy"
      })
    }
    if (component.attributes) {
      for (let attrName in component.attributes) {
        let attribute = component.attributes[attrName];
        if (attribute.component) {
          restrictTNamesToNamespace({
            components: [attribute.component], namespace, parentNamespace
          })
        } else if (attribute.childrenForComponent) {
          restrictTNamesToNamespace({
            components: attribute.childrenForComponent, namespace, parentNamespace
          })
        }
      }
    }
  }
}
