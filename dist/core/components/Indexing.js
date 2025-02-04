import BaseComponent from './abstract/BaseComponent.js';
import TextComponent from './Text.js';

export class H extends TextComponent {
  static componentType = "h";
  static rendererType = "text";
}

export class Idx extends BaseComponent {
  static componentType = "idx";
  static rendererType = undefined;

  static returnChildGroups() {

    return [{
      group: "hs",
      componentTypes: ["h"]
    }, {
      group: "stringsTexts",
      componentTypes: ["string", "text"]
    }]

  }



  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.terms = {
      returnDependencies: () => ({
        stringTextChildren: {
          dependencyType: "child",
          childGroups: ["stringsTexts"],
          variableNames: ["value"],
        },
        hChildren: {
          dependencyType: "child",
          childGroups: ["hs"],
          variableNames: ["value"]
        }
      }),
      definition({ dependencyValues }) {
        let terms;
        if (dependencyValues.hChildren.length > 0) {
          terms = dependencyValues.hChildren.map(x => x.stateValues.value)
        } else {
          let value = "";
          for (let comp of dependencyValues.stringTextChildren) {
            value += comp.stateValues.value;
          }
          terms = [value];
        }
        return { newValues: { terms } }
      }
    }

    return stateVariableDefinitions;

  }

}
