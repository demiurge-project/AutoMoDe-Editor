import { createSVGElement } from "./graph_utils";
import { defaultEdgeParam } from "./elementmodels_default";
import GraphEditorTool from "./graphEditorTool";
import GraphEditorExporter from "./GraphEditorExporter";
import GraphEditorImporter from "./GraphEditorImporter";
import SVGElements from "./View/SVGElements.jsx";
import { h, render } from "preact";

/**
 * Object that manages tools and graph elements,
 * create the svg area and receive input from the user
 */
export default class GraphEditor {
    constructor(graphcontainer, toolscontainer) {
        // event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        // html elements
        this.graphcontainer = graphcontainer;
        this.toolscontainer = toolscontainer;
        // import / export
        this.exporter = undefined;
        this.importer = undefined;
        // svg html element
        this.svg = undefined;
        // models lists
        this.nodemodels = [];
        this.nodeparams = [];
        this.edgemodels = [];
        this.edgeparams = [];
        // graph elements
        this.elements = [];
        // tools
        this.tools = [];
        this.defaultTool = undefined;
        this.currentTool = undefined;
        this.selectedElement = undefined;
        this.createGraph();
        var that = this;
        // events
        this.svg.on("mousedown", function (e) { that.onMouseDown(e); });
        this.svg.on("mouseup", function (e) { that.onMouseUp(e); });
        this.svg.on("mouseleave", function (e) { that.onMouseLeave(e); });
        this.svg.on("mousemove", function (e) { that.onMouseMove(e); });
        //mode
        this.mode = "";
    }
    createGraph() {
        // Initialisation function
        this.graphcontainer.empty();
        this.toolscontainer.empty();
        this.svg = createSVGElement("svg", { id: "graph" });
        this.svg.on("selectstart", function (e) { e.preventDefault(); });
        this.graphcontainer.append(this.svg);
        this.defs = createSVGElement("defs", {});
        var arrowMarker = createSVGElement("marker", {
            id: "arrowhead", refX: 10, refY: 5, markerWidth: 10, markerHeight: 10,
            orient: "auto-start-reverse"
        });
        var arrowMarkerShape = createSVGElement("path", { d: "M 0 0 L 10 5 L 0 10 Z" });
        arrowMarker.append(arrowMarkerShape);
        this.defs.append(arrowMarker);
        this.svg.append(this.defs);
        this.updateGraph();
    }
    width() {
        return this.svg.width();
    }
    height() {
        return this.svg.height();
    }
    setNodeModels(data) {
        this.nodemodels = data;
    }
    setNodeParams(data) {
        this.nodeparams = data;
    }
    setEdgeModels(data) {
        this.edgemodels = data;
    }
    setEdgeParams(data) {
        this.edgeparams = data;
    }
    getNodeModels() {
        return this.nodemodels;
    }
    getNodeModelById(id) {
        var model = undefined;
        this.nodemodels.forEach(function (m) {
            if (m.id == id) {
                model = m;
            }
        });
        return model;
    }
    getNodeParams() {
        return this.nodeparams;
    }
    getNodeParamById(id) {
        var param = undefined;
        this.nodeparams.forEach(function (p) {
            if (p.nodeid == id) {
                param = p;
            }
        });
        return param;
    }
    getEdgeModelById(id) {
        var model = undefined;
        this.edgemodels.forEach(function (m) {
            if (m.id == id) {
                model = m;
            }
        });
        return model;
    }
    getEdgeModels() {
        return this.edgemodels;
    }
    getEdgeParamById(id) {
        var param = undefined;
        this.edgeparams.forEach(function (p) {
            if (p.edgeid == id) {
                param = p;
            }
        });
        if (param === undefined) {
            return defaultEdgeParam();
        }
        return param;
    }
    getEdgeParams() {
        return this.edgeparams;
    }
    addElement(element) {
        this.elements.push(element);
        element.graphEditor = this;
        this.callExporter();
    }
    removeElement(element) {
        if (this.elements.remove(element)) {
            element.onRemoval();
            if (this.selectedElement === element) {
                this.setSelectedElement(undefined);
            }
            this.callExporter();
        }
    }
    getElements() {
        return this.elements;
    }
    clearElements() {
        // Not the most efficient but we are sur that all elements
        // are deleted properly
        while (this.elements.length > 0) {
            this.removeElement(this.elements[this.elements.length - 1]);
        }
        this.updateGraph();
    }
    setSelectedElement(element) {
        this.selectedElement = element;
        this.updateParamPane();
        this.updateGraph();
    }
    getSelectedElement() {
        return this.selectedElement;
    }
    updateParamPane() {
        const paramPane = document.querySelector("param-pane");
        if (this.selectedElement !== undefined) {
            //model select
            var modelsArray = undefined;
            // get the models
            if(this.selectedElement.isNode()) {
                modelsArray = this.getNodeModels();
            } else {
                modelsArray = this.getEdgeModels();
            }
            paramPane.setModels(modelsArray, this.selectedElement.getModel());
            // parameter elements
            const element = this.selectedElement;
            const params = element.getParam();
            const catvalue = element.getParamDict()[params.categoryid];
            const category = params.categories.find(cat => cat.id === catvalue);
            paramPane.setCategories(params.categories, params.categoriesname, category);
            if (category) 
                paramPane.setParams(category.param, element.getParamDict());
            else
                paramPane.clearParams();
        } else {
            paramPane.clear();
        }
    }
    setSelectionModel(modelId) {
        const element = this.getSelectedElement();
        if (element.isNode()) {
            element.setModel(this.getNodeModelById(modelId));
            element.setParam(this.getNodeParamById(modelId));
        } else {
            element.setModel(this.getEdgeModelById(modelId));
            element.setParam(this.getEdgeParamById(modelId));
        }
        this.updateParamPane();
        this.callExporter();
    }
    setSelectionCategory(category) {
        const element = this.getSelectedElement();
        const params = this.selectedElement.getParam();
        if (params.categoryid !== undefined && category !== undefined)
            element.setParamValue(params.categoryid, category);
        this.updateParamPane();
        this.callExporter();
    }
    setSelectionParam(paramId, value) {
        const element = this.getSelectedElement();
        element.setParamValue(paramId, value);
        this.updateParamPane();
        this.callExporter();
    }
    addTool(tool, isdefault = false) {
        if (tool instanceof GraphEditorTool) {
            this.tools.push(tool);
            tool.graphEditor = this;
            var graphEditor = this;
            const element = document.createElement("p");
            element.className = "tool";
            element.id = `tool_${tool.getToolId()}`;
            element.appendChild(document.createTextNode(tool.getName()));
            element.addEventListener("click", () => {
                graphEditor.setCurrentTool(tool);
            });
            this.toolscontainer.append(element);
            if (isdefault) {
                this.setDefaultTool(tool);
            }
        }
    }
    setDefaultTool(tool) {
        if (this.tools.contains(tool)) {
            this.defaultTool = tool;
            if (this.currentTool === undefined) {
                this.setCurrentTool(tool);
            }
        }
        else {
            this.defaultTool = undefined;
        }
    }
    setCurrentTool(tool) {
        if (this.currentTool !== undefined) {
            const currentToolTag = document.querySelector(`#tool_${this.currentTool.getToolId()}`);
            currentToolTag.setAttribute("class", "tool");
            this.currentTool.onToolDeselect();
        }
        this.currentTool = tool;
        if (this.currentTool == undefined) {
            this.currentTool = this.defaultTool;
        }
        if (this.currentTool !== undefined) {
            const currentToolTag = document.querySelector(`#tool_${this.currentTool.getToolId()}`);
            currentToolTag.setAttribute("class", "tool selected");
            this.currentTool.onToolSelect();
        }
    }
    clearTools() {
        this.setCurrentTool(undefined);
        this.setDefaultTool(undefined);
        this.tools = [];
        this.toolscontainer.empty();
    }
    SVGCoordFromHTML(x, y) {
        var svgPt = this.svg[0].createSVGPoint();
        svgPt.x = x;
        svgPt.y = y;
        svgPt = svgPt.matrixTransform(this.svg[0].getScreenCTM().inverse());
        return svgPt;
    }
    onMouseDown(e, element) {
        if (this.currentTool !== undefined) {
            var pos = this.SVGCoordFromHTML(e.pageX, e.pageY);
            this.currentTool.onMouseDown(pos, element);
        }
    }
    onMouseUp(e) {
        if (this.currentTool !== undefined) {
            var pos = this.SVGCoordFromHTML(e.pageX, e.pageY);
            this.currentTool.onMouseUp(pos);
        }
    }
    onMouseLeave() {
        if (this.currentTool !== undefined) {
            this.currentTool.onMouseLeave();
        }
    }
    onMouseMove(e) {
        if (this.currentTool !== undefined) {
            var pos = this.SVGCoordFromHTML(e.pageX, e.pageY);
            this.currentTool.onMouseMove(pos);
        }
    }
    setExporter(exporter) {
        if (exporter instanceof GraphEditorExporter) {
            this.exporter = exporter;
        }
        else {
            this.exporter = undefined;
        }
    }
    callExporter() {
        this.updateGraph();
        if (this.exporter !== undefined) {
            const cmdline = document.querySelector("#cmdline");
            try {
                cmdline.value = this.exporter.export(this.getElements());
            } catch(err) {
                cmdline.value = err;
            }
        }
    }
    updateGraph() {
        render(h(SVGElements, { elements: this.elements, selectedElement: this.selectedElement, handleClick: this.onMouseDown }, null), document.querySelector("svg"));
    }

    setImporter(importer) {
        if (importer instanceof GraphEditorImporter) {
            this.importer = importer;
        }
        else {
            this.importer = undefined;
        }
    }
    callImporter() {
        if (this.importer !== undefined) {
            const cmdlineString = document.querySelector("#cmdline").value;
            this.clearElements();
            try {
                this.importer.import(this, cmdlineString);
                // reset cmdline to proper one
                this.callExporter();
            } catch (err) {
                document.querySelector("#cmdline").value = cmdlineString;
                alert(err);
            }
        }
    }
    getMode() {
        return this.mode;
    }
    setMode(mode) {
        if (mode === "fsm" || mode === "btree") {
            this.mode = mode;
        }
        else {
            throw new Error("Wrong mode selected");
        }
    }
}