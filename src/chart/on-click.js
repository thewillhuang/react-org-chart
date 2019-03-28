const d3 = require("d3");
const { collapse } = require("../utils");

module.exports = onClick;

function onClick(config = {}) {
  const { treeData, loadChildren, render, onPersonClick } = config;
  return datum => {
    console.log("onClick", {
      config,
      datum,
      lazyLoad: !datum.children && !datum._children && datum.hasChild,
      children: datum.children,
      _children: datum._children,
      hasChild: datum.hasChild
    });
    if (onPersonClick) {
      const result = onPersonClick(datum, d3.event);

      // If the `onPersonClick` handler returns `false`
      // Cancel the rest of this click handler
      if (typeof result === "boolean" && !result) {
        return;
      }
    }

    // If this person doesn't have children but `hasChild` is true,
    // attempt to load using the `loadChildren` config function
    if (
      (!datum.children && !datum._children && datum.hasChild) ||
      (Array.isArray(datum._children) &&
        !datum._children.length &&
        datum.hasChild &&
        !datum.children)
    ) {
      console.log("lazyload block triggered");
      if (!loadChildren) {
        console.error(
          "react-org-chart.onClick: loadChildren() not found in config"
        );
        return;
      }

      const result = loadChildren(datum);
      const handler = handleChildrenResult(config, datum);

      // Check if the result is a promise and render the children
      if (result.then) {
        console.log("result thened");
        return result.then(handler);
      } else {
        return handler(result);
      }
    }

    if (datum.children) {
      // Collapse the children
      config.callerNode = datum;
      config.callerMode = 0;
      datum._children = datum.children;
      datum.children = null;
    } else {
      // Expand the children
      config.callerNode = datum;
      config.callerMode = 1;
      datum.children = datum._children;
      datum._children = null;
    }

    // Pass in the clicked datum as the sourceNode which
    // tells the child nodes where to animate in from
    render({
      ...config,
      sourceNode: datum
    });
  };
}

function handleChildrenResult(config, datum) {
  const { tree, render } = config;

  return children => {
    console.log({ config, datum, children });
    const result = {
      ...datum,
      children
    };

    // Collapse the nested children
    children.forEach(collapse);

    result.children.forEach(child => {
      if (!tree.nodes(datum)[0]._children) {
        tree.nodes(datum)[0]._children = [];
      }

      child.x = datum.x;
      child.y = datum.y;
      child.x0 = datum.x0;
      child.y0 = datum.y0;

      tree.nodes(datum)[0]._children.push(child);
    });

    if (datum.children) {
      // Collapse the children
      config.callerNode = datum;
      config.callerMode = 0;
      datum._children = datum.children;
      datum.children = null;
    } else {
      // Expand the children
      config.callerNode = null;
      config.callerMode = 1;
      datum.children = datum._children;
      datum._children = null;
    }

    // Pass in the newly rendered datum as the sourceNode
    // which tells the child nodes where to animate in from
    render({
      ...config,
      sourceNode: result
    });
  };
}
