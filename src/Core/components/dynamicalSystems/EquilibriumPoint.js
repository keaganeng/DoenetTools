import Point from '../Point';

export default class EquilibriumPoint extends Point {
  static componentType = "equilibriumPoint";
  static rendererType = "point";

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.stable = {
      createComponentOfType: "boolean",
      createStateVariable: "stable",
      defaultValue: true,
      public: true,
    };

    attributes.switchable = {
      createComponentOfType: "boolean",
      createStateVariable: "switchable",
      defaultValue: false,
      public: true,
      forRenderer: true,
    };

    return attributes;
  }


  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();


    stateVariableDefinitions.open = {
      forRenderer: true,
      returnDependencies: () => ({
        stable: {
          dependencyType: "stateVariable",
          variableName: "stable"
        }
      }),
      definition({ dependencyValues }) {
        return {
          newValues: { open: !dependencyValues.stable }
        }
      },
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [{
            setDependency: "stable",
            desiredValue: !desiredStateVariableValues.open
          }]
        }
      }

    }

    return stateVariableDefinitions;

  };

  switchPoint() {
    if (this.stateValues.switchable) {
      return this.coreFunctions.performUpdate({
        updateInstructions: [{
          updateType: "updateValue",
          componentName: this.componentName,
          stateVariable: "stable",
          value: !this.stateValues.stable,
        }],
        event: {
          verb: "interacted",
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            stable: !this.stateValues.stable
          }
        }
      });
    }

  }




}