import SectioningComponent from './abstract/SectioningComponent';

export class Section extends SectioningComponent {
  static componentType = "section";

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 1 }
    });

    return stateVariableDefinitions;
  }
}

export class Subsection extends SectioningComponent {
  static componentType = "subsection";
  static rendererType = "section";


  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 2 }
    });

    return stateVariableDefinitions;
  }

}

export class Subsubsection extends SectioningComponent {
  static componentType = "subsubsection";
  static rendererType = "section";

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 3 }
    });

    return stateVariableDefinitions;
  }

}

export class Paragraphs extends SectioningComponent {
  static componentType = "paragraphs";
  static rendererType = "section";

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 4 }
    });

    return stateVariableDefinitions;
  }

}

export class Aside extends SectioningComponent {
  static componentType = "aside";
  static rendererType = "section";

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.collapsible = {
      createComponentOfType: "boolean",
      createStateVariable: "collapsible",
      defaultValue: true,
      public: true,
      forRenderer: true,
    }
    attributes.startOpen = {
      createComponentOfType: "boolean",
      createStateVariable: "startOpen",
      defaultValue: false,
    }
    return attributes;
  }

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    delete stateVariableDefinitions.collapsible;

    stateVariableDefinitions.open.returnDependencies = () => ({
      startOpen: {
        dependencyType: "stateVariable",
        variableName: "startOpen"
      }
    })

    stateVariableDefinitions.open.definition = ({ dependencyValues }) => ({
      useEssentialOrDefaultValue: {
        open: {
          defaultValue: dependencyValues.startOpen,
          variablesToCheck: ["open"]
        }
      }
    })

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 3 }
    });

    stateVariableDefinitions.containerTag.definition = () => ({
      newValues: { containerTag: "aside" }
    });

    return stateVariableDefinitions;
  }

}

export class Problem extends SectioningComponent {
  static componentType = "problem";
  static rendererType = "section";

  static setUpVariantUnlessAttributePrimitive = "suppressAutomaticVariants";

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.aggregateScores.defaultValue = true;
    attributes.suppressAutomaticVariants = {
      createPrimitiveOfType: "boolean",
      createStateVariable: "suppressAutomaticVariants",
      defaultValue: false,
    }
    return attributes;
  }


  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    delete stateVariableDefinitions.suppressAutomaticVariants;

    stateVariableDefinitions.sectionName.definition = () => ({
      newValues: { sectionName: "Problem" }
    });

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 3 }
    });

    return stateVariableDefinitions;
  }

}

export class Exercise extends Problem {
  static componentType = "exercise";
  static rendererType = "section";

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.sectionName.definition = () => ({
      newValues: { sectionName: "Exercise" }
    });

    return stateVariableDefinitions;
  }


}


export class Example extends SectioningComponent {
  static componentType = "example";
  static rendererType = "section";

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.sectionName.definition = () => ({
      newValues: { sectionName: "Example" }
    });

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 3 }
    });

    return stateVariableDefinitions;
  }


}


export class StandinForFutureLayoutTag extends SectioningComponent {
  static componentType = "standinForFutureLayoutTag";
  static rendererType = "section";

  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.level.definition = () => ({
      newValues: { level: 3 }
    });

    stateVariableDefinitions.containerTag.definition = () => ({
      newValues: { containerTag: "aside" }
    });

    return stateVariableDefinitions
  }

}