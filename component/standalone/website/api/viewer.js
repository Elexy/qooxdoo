/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2012 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (wittemann)
     * Daniel Wagner (danielwagner)

************************************************************************ */
/**
 * @lint ignoreUndefined(q, qxWeb, samples, hljs)
 */
q.ready(function() {
  // remove the warning
  q("#warning").setStyle("display", "none");

  var title = "qx.Website API Documentation";
  var customTitle = q.$$qx.core.Environment.get("apiviewer.title");
  if (customTitle) {
    title = customTitle;
  }
  else {
    var version = q.$$qx.core.Environment.get("qx.version");
    if (version) {
      title = "qx.Website " + version + " API Documentation";
    }
  }
  q("h1").setHtml(title);
  document.title = title;

  // global storage for the method index
  var data = {};

  // plugin toggle
  q("#plugintoggle").on("click", function() {
    var txt = this.getChildren("span");
    var hide = txt.getHtml() == "show";
    txt.setHtml(hide ? "hide" : "show");
    q(".plugin").setStyle("display", hide ? "block" : "none");
    q("li.plugin").setStyle("display", hide ? "list-item" : "none");
  });


  // load API data of q
  q.io.xhr("script/qxWeb.json").send().on("loadend", function(xhr) {
    if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 400) {
      var ast = JSON.parse(xhr.responseText);

      // constructor
      var construct = getByType(ast, "constructor");
      data["Core"] = {"static" : [], "member": []};
      data["Core"]["static"].push(getByType(construct, "method"));

      createData(ast);
      renderList();
      renderContent();
      loadEventNorm();
      loadPolyfills();
      onContentReady();
      attachOnScroll();
      if (location.hash) {
        location.href = location.href;
      }
      // force a scroll event so the topmost module's samples are loaded
      window.setTimeout(function() {
        var cont = document.getElementById("content");
        if (cont.scrollTop == 0) {
          cont.scrollTop = 1;
          cont.scrollTop = 0;
        }
      }, 100);

    } else {
      q("#warning").setStyle("display", "block");
      if (location.protocol.indexOf("file") == 0) {
        q("#warning em").setHtml("File protocol not supported. Please load the application via HTTP.");
      }
    }
  });


  var loadEventNorm = function() {
    var norm = q.env.get("q.eventtypes");
    if (norm) {
      norm = norm.split(",");
      norm.forEach(function(name) {
        loading++;
        q.io.xhr("script/" + name + ".json").send().on("loadend", function(xhr) {
          loading--;
          if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 400) {
            var ast = JSON.parse(xhr.responseText);
            renderEventNorm(ast);
          } else {
            console && console.warn("Event normalization '" + name + "' could not be loaded.");
          }
          onContentReady();
        });
      });
    }
  };

  var eventNormAsts = [];
  var renderEventNorm = function(ast) {
    eventNormAsts.push(ast);
    if (q.env.get("q.eventtypes").split(",").length > eventNormAsts.length) {
      return;
    }

    q("#list").append(q.create("<h1>Event Types</h1>"));
    for (var i=0; i < eventNormAsts.length; i++) {
      renderClass(eventNormAsts[i], "event.");
    }
  };


  polyfillClasses = [];
  var loadPolyfills = function() {
    if (!(q.$$qx.module.Polyfill && q.$$qx.lang.normalize) ) {
      return;
    }

    polyfillClasses = Object.keys(q.$$qx.lang.normalize);
    for (var clazz in q.$$qx.lang.normalize) {
      loading++;
      q.io.xhr("script/qx.lang.normalize." + clazz + ".json").send().on("loadend", function(xhr) {
        loading--;
        if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 400) {
          var ast = JSON.parse(xhr.responseText);
          renderPolyfill(ast);
        } else {
          console && console.warn("Polyfill '" + clazz + "' could not be loaded.");
        }
        onContentReady();
      });
    }
  };


  var polyfillAsts = [];
  var renderPolyfill = function(ast) {
    polyfillAsts.push(ast);
    if (polyfillClasses.length > polyfillAsts.length) {
      return;
    }

    q("#list").append(q.create("<h1>Polyfills</h1>"));
    for (var i=0; i < polyfillAsts.length; i++) {
      renderClass(polyfillAsts[i], "normalize.");
    }
  };


  var loadedClasses = [];
  var loadClass = function(name) {
    if (loadedClasses.indexOf(name) != -1) {
      return;
    }
    // ignore the q class
    if (name == "q") {
      return;
    }

    loadedClasses.push(name);
    loading++;
    q.io.xhr("script/" + name + ".json").send().on("loadend", function(xhr) {
      loading--;
      if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 400) {
        var ast = JSON.parse(xhr.responseText);
        renderClass(ast);
      } else {
        name = getModuleNameFromClassName(name);
        q("#content").append(
          q.create("<h1>" + name + "</h1><p style='color: #C00F00'><em>Failed to load " + name + " documentation!</em></p>")
        );
      }
      onContentReady();
    });
  };



  /**
   * DATA PROCESSING
   */
  var desc = "";
  var createData = function(ast) {
    desc = getByType(ast, "desc").attributes.text;
    attachData(getByType(ast, "methods-static"), "static");
    attachData(getByType(ast, "methods"), "member");
    // sort all methods
    for (var module in data) {
      data[module]["static"].sort(sortMethods);
      data[module]["member"].sort(sortMethods);
    }
  };


  var attachData = function(ast, type) {
    ast && ast.children.forEach(function(item) {
      // skip internal methods
      if (isInternal(item)) {
        return;
      }
      var module = getModuleName(item.attributes.sourceClass);
      if (!data[module]) {
        data[module] = {"static": [], "member": [], fileName: item.attributes.sourceClass};
      }
      data[module][type].push(item);
    });
  };


  var sortMethods = function(a, b) {
    return getMethodName(a) > getMethodName(b) ? 1 : -1;
  };


  /**
   * LIST
   * @lint ignoreUndefined(q)
   */
  var renderList = function() {
    var keys = getDataKeys();
    q("#list").append(q.create("<h1>Modules</h1>"));
    for (var i = 0; i < keys.length; i++) {
      var module = keys[i];
      renderListModule(module, data[module]);
    }
  };


  var renderListModule = function(name, data, prefix) {
    var checkMissing = q.$$qx.core.Environment.get("apiviewer.check.missingmethods");

    var list = q("#list");
    if (prefix && prefix != "event." && prefix != "normalize.") {
      list.append(q.create("<a href='#" + name + "'><h1>" + name + "</h1></a>"));
    } else {
      list.append(q.create("<a href='#" + name + "'><h2>" + name + "</h2></a>"));
    }

    var ul = q.create("<ul></ul>").appendTo(list);
    data["static"].forEach(function(ast) {
      var name = getMethodName(ast, prefix);
      var missing = false;
      if (checkMissing !== false) {
        missing = isMethodMissing(name, data.classname);
      }
      q.template.get("list-item", {
        name: name + "()",
        missing: missing,
        link: name,
        plugin: isPluginMethod(name)
      }).appendTo(ul);
    });
    data["member"].forEach(function(ast) {
      var name = getMethodName(ast, prefix);
      var missing = isMethodMissing(name, data.classname);
      q.template.get("list-item", {
        name: name + "()",
        missing: missing,
        link: name,
        plugin: isPluginMethod(name)
      }).appendTo(ul);
    });
  };


  var isMethodMissing = function(name, classname) {
    var checkMissing = q.$$qx.core.Environment.get("apiviewer.check.missingmethods");
    if (checkMissing === false) {
      return false;
    }
    name = name.split(".");
    // static methods attached to q
    if (name[0] == "q") {
      var parent = window;
      for (var i=0; i < name.length; i++) {
        if (i == name.length - 1) {
          return q.type.get(parent[name[i]]) !== "Function";
        }
        parent = parent[name[i]];
      }
    }
    // member methods of q
    if (name[0] == "") {
      return q.type.get(q.create("<div>")[name[1]]) !== "Function";
    }
    // additional qooxdoo classes
    if (classname) {
      classname = classname.split(".");
      var parent = q.$$qx;
      for (var i=1; i < classname.length; i++) {
        if (i == classname.length - 1) {
          var missing = q.type.get(parent[classname[i]][name[1]]) !== "Function";
          if (missing && parent[classname[i]].prototype) {
            missing = q.type.get(parent[classname[i]].prototype[name[1]]) !== "Function";
          }
          return missing;
        }
        parent = parent[classname[i]];
      }
    }
    return false;
  };

  /**
   * CONTENT
   */
  var renderContent = function() {
    var keys = getDataKeys();
    for (var i = 0; i < keys.length; i++) {
      renderModule(keys[i], data[keys[i]]);
    }
  };


   var renderModule = function(name, data, prefix) {
     // render module desc
     var module = q.create("<div class='module'>").appendTo("#content");
     module.append(q.create("<h1 id='" + name + "'>" + name + "</h1>"));

     if (data.superclass) {
       var newName = data.superclass.split(".");
       newName = newName[newName.length -1];
       module.append(q.create(
         "<div class='extends'><h2>Extends</h2>" +
         "<a href='#" + newName + "'>" + newName + "</a>" +
         "</div>"
       ));
     }

     if (data.fileName) {
       addClassDoc(data.fileName, module);
     } else if (data.desc) {
       module.append(parse(data.desc));
     } else if (name == "Core") {
       module.append(parse(desc));
     }

     if (data.events) {
       var eventsEl = renderEvents(data.events);
       if (eventsEl) {
         module.append(eventsEl);
       }
     }

     if (data.types) {
       var types = JSON.parse(data.types);
       for (var i=0; i < types.length; i++) {
         if (types[i] == "*") {
           types[i] = "all";
         }
       }
       var typesEl = renderTypes(types);
       module.append(typesEl);
     }

     data["static"].forEach(function(method) {
       module.append(renderMethod(method, prefix));
     });
     data["member"].forEach(function(method) {
       module.append(renderMethod(method, prefix));
     });
   };


  var renderMethod = function(method, prefix) {
    // skip internal methods
    if (isInternal(method)) {
      return;
    }
    // add the name
    var data = {name: getMethodName(method, prefix)};

    // module
    data.module = getModuleName(method.attributes.sourceClass);

    // add the description
    data.desc = parse(getByType(method, "desc").attributes.text) || "";

    // add link to overridden method
    if (data.desc == "" && method.attributes.docFrom) {
      var moduleName = getModuleNameFromClassName(method.attributes.docFrom);
      var link = q.string.firstLow(moduleName) + "." + method.attributes.name;
      data.desc = "<p>Overrides method <a href='#" + link + "'>" + link + "</a></p>";
    }

    // add the return type
    var returnType = getByType(method, "return");
    if (returnType) {
      data.returns = {desc: parse(getByType(returnType, "desc").attributes.text || "")};
      data.returns.types = [];
      getByType(returnType, "types").children.forEach(function(item) {
        var type = item.attributes.type;
        data.returns.types.push(type);
        if (IGNORE_TYPES.indexOf(type) == -1 && MDC_LINKS[type] == undefined) {
          loadClass(type);
        }
      });
    }
    data.returns.printTypes = printTypes;

    // add the parameters
    data.params = [];
    var params = getByType(method, "params");
    for (var j=0; j < params.children.length; j++) {
      var param = params.children[j];
      var paramData = {name: param.attributes.name};
      paramData.desc = parse(getByType(param, "desc").attributes.text || "");
      if (param.attributes.defaultValue) {
        paramData.defaultValue = param.attributes.defaultValue;
      }
      paramData.types = [];
      var types = getByType(param, "types");
      for (var k=0; k < types.children.length; k++) {
        var type = types.children[k];
        var typeString = type.attributes.type;
        if (type.attributes.dimensions > 0) {
          for (var i=0; i < type.attributes.dimensions; i++) {
            typeString += "[]";
          }
        }
        paramData.types.push(typeString);
      }
      paramData.printTypes = printTypes;
      data.params.push(paramData);
    }
    data.printParams = printParams;
    data.paramsExist = data.params.length > 0;

    data.plugin = isPluginMethod(data.name);

    return q.template.get("method", data);
  };


  var addClassDoc = function(name, parent) {
    if (name) {
      name = name.split("#")[0];
    } else {
      parent.append(desc);
      return;
    }
    loading++;
    q.io.xhr("script/" + name + ".json").send().on("loadend", function(xhr) {
      loading--;
      if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 400) {
        var ast = JSON.parse(xhr.responseText);
        // class doc
        var desc = getByType(ast, "desc");
        var classDoc;
        if (desc && desc.attributes && desc.attributes.text) {
          classDoc = q.create(parse(desc.attributes.text));
          classDoc.insertAfter(parent.find("h1"));
        }

        var eventsEl = renderEvents(getEvents(ast));
        if (eventsEl) {
          if (classDoc) {
            eventsEl.insertAfter(classDoc);
          } else {
            eventsEl.insertAfter(parent.find("h1"));
          }
        }
      } else {
        parent.append(
          q.create("<p style='color: #C00F00'><em>Failed to load module documentation!</em></p>")
        );
      }
      onContentReady();
    });
  };


  var getEvents = function(ast) {
    var events = getByType(ast, "events");
    var data = [];
    events.children.forEach(function(event) {
      var name = event.attributes.name;
      var desc = getByType(event, "desc").attributes.text;
      var type = getByType(event, "types").children[0].attributes.type;
      // ignore undefined as type
      type = type == "undefined" ? "" : addTypeLink(type);
      data.push({name: name, type: type, desc: desc});
    });
    return data;
  };


  var renderEvents = function(events) {
    if (events.length == 0) {
      return null;
    }
    return q.template.get("events", {events: events});
  };


  var renderTypes = function(types) {
    return q.template.get("types", {types: types});
  };


  var printParams = function() {
    var params = "";
    for (var i = 0; i < this.params.length; i++) {
      params += this.params[i].name;
      if (i < this.params.length - 1) {
        params += ", ";
      }
    }
    return params;
  };

  var printTypes = function() {
    var params = "";
    var types = this.types || this.returns.types;
    for (var i = 0; i < types.length; i++) {
      params += addTypeLink(types[i]);
      if (i < types.length - 1) {
        params += ", ";
      }
    }
    return params;
  };


  var renderClass = function(ast, prefix) {
    var module = {"member": [], "static" : []};

    getByType(ast, "methods").children.forEach(function(method) {
      // skip internal methods
      if (isInternal(method)) {
        return;
      }
      module.member.push(method);
    });

    getByType(ast, "methods-static").children.forEach(function(method) {
      // skip internal methods
      if (isInternal(method)) {
        return;
      }
      module["static"].push(method);
    });
    var name = ast.attributes.name;

    // event normalization types
    var constants = getByType(ast, "constants");
    for (var i=0; i < constants.children.length; i++) {
      var constant = constants.children[i];
      if (constant.attributes.name == "TYPES") {
        module.types = constant.attributes.value;
        break;
      }
    }

    module.desc = getByType(ast, "desc").attributes.text || "";
    module.events = getEvents(ast);
    module.classname = ast.attributes.fullName;
    module.superclass= ast.attributes.superClass;

    renderListModule(name, module, prefix || name + ".");
    renderModule(name, module, prefix || name + ".");
  };


  /**
   * PARSER
   */
   var parse = function(text) {
     if (!text) {
       return;
     }

     // @links: methods
     text = text.replace(/\{@link .*#(.*?)\}/g, "<code><a href='#.$1'>.$1()</a></code>");
     // @links: core
     text = text.replace(/\{@link q\}/g, "<a href='#Core'>Core</a>");
     // @links: modules
     var links;
     var regexp = /\{@link (.*?)\}/g;
     while ((links = regexp.exec(text)) != null) {
       var name = getModuleName(links[1]);
       text = text.replace(links[0], "<a href='#" + name + "'>" + name + "</a>");
     }
     return text;
   };


  /**
   * FINALIZE
   */
  var loading = 0;
  // no highlighting for IE < 9
  var useHighlighter = !(q.env.get("engine.name") == "mshtml" && q.env.get("browser.documentmode") < 9);
  var onContentReady = function() {
    if (loading > 0) {
      return;
    }
    // enable syntax highlighting
    if (useHighlighter) {
      q('pre').forEach(function(el) {hljs.highlightBlock(el);});
    }
  };

  // load sample code as modules are scrolled into view
  var seenModules = [];
  var loadModuleSamples = function(module) {
    var moduleName = module.getChildren("h1").getHtml();
    var sampleUri = "./samples/" + moduleName + ".js";
    q.io.script(sampleUri).send();
  };

  var attachOnScroll = function() {
    var modules = q(".module");
    var content = q("#content");
    var lastCheck;

    var onScroll = function(ev) {
      if (lastCheck && Date.now() - lastCheck < 500) {
        return;
      }
      modules.forEach(function(item, index) {
        var module = modules.eq(index);
        if (seenModules.indexOf(module[0]) == -1) {
          var pos = module.getPosition();
          var isVisible = pos.top < content.getHeight() && (pos.bottom > 0 ||
            (pos.bottom + content.getHeight()) > 0);
          if (isVisible) {
            loadModuleSamples(module);
            seenModules.push(module[0]);
          }
        }
      });
      lastCheck = Date.now();
    };

    q("#content").on("scroll", onScroll);
  };


  /**
   * HELPERS
   */
   var getDataKeys = function() {
     var keys = [];
     for (var key in data) {
       keys.push(key);
     }
     keys.sort(function(a, b) {
       if (a == "Core") {
         return -1;
       }
       if (b == "Core") {
         return 1;
       }
       return a < b ? -1 : +1;
     });
     return keys;
   };


  var getByType = function(ast, type) {
    if (ast.children) {
      for (var i=0; i < ast.children.length; i++) {
        var item = ast.children[i];
        if (item.type == type) {
          return item;
        }
      }
    }
    return {attributes: {}, children: []};
  };


  var getModuleName = function(attach) {
   if (!attach) {
     return "Core";
   }
   attach = attach.replace("qx.module.", "");
   return attach;
  };

  var getModuleNameFromClassName = function(name) {
    name = name.split(".");
    return name[name.length -1];
  };

  var isInternal = function(item) {
    return item.attributes.isInternal ||
      item.attributes.access == "private" ||
      item.attributes.access == "protected";
  };


  var isPluginMethod = function(name) {
    return name.indexOf(".$") != -1;
  };


  var getMethodName = function(item, prefix) {
    var attachData = getByType(item, "attachStatic");
    if (prefix) {
      if (!item.attributes.isStatic) {
        prefix = prefix.toLowerCase();
      }
      return prefix + item.attributes.name;
    } else if (item.attributes.name == "ctor") {
      return "q";
    } else if (item.attributes.isStatic) {
      return "q." + (attachData.attributes.targetMethod || item.attributes.name);
    } else {
      return "." + item.attributes.name;
    }
  };


  var addTypeLink = function(type) {
    // special case for pseudo typed arrays
    if (type.indexOf("[]") != -1) {
      return "<a target='_blank' href='" + MDC_LINKS["Array"] + "'>" + type + "</a>";
    }
    if (type == "qxWeb") {
      return "<a href='#Core'>q</a>";
    } else if (MDC_LINKS[type]) {
      return "<a target='_blank' href='" + MDC_LINKS[type] + "'>" + type + "</a>";
    } else if (IGNORE_TYPES.indexOf(type) == -1) {
      var name = type.split(".");
      name = name[name.length -1];
      return "<a href='#" + name + "'>" + name + "</a>";
    }
    return type;
  };

  var IGNORE_TYPES = ["qxWeb", "var", "null"];

  var MDC_LINKS = {
    "Event" : "https://developer.mozilla.org/en/DOM/event",
    "Window" : "https://developer.mozilla.org/en/DOM/window",
    "Document" : "https://developer.mozilla.org/en/DOM/document",
    "Element" : "https://developer.mozilla.org/en/DOM/element",
    "Node" : "https://developer.mozilla.org/en/DOM/node",
    "Date" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date",
    "Function" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function",
    "Array" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array",
    "Object" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object",
    "Map" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object",
    "RegExp" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/RegExp",
    "Error" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error",
    "Number" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Number",
    "Boolean" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Boolean",
    "String" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String",
    "undefined" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/undefined",
    "arguments" : "https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/arguments",
    "Font" : "https://developer.mozilla.org/en/CSS/font",
    "Color" : "https://developer.mozilla.org/en/CSS/color"
  };

  // mobile support
  if (q.env.get("device.type") != "desktop") {
    q("#list").setStyles({position: "absolute", bottom: "auto"});
    q("#content").setStyles({position: "absolute", bottom: "auto"});
    q("#header-wrapper").setStyle("position", "absolute");
  }

  var appendSample = function(sample, header) {
    if (header[0]) {
      if (useHighlighter) {
        var sampleEl;
        var precedingSamples = header.getSiblings("pre");
        if (precedingSamples.length > 0) {
          sampleEl = q.create("<pre class='javascript'>").insertAfter(precedingSamples.eq(precedingSamples.length - 1));
        }
        else {
          sampleEl = q.create("<pre class='javascript'>").insertAfter(header);
        }
        hljs.highlightBlock(sampleEl.setHtml(sample)[0]);
      }
    } else {
      console && console.warn("Sample could not be attached for '", method, "'.");
    }
  };

  /**
   * Adds sample code to a method's documentation.
   *
   * @param methodName {String} Name of the method, e.g. ".before" or "q.create"
   * @param sample {Function|String} Sample code
   */
  window.addSample = function(methodName, sample) {
    // Find the doc element for the method
    var method = q("#" + methodName.replace(/\./g, "\\.").replace(/\$/g, "\\$"));
    if (method.length === 0) {
      console && console.warn("Unable to add sample: No doc element found for method", methodName);
      return;
    }

    // Find existing "Examples" heading
    var headerElement = null;
    var subHeaders = method.getChildren("h4");
    for (var i=0, l=subHeaders.length; i<l; i++) {
      var header = subHeaders.eq(i);
      if (header.getHtml() == "Examples") {
        headerElement = header;
        break;
      }
    }
    // No heading found, create one
    if (!headerElement) {
      headerElement = q.create("<h4>Examples</h4>");
      method.append(headerElement);
    }

    if (typeof sample == "function") {
      sample = sample.toString();
      sample = sample.substring(sample.indexOf("\n") + 1, sample.length - 2);
    }

    appendSample(sample, headerElement);
  };
});
