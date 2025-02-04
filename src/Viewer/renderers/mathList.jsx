import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class MathList extends DoenetRenderer {

  componentDidMount() {
    if (window.MathJax) {
      window.MathJax.Hub.Config({ showProcessingMessages: false, "fast-preview": { disabled: true } });
      window.MathJax.Hub.processSectionDelay = 0;
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, "#" + this.componentName]);
    }
  }

  componentDidUpdate() {
    if (window.MathJax) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, "#" + this.componentName]);
    }
  }

  render() {

    if (this.doenetSvData.hidden) {
      return null;
    }

    let children = this.children;

    if (this.doenetSvData.nChildrenToDisplay !== undefined) {
      children = children.slice(0, this.doenetSvData.nChildrenToDisplay);
    }

    if (children.length === 0 && this.doenetSvData.latex) {
      return <React.Fragment key={this.componentName}><a name={this.componentName} /><span id={this.componentName}>{"\\(" + this.doenetSvData.latex + "\\)"}</span></React.Fragment>;
    }


    // BADBADBAD: what is the best way to filter out the hidden children?
    // This approach doesn't seem like a good idea.
    children = children.filter(x => !x.props.componentInstructions.stateValues.hidden);

    if (children.length === 0) {
      return <React.Fragment key={this.componentName} />
    }

    let withCommas = children.slice(1).reduce((a, b) => [...a, ', ', b], [children[0]])

    return <React.Fragment key={this.componentName}><a name={this.componentName} />{withCommas}</React.Fragment>;
  }
}